import { createPublicClient, http, Address, ContractFunctionExecutionError } from 'viem';
import { shibarium } from 'viem/chains';
import { prisma, broadcastUpdate } from '../app';
import { createToken, getTokenByAddress, updateToken } from '../services/tokenService';
import { createTransaction } from '../services/transactionService';
import { createLiquidityEvent } from '../services/liquidityService';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';

const CONTRACT_ADDRESS = '0x6Cb47Ef9b8482c3303C25F1164DCE03d2d2bd9A1'; // Replace with your contract address

export async function setupBlockchainListeners() {
    const client = createPublicClient({
      chain: shibarium,
      transport: http()
    });
  
    client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      eventName: TOKEN_CREATED_EVENT,
      onLogs: handleTokenCreated
    });
  
    client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      eventName: TOKENS_BOUGHT_EVENT,
      onLogs: handleTokensBought
    });
  
    client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      eventName: TOKENS_SOLD_EVENT,
      onLogs: handleTokensSold
    });
  
    client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      eventName: LIQUIDITY_ADDED_EVENT,
      onLogs: handleLiquidityAdded
    });
}

async function calculateTokenPrice(tokenAddress: Address, blockNumber: bigint): Promise<string> {
  const client = createPublicClient({
    chain: shibarium,
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

async function handleTokenCreated(logs: any) {
  for (const log of logs) {
    const { tokenAddress, creator, name, symbol } = log.args;
    const token = await createToken({
      address: tokenAddress,
      creatorAddress: creator,
      name,
      symbol
      // logo and description are omitted and will default to empty strings
    });
    broadcastUpdate('tokenCreated', token);
  }
}

async function handleTokensBought(logs: any) {
  for (const log of logs) {
    const { token: tokenAddress, buyer, ethAmount, tokenAmount } = log.args;
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      // const tokenPrice = calculateTokenPrice(ethAmount, tokenAmount);
      const tokenPrice = await calculateTokenPrice(tokenAddress, BigInt(log.blockNumber));
      const transaction = await createTransaction({
        tokenId: token.id,
        type: 'buy',
        senderAddress: buyer,
        recipientAddress: tokenAddress,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        tokenPrice: tokenPrice.toString(),
        txHash: log.transactionHash
      });
      broadcastUpdate('tokensBought', transaction);
    }
  }
}

async function handleTokensSold(logs: any) {
  for (const log of logs) {
    const { token: tokenAddress, seller, tokenAmount, ethAmount } = log.args;
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      // const tokenPrice = calculateTokenPrice(ethAmount, tokenAmount);
      const tokenPrice = await calculateTokenPrice(tokenAddress, BigInt(log.blockNumber));
      const transaction = await createTransaction({
        tokenId: token.id,
        type: 'sell',
        senderAddress: seller,
        recipientAddress: tokenAddress,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        tokenPrice: tokenPrice.toString(), 
        txHash: log.transactionHash
      });
      broadcastUpdate('tokensSold', transaction);
    }
  }
}

async function handleLiquidityAdded(logs: any) {
  for (const log of logs) {
    const { token: tokenAddress, ethAmount, tokenAmount } = log.args;
    const token = await getTokenByAddress(tokenAddress);
    if (token) {
      const liquidityEvent = await createLiquidityEvent({
        tokenId: token.id,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        txHash: log.transactionHash
      });
      broadcastUpdate('liquidityAdded', liquidityEvent);
    }
  }
}