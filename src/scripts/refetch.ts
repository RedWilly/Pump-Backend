//to run this script, run the following command in the terminal:
//npx ts-node scripts/refetch.ts
import { Address, ContractFunctionExecutionError } from 'viem';
import { client } from '../blockchain/client';
import { PrismaClient } from '@prisma/client';
import { createTransaction } from '../services/transactionService';
import { getTokenByAddress } from '../services/tokenService';
import { createToken } from '../services/tokenService';
import { ABI } from '../blockchain/abi';
import { createLiquidityEvent } from '../services/liquidityService';

const prisma = new PrismaClient();

const CONTRACT_CONFIG = {
  '0x97b962Ab399beBF439a4a303d9754e79d6925EDa': 6040951,
  '0x9272ddC213739Dad3B499C2C1245ff4A2cDe313A': 7884140,
  '0xc4d1a89d5BCC5A13c59fe2f3820E20B4f5d3095e': 8101361
};

const END_BLOCK = 8101361;
const CHUNK_SIZE = 1000;
const MAX_RETRIES = 3;

async function refetchEvents() {
  for (const [contractAddress, startBlock] of Object.entries(CONTRACT_CONFIG)) {
    console.log(`\nStarting processing for contract ${contractAddress}`);
    console.log(`From block ${startBlock} to ${END_BLOCK}`);

    let currentBlock = startBlock;
    
    while (currentBlock < END_BLOCK) {
      const toBlock = Math.min(currentBlock + CHUNK_SIZE, END_BLOCK);
      
      console.log(`\nProcessing chunk: ${currentBlock} to ${toBlock}`);

      try {
        // Process each event type sequentially with retries
        await processEventsWithRetry(async () => {
          await processTokenCreatedEvents(currentBlock, toBlock, contractAddress as Address);
        }, 'TokenCreated');

        await processEventsWithRetry(async () => {
          await processTokensBoughtEvents(currentBlock, toBlock, contractAddress as Address);
        }, 'TokensBought');

        await processEventsWithRetry(async () => {
          await processTokensSoldEvents(currentBlock, toBlock, contractAddress as Address);
        }, 'TokensSold');

        // Add Liquidity Events processing
        await processEventsWithRetry(async () => {
          await processLiquidityAddedEvents(currentBlock, toBlock, contractAddress as Address);
        }, 'LiquidityAdded');
        
        currentBlock = toBlock + 1;
      } catch (error) {
        console.error(`Fatal error processing chunk ${currentBlock}-${toBlock}:`, error);
        process.exit(1);
      }
    }

    console.log(`Completed processing for contract ${contractAddress}`);
  }

  console.log('\nFinished processing all events for all contracts.');
}

async function processEventsWithRetry(
  processFn: () => Promise<void>,
  eventType: string,
  retries = MAX_RETRIES
): Promise<void> {
  try {
    await processFn();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying ${eventType} processing. Attempts remaining: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
      return processEventsWithRetry(processFn, eventType, retries - 1);
    }
    throw error;
  }
}

async function processTokenCreatedEvents(fromBlock: number, toBlock: number, contractAddress: Address) {
  console.log(`Fetching TokenCreated events for ${contractAddress} from ${fromBlock} to ${toBlock}`);
  const createLogs = await client.getLogs({
    address: contractAddress,
    event: ABI[0],
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock)
  });

  console.log(`Found ${createLogs.length} TokenCreated events`);

  for (const log of createLogs) {
    await processEventWithTransaction(async () => {
      const block = await client.getBlock({
        blockNumber: log.blockNumber
      });
      
      const timestamp = new Date(Number(block.timestamp) * 1000);

      await handleTokenCreated({
        ...log.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        contractAddress,
        timestamp
      });
    }, `TokenCreated ${log.transactionHash}`);
  }
}

async function processTokensBoughtEvents(fromBlock: number, toBlock: number, contractAddress: Address) {
  console.log(`Fetching TokensBought events for ${contractAddress} from ${fromBlock} to ${toBlock}`);
  const buyLogs = await client.getLogs({
    address: contractAddress,
    event: ABI[1],
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock)
  });

  console.log(`Found ${buyLogs.length} TokensBought events`);

  for (const log of buyLogs) {
    await processEventWithTransaction(async () => {
      const block = await client.getBlock({
        blockNumber: log.blockNumber
      });
      
      const timestamp = new Date(Number(block.timestamp) * 1000);

      await handleTokensBought({
        ...log.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        contractAddress,
        timestamp
      });
    }, `TokensBought ${log.transactionHash}`);
  }
}

async function processTokensSoldEvents(fromBlock: number, toBlock: number, contractAddress: Address) {
  console.log(`Fetching TokensSold events for ${contractAddress} from ${fromBlock} to ${toBlock}`);
  const sellLogs = await client.getLogs({
    address: contractAddress,
    event: ABI[2],
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock)
  });

  console.log(`Found ${sellLogs.length} TokensSold events`);

  for (const log of sellLogs) {
    await processEventWithTransaction(async () => {
      const block = await client.getBlock({
        blockNumber: log.blockNumber
      });
      
      const timestamp = new Date(Number(block.timestamp) * 1000);

      await handleTokensSold({
        ...log.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        contractAddress,
        timestamp
      });
    }, `TokensSold ${log.transactionHash}`);
  }
}

async function processLiquidityAddedEvents(fromBlock: number, toBlock: number, contractAddress: Address) {
  console.log(`Fetching LiquidityAdded events for ${contractAddress} from ${fromBlock} to ${toBlock}`);
  const liquidityLogs = await client.getLogs({
    address: contractAddress,
    event: ABI[3], // LiquidityAdded event
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock)
  });

  console.log(`Found ${liquidityLogs.length} LiquidityAdded events`);

  for (const log of liquidityLogs) {
    await processEventWithTransaction(async () => {
      const block = await client.getBlock({
        blockNumber: log.blockNumber
      });
      
      const timestamp = new Date(Number(block.timestamp) * 1000);

      await handleLiquidityAdded({
        ...log.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        contractAddress,
        timestamp
      });
    }, `LiquidityAdded ${log.transactionHash}`);
  }
}

async function processEventWithTransaction(
  processFn: () => Promise<void>,
  eventIdentifier: string
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await processFn();
    }, {
      maxWait: 20000, // 20 seconds max wait
      timeout: 30000  // 30 seconds timeout
    });
    console.log(`Successfully processed and saved ${eventIdentifier}`);
  } catch (error) {
    console.error(`Failed to process ${eventIdentifier}:`, error);
    throw error; // Rethrow to trigger retry mechanism
  }
}

async function handleTokenCreated(data: any) {
  const { tokenAddress, creator, name, symbol, timestamp } = data;
  try {
    const token = await createToken({
      address: tokenAddress,
      creatorAddress: creator,
      name,
      symbol,
      timestamp
    });
    console.log('Processed TokenCreated:', token);
  } catch (error) {
    console.error('Error processing TokenCreated event:', error);
    console.log('Event data:', { tokenAddress, creator, name, symbol });
  }
}

async function handleTokensBought(data: any) {
  const { token: tokenAddress, buyer, ethAmount, tokenAmount, blockNumber, transactionHash, contractAddress, timestamp } = data;
  try {
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const tokenPrice = await calculateTokenPrice(tokenAddress, BigInt(blockNumber), contractAddress);
      const transaction = await createTransaction({
        tokenId: token.id,
        type: 'buy',
        senderAddress: buyer,
        recipientAddress: tokenAddress,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        tokenPrice: tokenPrice.toString(),
        txHash: transactionHash,
        timestamp
      });
      console.log('Processed TokensBought:', transaction);
    } else {
      console.log('Token not found for address:', tokenAddress);
    }
  } catch (error) {
    console.error('Error handling tokens bought:', error);
  }
}

async function handleTokensSold(data: any) {
  const { token: tokenAddress, seller, tokenAmount, ethAmount, blockNumber, transactionHash, contractAddress, timestamp } = data;
  try {
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const tokenPrice = await calculateTokenPrice(tokenAddress, BigInt(blockNumber), contractAddress);
      const transaction = await createTransaction({
        tokenId: token.id,
        type: 'sell',
        senderAddress: seller,
        recipientAddress: tokenAddress,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        tokenPrice: tokenPrice.toString(),
        txHash: transactionHash,
        timestamp
      });
      console.log('Processed TokensSold:', transaction);
    } else {
      console.log('Token not found for address:', tokenAddress);
    }
  } catch (error) {
    console.error('Error handling tokens sold:', error);
  }
}

async function handleLiquidityAdded(data: any) {
  const { token: tokenAddress, ethAmount, tokenAmount, transactionHash, timestamp } = data;
  try {
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const liquidityEvent = await createLiquidityEvent({
        tokenId: token.id,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        txHash: transactionHash,
        timestamp
      });
      console.log('Processed LiquidityAdded:', liquidityEvent);
    } else {
      console.log('Token not found for liquidity event:', tokenAddress);
    }
  } catch (error) {
    console.error('Error handling liquidity added:', error);
    console.log('Event data:', { tokenAddress, ethAmount, tokenAmount, transactionHash });
    throw error; // Rethrow to trigger retry mechanism
  }
}

async function calculateTokenPrice(tokenAddress: Address, blockNumber: bigint, contractAddress: string): Promise<string> {
  try {
    const price = await client.readContract({
      address: contractAddress as Address,
      abi: ABI,
      functionName: 'getCurrentTokenPrice',
      args: [tokenAddress],
      blockNumber: blockNumber
    });
    return price.toString();
  } catch (error) {
    if (error instanceof ContractFunctionExecutionError) {
      console.warn('Contract call reverted, setting price to 0:', error.message);
      return '0';
    } else {
      console.error('Error fetching token price:', error);
      throw new Error('Failed to fetch token price');
    }
  }
}

// Add process handling for graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing database connection...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing database connection...');
  await prisma.$disconnect();
  process.exit(0);
});

refetchEvents()
  .catch((error) => {
    console.error('Error refetching events:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed');
  });