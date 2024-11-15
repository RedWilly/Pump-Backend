import { parseAbi } from 'viem';
import { client } from '../blockchain/client';
import { PrismaClient } from '@prisma/client';
import { createToken } from '../services/tokenService';

const prisma = new PrismaClient();

const ABI = parseAbi([
  'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, string logo, string description)'
]);

const CONTRACT_ADDRESS = '0x97b962Ab399beBF439a4a303d9754e79d6925EDa';

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