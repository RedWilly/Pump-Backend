import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const getBlockNumber = async (): Promise<void> => {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  try {
    const blockNumber: bigint = await client.getBlockNumber();
    console.log('Current Block Number:', blockNumber.toString());
  } catch (error) {
    console.error('Error fetching block number:', error);
  }
};

getBlockNumber();
