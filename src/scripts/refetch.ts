//to run this script, run the following command in the terminal:
//npx ts-node scripts/refetch.ts
import { createPublicClient, http, Address, ContractFunctionExecutionError } from 'viem';
import { shibarium } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import { createTransaction } from '../services/transactionService';
import { getTokenByAddress } from '../services/tokenService';
import { createToken } from '../services/tokenService';
import { ABI } from '../blockchain/abi';

const prisma = new PrismaClient();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address; //0x97b962Ab399beBF439a4a303d9754e79d6925EDa

const client = createPublicClient({
  chain: shibarium,
  transport: http()
});

async function refetchEvents() {
  // Specify the block number you want to check/if we missed any events in the main loop
  const blockNumber = 12968905;  

  console.log('Refetching events from block:', blockNumber);

  // Process events one at a time to maintain order
  await processTokenCreatedEvents(blockNumber);
  await processTokensBoughtEvents(blockNumber);
  await processTokensSoldEvents(blockNumber);

  console.log('Finished processing all events.');
}

async function processTokenCreatedEvents(blockNumber: number) {
  console.log('Refetching TokenCreated events...');
  const createLogs = await client.getLogs({
    address: CONTRACT_ADDRESS,
    event: ABI[0],
    fromBlock: BigInt(blockNumber),
    toBlock: BigInt(blockNumber)
  });

  for (const log of createLogs) {
    await handleTokenCreated({
      ...log.args,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      contractAddress: CONTRACT_ADDRESS
    });
  }
}

async function processTokensBoughtEvents(blockNumber: number) {
  console.log('Refetching TokensBought events...');
  const buyLogs = await client.getLogs({
    address: CONTRACT_ADDRESS,
    event: ABI[1],
    fromBlock: BigInt(blockNumber),
    toBlock: BigInt(blockNumber)
  });

  for (const log of buyLogs) {
    await handleTokensBought({
      ...log.args,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      contractAddress: CONTRACT_ADDRESS
    });
  }
}

async function processTokensSoldEvents(blockNumber: number) {
  console.log('Refetching TokensSold events...');
  const sellLogs = await client.getLogs({
    address: CONTRACT_ADDRESS,
    event: ABI[2],
    fromBlock: BigInt(blockNumber),
    toBlock: BigInt(blockNumber)
  });

  for (const log of sellLogs) {
    await handleTokensSold({
      ...log.args,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      contractAddress: CONTRACT_ADDRESS
    });
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
    console.log('Processed TokenCreated:', token);
  } catch (error) {
    console.error('Error processing TokenCreated event:', error);
    console.log('Event data:', { tokenAddress, creator, name, symbol });
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
      console.log('Processed TokensBought:', transaction);
    } else {
      console.log('Token not found for address:', tokenAddress);
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
      console.log('Processed TokensSold:', transaction);
    } else {
      console.log('Token not found for address:', tokenAddress);
    }
  } catch (error) {
    console.error('Error handling tokens sold:', error);
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

refetchEvents()
  .catch((error) => {
    console.error('Error refetching events:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });