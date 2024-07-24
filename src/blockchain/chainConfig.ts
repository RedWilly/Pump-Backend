//chainConfig.ts
import { Chain } from 'viem'
import { shibarium, sepolia, baseSepolia, optimism, avalanche } from 'viem/chains'
import { db } from '../config/database'
import { chains } from '../config/schema'
import { eq } from 'drizzle-orm'
import logger from '../utils/logger'


export interface ChainConfig extends Chain {
  contractAddress: `0x${string}`;
}

export const supportedChains: Record<string, ChainConfig> = {
  // shibarium: {
  //   ...shibarium,
  //   contractAddress: '0x6Cb47Ef9b8482c3303C25F1164DCE03d2d2bd9A1',
  // },
  sepolia: {
    ...sepolia,
    contractAddress: '0x4D57D3F66002Bb11096064310740b3544a2c31e6',
  },
  baseSepolia: {
    ...baseSepolia,
    contractAddress: '0x4D57D3F66002Bb11096064310740b3544a2c31e6',
  },
//   optimism: {
//     ...optimism,
//     contractAddress: '0x...',  // Add the contract address for Optimism
//   },
//   avalanche: {
//     ...avalanche,
//     contractAddress: '0x...',  // Add the contract address for Avalanche
//   },
}

export const getChainConfig = (chainName: string): ChainConfig => {
  const config = supportedChains[chainName]
  if (!config) {
    throw new Error(`Unsupported chain: ${chainName}`)
  }
  return config
}

// export async function ensureChainInDatabase(chainName: string) {
//   const existingChain = await db.select().from(chains).where(eq(chains.name, chainName)).limit(1)
  
//   if (existingChain.length === 0) {
//     await db.insert(chains).values({ name: chainName })
//     console.log(`Added new chain to database: ${chainName}`)
//   }
// }

export async function ensureChainInDatabase(chainName: string) {
  const existingChain = await db.select().from(chains).where(eq(chains.name, chainName)).limit(1);

  if (existingChain.length === 0) {
    await db.insert(chains).values({ name: chainName }).execute();
    logger.info(`Added new chain to database: ${chainName}`);
  } else {
    logger.info(`Chain already exists in database: ${chainName}`);
  }
}

export async function initializeAllChains() {
  for (const chainName of Object.keys(supportedChains)) {
    await ensureChainInDatabase(chainName)
  }
  console.log('All supported chains have been initialized in the database.')
}