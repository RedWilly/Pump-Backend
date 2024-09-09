import { Request, Response } from 'express';
import * as tokenService from '../services/tokenService';

export async function getAllTokens(req: Request, res: Response) {
  try {
    const tokens = await tokenService.getAllTokens();
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
}

export async function getTokenById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transactionPage = parseInt(req.query.transactionPage as string) || 1;
    const transactionPageSize = parseInt(req.query.transactionPageSize as string) || 20;

    const token = await tokenService.getTokenById(id, transactionPage, transactionPageSize);

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json(token);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch token' });
  }
}

export async function getRecentTokens(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const hours = parseInt(req.query.hours as string) || 1;

    console.log(`Fetching tokens for the last ${hours} hours (Page ${page}, Size ${pageSize})`);
    
    const result = await tokenService.getRecentTokens(page, pageSize, hours);
    
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
    const address = req.params.address;
    const token = await tokenService.getTokenByAddress(address);
    if (token) {
      res.json(token);
    } else {
      res.status(404).json({ error: 'Token not found' });
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
}

export async function getTokensWithLiquidity(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await tokenService.getTokensWithLiquidityEvents(page, pageSize);
    
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
    const { address } = req.params;
    const transactionPage = parseInt(req.query.transactionPage as string) || 1;
    const transactionPageSize = parseInt(req.query.transactionPageSize as string) || 20;

    const tokenInfo = await tokenService.getTokenInfoAndTransactionsByAddress(address, transactionPage, transactionPageSize);

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
    const { address } = req.params;

    const historicalPrices = await tokenService.getTokenHistoricalPrices(address);

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
    const { address } = req.params;
    const { logo, description, website, telegram, discord, twitter, youtube } = req.body;
    
    const updatedToken = await tokenService.updateToken(address, { 
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
    const tokens = await tokenService.getAllTokenAddresses();
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching token addresses and symbols:', error);
    res.status(500).json({ error: 'Failed to fetch token addresses and symbols' });
  }
}

export async function searchTokens(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await tokenService.searchTokens(query, page, pageSize);
    res.json(result);
  } catch (error) {
    console.error('Error searching tokens:', error);
    res.status(500).json({ error: 'Failed to search tokens' });
  }
}

export async function getTokensByCreator(req: Request, res: Response) {
  try {
    const { creatorAddress } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await tokenService.getTokensByCreator(creatorAddress, page, pageSize);

    res.json(result);
  } catch (error) {
    console.error('Error fetching tokens by creator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}