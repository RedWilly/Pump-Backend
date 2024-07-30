import { createPublicClient, http, getAbiItem, Address } from 'viem';
import { shibarium } from 'viem/chains';
import { ABI, TOKEN_CREATED_EVENT } from './blockchain/abi';
import { createToken } from './services/tokenService';
import { prisma } from './app';

const CONTRACT_ADDRESS = '0x97b962Ab399beBF439a4a303d9754e79d6925EDa';

async function recoverTokenCreation(blockNumber: number) {
  const client = createPublicClient({
    chain: shibarium,
    transport: http()
  });

  try {
    console.log(`Fetching logs for block ${blockNumber}...`);
    const logs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      event: getAbiItem({ abi: ABI, name: TOKEN_CREATED_EVENT }),
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber)
    });

    console.log(`Found ${logs.length} TokenCreated event(s)`);

    for (const log of logs) {
      const { tokenAddress, creator, name, symbol } = log.args;

      // Ensure all required fields are present
      if (!tokenAddress || !creator || !name || !symbol) {
        console.log('Skipping event due to missing data');
        continue;
      }

      console.log(`Processing token: ${name} (${symbol})`);

      // Check if token already exists
      const existingToken = await prisma.token.findUnique({
        where: { address: tokenAddress }
      });

      if (existingToken) {
        console.log(`Token ${tokenAddress} already exists in the database. Skipping.`);
        continue;
      }

      // Create new token
      const token = await createToken({
        address: tokenAddress,
        creatorAddress: creator,
        name: name,
        symbol: symbol
      });

      console.log(`Token created in database: ${token.id}`);
    }

    console.log('Recovery process completed successfully.');
  } catch (error) {
    console.error('Error during recovery process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage
const blockToRecover = 6041233;
recoverTokenCreation(blockToRecover);