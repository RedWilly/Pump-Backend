// import axios from 'axios';

// const cacheDuration = 300000; // Cache duration for 5 minutes

// let cachedPrice: string | null = null;
// let lastFetchTime = 0;

// async function fetchPriceFromMEXC(): Promise<string> {
//     try {
//         const response = await axios.get('https://www.mexc.com/open/api/v2/market/ticker?symbol=bone_usdt');
//         const price = response.data.data[0].ask; // Current price from MEXC API using the 'ask' field
//         return price;
//     } catch (error) {
//         console.error('Error fetching price from MEXC:', error);
//         throw error;
//     }
// }

// export async function getPrice(): Promise<string | null> {
//     const now = Date.now();
//     if (!cachedPrice || (now - lastFetchTime) > cacheDuration) {
//         cachedPrice = await fetchPriceFromMEXC();
//         lastFetchTime = now;
//     }
//     return cachedPrice;
// }

import axios from 'axios';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

const cacheDuration = 300000;

interface ChainTokenMap {
  [chainName: string]: string;
}

const chainToTokenMap: ChainTokenMap = {
  shibarium: 'bone_usdt',
  avalanche: 'avax_usdt',
};

interface PriceCache {
  [chainName: string]: {
    price: string;
    lastFetchTime: number;
  };
}

let priceCache: PriceCache = {};

async function fetchPriceFromMEXC(chainName: string): Promise<string> {
  const token = chainToTokenMap[chainName];
  if (!token) {
    throw new NotFoundError(`Token for chain ${chainName} not found`);
  }

  try {
    const response = await axios.get(`https://www.mexc.com/open/api/v2/market/ticker?symbol=${token}`);
    const price = response.data.data[0].ask;
    return price;
  } catch (error) {
    logger.error(`Error fetching price for ${chainName} from MEXC:`, error);
    throw error;
  }
}

export async function getPrice(chainName: string): Promise<string> {
  const now = Date.now();
  const cachedData = priceCache[chainName];

  if (!cachedData || (now - cachedData.lastFetchTime) > cacheDuration) {
    try {
      const price = await fetchPriceFromMEXC(chainName);
      priceCache[chainName] = {
        price,
        lastFetchTime: now
      };
      return price;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to fetch price for ${chainName}:`, error);
      if (cachedData) {
        logger.info(`Returning last cached price for ${chainName}`);
        return cachedData.price;
      }
      throw new Error(`No price data available for ${chainName}`);
    }
  }

  return cachedData.price;
}

export function getSupportedChains(): string[] {
  return Object.keys(chainToTokenMap);
}