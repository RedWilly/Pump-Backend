import { Address, ContractFunctionExecutionError } from 'viem';
import { client } from './client';
import { prisma, broadcastUpdate } from '../app';
import { createToken, getTokenByAddress } from '../services/tokenService';
import { createTransaction } from '../services/transactionService';
import { createLiquidityEvent } from '../services/liquidityService';
import { trackVolume } from '../services/volumeService';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';
import { fileQueue } from './fileQueue';
import { sendTokenCreatedNotification, sendTokenBuyNotification, sendTokenSellNotification, sendLiquidityAddedNotification } from '../telegramBot';

const CONTRACT_ADDRESSES = [
  '0x97b962Ab399beBF439a4a303d9754e79d6925EDa',
  '0x9272ddC213739Dad3B499C2C1245ff4A2cDe313A',
  '0xc4d1a89d5BCC5A13c59fe2f3820E20B4f5d3095e'
];

// Add shared event type definitions
export interface BaseEventData {
  blockNumber: bigint;
  transactionHash: string;
  contractAddress: string;
  timestamp: Date;
  type: 'creation' | 'buy' | 'sell' | 'liquidity';
}

export interface TokenCreatedData extends BaseEventData {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
}

// Add event tracking
const processedBlocks = new Set<string>();

function isBlockProcessed(blockNumber: bigint, eventType: string): boolean {
  const key = `${blockNumber.toString()}-${eventType}`;
  return processedBlocks.has(key);
}

function markBlockProcessed(blockNumber: bigint, eventType: string): void {
  const key = `${blockNumber.toString()}-${eventType}`;
  processedBlocks.add(key);
}

export async function setupBlockchainListeners() {
  const eventNames = [TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT] as const;

  CONTRACT_ADDRESSES.forEach(contractAddress => {
    eventNames.forEach(eventName => {
      client.watchContractEvent({
        address: contractAddress as Address,
        abi: ABI,
        eventName: eventName,
        onLogs: (logs) => handleEvents(eventName, logs, contractAddress)
      });
    });
  });

  // Start processing the queue
  setInterval(() => fileQueue.processQueue(processEvent), 1000);
}

async function handleEvents(eventType: string, logs: any, contractAddress: string) {
  for (const log of logs) {
    // Check if we've already processed this block for this event type
    if (isBlockProcessed(log.blockNumber, eventType)) {
      console.log(`Block ${log.blockNumber} already processed for ${eventType}, skipping...`);
      continue;
    }

    // Get block timestamp for real-time events too
    const block = await client.getBlock({
      blockNumber: log.blockNumber
    });
    
    const timestamp = block.timestamp ? new Date(Number(block.timestamp) * 1000) : new Date();

    // Add type based on eventType
    const type = eventType === TOKENS_BOUGHT_EVENT ? 'buy' :
                 eventType === TOKENS_SOLD_EVENT ? 'sell' :
                 eventType === TOKEN_CREATED_EVENT ? 'creation' :
                 eventType === LIQUIDITY_ADDED_EVENT ? 'liquidity' : undefined;

    try {
      await fileQueue.enqueue(eventType, { 
        ...log.args, 
        blockNumber: log.blockNumber, 
        transactionHash: log.transactionHash,
        contractAddress: contractAddress,
        timestamp,
        type
      });

      // Mark this block as processed for this event type
      markBlockProcessed(log.blockNumber, eventType);
    } catch (error) {
      console.error(`Error processing block ${log.blockNumber} for ${eventType}:`, error);
    }
  }
}

function validateEvent(type: string, data: any): boolean {
  const processedEvents = new Set<string>();
  const eventKey = `${data.transactionHash}-${type}`;
  
  if (processedEvents.has(eventKey)) {
    console.log('Event already processed:', eventKey);
    return false;
  }

  // Add validation based on event type
  switch (type) {
    case TOKEN_CREATED_EVENT:
      return !!(data.tokenAddress && data.creator && data.name && data.symbol);
    case TOKENS_BOUGHT_EVENT:
    case TOKENS_SOLD_EVENT:
      return !!(data.token && data.ethAmount && data.tokenAmount);
    case LIQUIDITY_ADDED_EVENT:
      return !!(data.token && data.ethAmount && data.tokenAmount);
    default:
      return false;
  }
}

async function processEvent(type: string, data: any): Promise<void> {
  if (!validateEvent(type, data)) {
    console.error('Invalid event data:', { type, data });
    return;
  }
  switch (type) {
    case TOKEN_CREATED_EVENT:
      await handleTokenCreated(data);
      break;
    case TOKENS_BOUGHT_EVENT:
      await handleTokensBought(data);
      break;
    case TOKENS_SOLD_EVENT:
      await handleTokensSold(data);
      break;
    case LIQUIDITY_ADDED_EVENT:
      await handleLiquidityAdded(data);
      break;
  }
}

async function processEventWithRetry(type: string, data: any, retries = 3): Promise<void> {
  try {
    await processEvent(type, data);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying event processing. Attempts remaining: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return processEventWithRetry(type, data, retries - 1);
    }
    console.error('Event processing failed after retries:', error);
    await fileQueue.addToDeadLetterQueue(type, data);
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

    // Prepare broadcast data
    const broadcastData = {
      id: token.id,
      type: 'creation',
      creatorAddress: creator,
      tokenAddress: tokenAddress,
      name: token.name,
      symbol: token.symbol,
      logo: token.logo || '',
    };

    broadcastUpdate('tokenCreated', broadcastData);

    // Send Telegram notification
    try {
      await sendTokenCreatedNotification({
        tokenAddress,
        creator,
        name,
        symbol
      });
    } catch (telegramError) {
      console.error('Error sending Telegram notification for token creation:', telegramError);
    }

    console.log(`Token created and saved to DB: ${token.name}. Broadcast scheduled in 5 seconds.`);
  } catch (error) {
    console.error('Error handling token creation:', error);
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

      // Flattened broadcast data
      const broadcastData = {
        ...transaction,
        name: token.name,
        symbol: token.symbol,
        logo: token.logo
      };
      
      broadcastUpdate('tokensBought', broadcastData);

      // Send Telegram notification
      try {
        await sendTokenBuyNotification({
          tokenAddress,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          ethAmount: ethAmount.toString(),
          tokenAmount: tokenAmount.toString()
        });
      } catch (telegramError) {
        console.error('Error sending Telegram notification for token buy:', telegramError);
      }

      await trackVolume(parseFloat(ethAmount.toString()), 'BUY');
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

      // Flattened broadcast data
      const broadcastData = {
        ...transaction,
        name: token.name,
        symbol: token.symbol,
        logo: token.logo
      };
      
      broadcastUpdate('tokensSold', broadcastData);

      // Send Telegram notification
      try {
        await sendTokenSellNotification({
          tokenAddress,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          ethAmount: ethAmount.toString(),
          tokenAmount: tokenAmount.toString()
        });
      } catch (telegramError) {
        console.error('Error sending Telegram notification for token sell:', telegramError);
      }

      await trackVolume(parseFloat(ethAmount.toString()), 'SELL');
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
      broadcastUpdate('liquidityAdded', liquidityEvent);

      // Send Telegram notification
      try {
        await sendLiquidityAddedNotification({
          tokenAddress,
          tokenName: token.name,
          tokenSymbol: token.symbol,
        });
      } catch (telegramError) {
        console.error('Error sending Telegram notification for token sell:', telegramError);
      }
    }
  } catch (error) {
    console.error('Error handling liquidity added:', error);
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

export async function getEventProcessingStatus() {
  const queueStats = await fileQueue.getQueueStats();
  
  return {
    processedBlocks: processedBlocks.size,
    lastProcessedBlock: Array.from(processedBlocks).pop(),
    queueStats: {
      pending: queueStats.main,
      errors: queueStats.error,
      deadLetter: queueStats.dlq
    }
  };
}
