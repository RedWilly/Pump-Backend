import { createPublicClient, http, Address, ContractFunctionExecutionError } from 'viem';
import { mainnet } from 'viem/chains';
import { prisma, broadcastUpdate } from '../app';
import { createToken, getTokenByAddress, updateToken } from '../services/tokenService';
import { createTransaction } from '../services/transactionService';
import { createLiquidityEvent } from '../services/liquidityService';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';
import { FileQueue } from './fileQueue';
import { sendTokenCreatedNotification, sendTokenBuyNotification, sendTokenSellNotification } from '../telegramBot';

const CONTRACT_ADDRESS = '0xcontract_address_here'; // replace 0xcontract_address_here with the contract address

const fileQueue = new FileQueue();

export async function setupBlockchainListeners() {
  const client = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  client.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    eventName: TOKEN_CREATED_EVENT,
    onLogs: (logs) => handleEvents(TOKEN_CREATED_EVENT, logs)
  });

  client.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    eventName: TOKENS_BOUGHT_EVENT,
    onLogs: (logs) => handleEvents(TOKENS_BOUGHT_EVENT, logs)
  });

  client.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    eventName: TOKENS_SOLD_EVENT,
    onLogs: (logs) => handleEvents(TOKENS_SOLD_EVENT, logs)
  });

  client.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    eventName: LIQUIDITY_ADDED_EVENT,
    onLogs: (logs) => handleEvents(LIQUIDITY_ADDED_EVENT, logs)
  });

  // Start processing the queue
  setInterval(() => fileQueue.processQueue(processEvent), 1000);
}

async function handleEvents(eventType: string, logs: any) {
  for (const log of logs) {
    await fileQueue.enqueue(eventType, { ...log.args, blockNumber: log.blockNumber, transactionHash: log.transactionHash });
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

    // // Delay the broadcast by 5 seconds
    // setTimeout(() => {
    //   broadcastUpdate('tokenCreated', broadcastData);
    // }, 5000);
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
  const { token: tokenAddress, buyer, ethAmount, tokenAmount, blockNumber, transactionHash } = data;
  try {
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const tokenPrice = await calculateTokenPrice(tokenAddress, BigInt(blockNumber));
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
  const { token: tokenAddress, seller, tokenAmount, ethAmount, blockNumber, transactionHash } = data;
  try {
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const tokenPrice = await calculateTokenPrice(tokenAddress, BigInt(blockNumber));
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
    }
  } catch (error) {
    console.error('Error handling liquidity added:', error);
  }
}

async function calculateTokenPrice(tokenAddress: Address, blockNumber: bigint): Promise<string> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  try {
    const price = await client.readContract({
      address: CONTRACT_ADDRESS,
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