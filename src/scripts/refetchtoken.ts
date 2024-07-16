import { createPublicClient, http, parseAbi } from 'viem';
import { shibarium } from 'viem/chains';
import { PrismaClient } from '@prisma/client';
import { createToken } from '../services/tokenService';

const prisma = new PrismaClient();

const ABI = parseAbi([
  'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, string logo, string description)'
]);

const CONTRACT_ADDRESS = '0x6Cb47Ef9b8482c3303C25F1164DCE03d2d2bd9A1';

const client = createPublicClient({
  chain: shibarium,
  transport: http()
});

async function refetchTokenCreation() {
  const createBlock = 5679076;

  console.log('Refetching TokenCreated event...');
  const createLogs = await client.getLogs({
    address: CONTRACT_ADDRESS,
    event: ABI[0],
    fromBlock: BigInt(createBlock),
    toBlock: BigInt(createBlock)
  });

  console.log('Processing TokenCreated event...');
  for (const log of createLogs) {
    await handleTokenCreated(log);
  }

  console.log('Finished processing TokenCreated event.');
}

async function handleTokenCreated(log: any) {
  const { tokenAddress, creator, name, symbol, logo, description } = log.args;
  try {
    const token = await createToken({
      address: tokenAddress,
      creatorAddress: creator,
      name,
      symbol,
      logo,
      description
    });
    console.log('Processed TokenCreated:', token);
  } catch (error) {
    console.error('Error processing TokenCreated event:', error);
    console.log('Event data:', { tokenAddress, creator, name, symbol, logo, description });
  }
}

refetchTokenCreation()
  .catch((error) => {
    console.error('Error refetching TokenCreated event:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });