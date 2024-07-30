//npx ts-node scripts/refetch.ts

import { createPublicClient, http, parseAbi } from 'viem';
import { shibarium } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import { createTransaction } from '../services/transactionService';
import { getTokenByAddress } from '../services/tokenService';

const prisma = new PrismaClient();

const ABI = parseAbi([
  'event TokensBought(address indexed token, address indexed buyer, uint256 ethAmount, uint256 tokenAmount)',
  'event TokensSold(address indexed token, address indexed seller, uint256 tokenAmount, uint256 ethAmount)'
]);

const CONTRACT_ADDRESS = '0x97b962Ab399beBF439a4a303d9754e79d6925EDa';

const client = createPublicClient({
  chain: shibarium,
  transport: http()
});

async function refetchEvents() {
  const buyBlock = 5811355;
  const sellBlock = 5639268;

  console.log('Refetching TokensBought event...');
  const buyLogs = await client.getLogs({
    address: CONTRACT_ADDRESS,
    event: ABI[0],
    fromBlock: BigInt(buyBlock),
    toBlock: BigInt(buyBlock)
  });

  console.log('Refetching TokensSold event...');
  const sellLogs = await client.getLogs({
    address: CONTRACT_ADDRESS,
    event: ABI[1],
    fromBlock: BigInt(sellBlock),
    toBlock: BigInt(sellBlock)
  });

  console.log('Processing TokensBought event...');
  for (const log of buyLogs) {
    await handleTokensBought(log);
  }

  console.log('Processing TokensSold event...');
  for (const log of sellLogs) {
    await handleTokensSold(log);
  }

  console.log('Finished processing events.');
}

function calculateTokenPrice(ethAmount: bigint, tokenAmount: bigint): string {
  const price = Number(ethAmount) / Number(tokenAmount);
  return (price * 1e18).toFixed(0);
}

async function handleTokensBought(log: any) {
  const { token: tokenAddress, buyer, ethAmount, tokenAmount } = log.args;
  const token = await getTokenByAddress(tokenAddress);
  if (token) {
    const tokenPrice = calculateTokenPrice(ethAmount, tokenAmount);
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
    console.log('Processed TokensBought:', transaction);
  } else {
    console.log('Token not found for address:', tokenAddress);
  }
}

async function handleTokensSold(log: any) {
  const { token: tokenAddress, seller, tokenAmount, ethAmount } = log.args;
  const token = await getTokenByAddress(tokenAddress);
  if (token) {
    const tokenPrice = calculateTokenPrice(ethAmount, tokenAmount);
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
    console.log('Processed TokensSold:', transaction);
  } else {
    console.log('Token not found for address:', tokenAddress);
  }
}

refetchEvents()
  .catch((error) => {
    console.error('Error refetching events:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });