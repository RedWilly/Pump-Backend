import { client } from './client';
import { Address, Log, AbiEvent } from 'viem';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';
import { fileQueue } from './fileQueue';
import { prisma } from '../app';

const CONTRACT_ADDRESSES = [
  '0x97b962Ab399beBF439a4a303d9754e79d6925EDa',
  '0x9272ddC213739Dad3B499C2C1245ff4A2cDe313A'
];

const BLOCKS_TO_SCAN = 2000;
const CHUNK_SIZE = 100; // Size of each chunk when splitting
const SCAN_INTERVAL = 30 * 60 * 1000; // 30 minutes

export class BlockScanner {
  private lastScannedBlock: bigint = BigInt(0);
  private isScanning: boolean = false;

  async start() {
    await this.performBlockScan();
    setInterval(async () => {
      await this.performBlockScan();
    }, SCAN_INTERVAL);
  }

  private async performBlockScan() {
    if (this.isScanning) {
      console.log('Block scan already in progress, skipping...');
      return;
    }

    this.isScanning = true;
    try {
      const latestBlock = await client.getBlockNumber();
      const fromBlock = this.lastScannedBlock || (latestBlock - BigInt(BLOCKS_TO_SCAN));
      const toBlock = latestBlock;

      console.log(`Attempting to scan blocks from ${fromBlock} to ${toBlock}`);

      try {
        // First try scanning all blocks at once
        await this.scanBlockRange(fromBlock, toBlock);
        this.lastScannedBlock = toBlock;
      } catch (error) {
        console.log('Full range scan failed, switching to chunk processing...');
        // If full scan fails, process in chunks
        await this.processBlocksInChunks(fromBlock, toBlock);
      }
    } catch (error) {
      console.error('Error during block scan:', error);
    } finally {
      this.isScanning = false;
    }
  }

  private async processBlocksInChunks(fromBlock: bigint, toBlock: bigint) {
    const totalBlocks = toBlock - fromBlock;
    const numberOfChunks = Math.ceil(Number(totalBlocks) / CHUNK_SIZE);
    
    console.log(`Processing ${totalBlocks} blocks in ${numberOfChunks} chunks of ${CHUNK_SIZE} blocks each`);

    for (let i = 0; i < numberOfChunks; i++) {
      const chunkStart = fromBlock + BigInt(i * CHUNK_SIZE);
      const chunkEnd = BigInt(Math.min(
        Number(chunkStart) + CHUNK_SIZE - 1,
        Number(toBlock)
      ));

      console.log(`Processing chunk ${i + 1}/${numberOfChunks}: blocks ${chunkStart} to ${chunkEnd}`);

      try {
        await this.scanBlockRange(chunkStart, chunkEnd);
        this.lastScannedBlock = chunkEnd;
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        // Continue with next chunk even if current one fails
        continue;
      }
    }
  }

  private async scanBlockRange(fromBlock: bigint, toBlock: bigint) {
    const eventTypes = [
      { name: TOKEN_CREATED_EVENT, handler: this.handleTokenCreated.bind(this) },
      { name: TOKENS_BOUGHT_EVENT, handler: this.handleTokenBought.bind(this) },
      { name: TOKENS_SOLD_EVENT, handler: this.handleTokenSold.bind(this) },
      { name: LIQUIDITY_ADDED_EVENT, handler: this.handleLiquidity.bind(this) }
    ];

    for (const contractAddress of CONTRACT_ADDRESSES) {
      for (const { name: eventName, handler } of eventTypes) {
        try {
          const eventAbi = ABI.find(e => e.type === 'event' && e.name === eventName) as AbiEvent;
          if (!eventAbi) continue;

          const logs = await client.getLogs({
            address: contractAddress as Address,
            event: eventAbi,
            fromBlock,
            toBlock
          });

          for (const log of logs) {
            const block = await client.getBlock({
              blockNumber: log.blockNumber
            });
            
            if (!block.timestamp) continue;

            const timestamp = new Date(Number(block.timestamp) * 1000);
            
            await handler({
              ...(log as any).args,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              contractAddress: contractAddress,
              timestamp
            });
          }
        } catch (error) {
          console.error(`Error scanning for ${eventName} events:`, error);
          throw error; // Rethrow to trigger chunk processing
        }
      }
    }
  }

  private async handleTokenCreated(data: any) {
    try {
      // Check if token already exists
      const existingToken = await prisma.token.findUnique({
        where: { address: data.tokenAddress }
      });

      if (!existingToken) {
        // Only enqueue if token doesn't exist
        await fileQueue.enqueue(TOKEN_CREATED_EVENT, {
          ...data,
          type: 'creation'
        });
        console.log(`New token found and queued: ${data.tokenAddress}`);
      } else {
        console.log(`Token ${data.tokenAddress} already exists, skipping`);
      }
    } catch (error) {
      console.error('Error handling token creation:', error);
    }
  }

  private async handleTokenBought(data: any) {
    try {
      // Check if transaction already exists
      const existingTx = await prisma.transaction.findUnique({
        where: { txHash: data.transactionHash }
      });

      if (!existingTx) {
        // Only enqueue if transaction doesn't exist
        await fileQueue.enqueue(TOKENS_BOUGHT_EVENT, {
          ...data,
          type: 'buy'
        });
        console.log(`New buy transaction queued: ${data.transactionHash}`);
      } else {
        console.log(`Transaction ${data.transactionHash} already exists, skipping`);
      }
    } catch (error) {
      console.error('Error handling token buy:', error);
    }
  }

  private async handleTokenSold(data: any) {
    try {
      // Check if transaction already exists
      const existingTx = await prisma.transaction.findUnique({
        where: { txHash: data.transactionHash }
      });

      if (!existingTx) {
        // Only enqueue if transaction doesn't exist
        await fileQueue.enqueue(TOKENS_SOLD_EVENT, {
          ...data,
          type: 'sell'
        });
        console.log(`New sell transaction queued: ${data.transactionHash}`);
      } else {
        console.log(`Transaction ${data.transactionHash} already exists, skipping`);
      }
    } catch (error) {
      console.error('Error handling token sell:', error);
    }
  }

  private async handleLiquidity(data: any) {
    try {
      // Check if liquidity event already exists
      const existingEvent = await prisma.liquidityEvent.findUnique({
        where: { txHash: data.transactionHash }
      });

      if (!existingEvent) {
        // Only enqueue if event doesn't exist
        await fileQueue.enqueue(LIQUIDITY_ADDED_EVENT, {
          ...data,
          type: 'liquidity'
        });
        console.log(`New liquidity event queued: ${data.transactionHash}`);
      } else {
        console.log(`Liquidity event ${data.transactionHash} already exists, skipping`);
      }
    } catch (error) {
      console.error('Error handling liquidity event:', error);
    }
  }
} 