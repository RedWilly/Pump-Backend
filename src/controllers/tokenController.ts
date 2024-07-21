import { Request, Response } from 'express';
import * as tokenService from '../services/tokenService';
import * as transactionService from '../services/transactionService';
import * as liquidityService from '../services/liquidityService';

export async function getAllTokens(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const tokens = await tokenService.getAllTokens(chain, page, pageSize);
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching all tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
}

export async function getTokenById(req: Request, res: Response) {
  try {
    const { chain, id } = req.params;
    const transactionPage = parseInt(req.query.transactionPage as string) || 1;
    const transactionPageSize = parseInt(req.query.transactionPageSize as string) || 20;

    const token = await tokenService.getTokenById(chain, id, transactionPage, transactionPageSize);

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json(token);
  } catch (error) {
    console.error('Error fetching token by ID:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
}

export async function getRecentTokens(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const hours = parseInt(req.query.hours as string) || 1;

    console.log(`Fetching tokens for the last ${hours} hours (Page ${page}, Size ${pageSize})`);
    
    const result = await tokenService.getRecentTokens(chain, page, pageSize, hours);
    
    if (result.tokens.length > 0) {
      res.json(result);
    } else {
      res.status(404).json({ message: "No recent tokens found" });
    }
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    res.status(500).json({ error: 'Failed to fetch recent tokens' });
  }
}

export async function getTokenByAddress(req: Request, res: Response) {
  try {
    const { chain, address } = req.params;
    const token = await tokenService.getTokenByAddress(chain, address);
    if (token) {
      res.json(token);
    } else {
      res.status(404).json({ error: 'Token not found' });
    }
  } catch (error) {
    console.error('Error fetching token by address:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
}

export async function getTokensWithLiquidity(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await tokenService.getTokensWithLiquidityEvents(chain, page, pageSize);
    
    if (result.tokens.length > 0) {
      res.json(result);
    } else {
      res.status(404).json({ message: "No tokens with liquidity events found" });
    }
  } catch (error) {
    console.error('Error fetching tokens with liquidity:', error);
    res.status(500).json({ error: 'Failed to fetch tokens with liquidity' });
  }
}

export async function getTokenInfoAndTransactionsByAddress(req: Request, res: Response) {
  try {
    const { chain, address } = req.params;
    const transactionPage = parseInt(req.query.transactionPage as string) || 1;
    const transactionPageSize = parseInt(req.query.transactionPageSize as string) || 20;

    const tokenInfo = await tokenService.getTokenInfoAndTransactionsByAddress(chain, address, transactionPage, transactionPageSize);

    if (!tokenInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json(tokenInfo);
  } catch (error) {
    console.error('Error fetching token info and transactions:', error);
    res.status(500).json({ error: 'Failed to fetch token info and transactions' });
  }
}

export async function getTokenHistoricalPrices(req: Request, res: Response) {
  try {
    const { chain, address } = req.params;

    const historicalPrices = await tokenService.getTokenHistoricalPrices(chain, address);

    if (!historicalPrices) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json(historicalPrices);
  } catch (error) {
    console.error('Error fetching token historical prices:', error);
    res.status(500).json({ error: 'Failed to fetch token historical prices' });
  }
}

export async function updateTokenInfo(req: Request, res: Response) {
  try {
    const { chain, address } = req.params;
    const { logo, description, website, telegram, discord, twitter, youtube } = req.body;
    
    const updatedToken = await tokenService.updateToken(chain, address, { 
      logo, description, website, telegram, discord, twitter, youtube 
    });
    
    if (!updatedToken) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json(updatedToken);
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
}

export async function getAllTokenAddresses(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const tokens = await tokenService.getAllTokenAddresses(chain);
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching token addresses and symbols:', error);
    res.status(500).json({ error: 'Failed to fetch token addresses and symbols' });
  }
}

export async function getTokenStatistics(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';

    const [volume, transactionCount, liquidityAdded, latestPrice] = await Promise.all([
      transactionService.getTransactionVolume(chain, tokenId, timeframe),
      transactionService.getTransactionCount(chain, tokenId, timeframe),
      liquidityService.getLiquidityAddedInTimeframe(chain, tokenId, timeframe),
      transactionService.getLatestTokenPrice(chain, tokenId)
    ]);

    res.json({
      volume,
      transactionCount,
      liquidityAdded,
      latestPrice
    });
  } catch (error) {
    console.error('Error fetching token statistics:', error);
    res.status(500).json({ error: 'Failed to fetch token statistics' });
  }
}

export async function getTopTokens(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const topTokens = await liquidityService.getTopLiquidityTokens(chain, limit);
    res.json(topTokens);
  } catch (error) {
    console.error('Error fetching top tokens:', error);
    res.status(500).json({ error: 'Failed to fetch top tokens' });
  }
}