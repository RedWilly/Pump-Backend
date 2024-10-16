import { createPublicClient, http, Address, ContractFunctionExecutionError } from 'viem';
import { shibarium } from 'viem/chains';
import { prisma, broadcastUpdate } from '../app';
import { createToken, getTokenByAddress, updateToken } from '../services/tokenService';
import { createTransaction } from '../services/transactionService';
import { createLiquidityEvent } from '../services/liquidityService';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';
import { FileQueue } from './fileQueue';
import { sendTokenCreatedNotification, sendTokenBuyNotification, sendTokenSellNotification, sendLiquidityAddedNotification } from '../telegramBot';

const CONTRACT_ADDRESSES = [
  '0x97b962Ab399beBF439a4a303d9754e79d6925EDa',
  '0xbe974ec5d005a8a43dcd6b9a0e55d8dfbe17a043'
];

const fileQueue = new FileQueue();

export async function setupBlockchainListeners() {
  const client = createPublicClient({
    chain: shibarium,
    transport: http()
  });

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
    await fileQueue.enqueue(eventType, { 
      ...log.args, 
      blockNumber: log.blockNumber, 
      transactionHash: log.transactionHash,
      contractAddress: contractAddress
    });
  }
}

async function processEvent(type: string, data: any): Promise<void> {
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

async function handleTokenCreated(data: any) {
  const { tokenAddress, creator, name, symbol } = data;
  try {
    const token = await createToken({
      address: tokenAddress,
      creatorAddress: creator,
      name,
      symbol
    });

    // Prepare broadcast data
    const broadcastData = {
      id: token.id,
      type: 'creation',
      creatorAddress: creator,
      tokenAddress: tokenAddress,
      name: token.name,
      symbol: token.symbol,
      logo: token.logo || '', //logo might be empty since it will need to be updated first/call first
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
  const { token: tokenAddress, buyer, ethAmount, tokenAmount, blockNumber, transactionHash, contractAddress } = data;
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
        txHash: transactionHash
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

    }
  } catch (error) {
    console.error('Error handling tokens bought:', error);
  }
}

async function handleTokensSold(data: any) {
  const { token: tokenAddress, seller, tokenAmount, ethAmount, blockNumber, transactionHash, contractAddress } = data;
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
        txHash: transactionHash
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
    }
  } catch (error) {
    console.error('Error handling tokens sold:', error);
  }
}

async function handleLiquidityAdded(data: any) {
  const { token: tokenAddress, ethAmount, tokenAmount, transactionHash } = data;
  try {
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const liquidityEvent = await createLiquidityEvent({
        tokenId: token.id,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        txHash: transactionHash
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
  const client = createPublicClient({
    chain: shibarium,
    transport: http()
  });

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
