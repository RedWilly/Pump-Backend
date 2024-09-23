//just a simple script to recover tokens that were created but backend was not running
//it will fetch all the logs from the block that the contract was deployed and then it will create a new token in the database
import { createPublicClient, http, getAbiItem, Address } from 'viem';
import { mainnet } from 'viem/chains';
import { ABI, TOKEN_CREATED_EVENT } from './blockchain/abi';
import { createToken } from './services/tokenService';
import { prisma } from './app';

const CONTRACT_ADDRESS = '0xbe0D65cb03D7Cb51f1862b8Ddc58322Ff73aAF85'; // replace 0xcontract_address_here with the contract address

async function recoverTokenCreation(blockNumber: number) {
  const client = createPublicClient({
    chain: mainnet,
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
const blockToRecover = 6041233; //replace 6041233 with the block number that the contract was deployed
recoverTokenCreation(blockToRecover);