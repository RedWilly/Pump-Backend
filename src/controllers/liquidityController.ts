import { Request, Response } from 'express';
import * as liquidityService from '../services/liquidityService';

export async function getLiquidityEventsByTokenId(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const liquidityEvents = await liquidityService.getLiquidityEventsByTokenId(chain, tokenId, page, pageSize);
    res.json(liquidityEvents);
  } catch (error) {
    console.error('Error fetching liquidity events by token ID:', error);
    res.status(500).json({ error: 'Failed to fetch liquidity events' });
  }
}

export async function getRecentLiquidityEvents(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const events = await liquidityService.getRecentLiquidityEvents(chain, page, pageSize);
    res.json(events);
  } catch (error) {
    console.error('Error fetching recent liquidity events:', error);
    res.status(500).json({ error: 'Failed to fetch recent liquidity events' });
  }
}

export async function getLiquidityEventByTxHash(req: Request, res: Response) {
  try {
    const { chain, txHash } = req.params;
    const event = await liquidityService.getLiquidityEventByTxHash(chain, txHash);
    
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ error: 'Liquidity event not found' });
    }
  } catch (error) {
    console.error('Error fetching liquidity event by hash:', error);
    res.status(500).json({ error: 'Failed to fetch liquidity event' });
  }
}

export async function getTotalLiquidityForToken(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const totalLiquidity = await liquidityService.getTotalLiquidityForToken(chain, tokenId);
    res.json(totalLiquidity);
  } catch (error) {
    console.error('Error fetching total liquidity for token:', error);
    res.status(500).json({ error: 'Failed to fetch total liquidity' });
  }
}

export async function getLatestLiquidityEventForToken(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const latestEvent = await liquidityService.getLatestLiquidityEventForToken(chain, tokenId);
    
    if (latestEvent) {
      res.json(latestEvent);
    } else {
      res.status(404).json({ error: 'No liquidity events found for this token' });
    }
  } catch (error) {
    console.error('Error fetching latest liquidity event for token:', error);
    res.status(500).json({ error: 'Failed to fetch latest liquidity event' });
  }
}

export async function getLiquidityHistory(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const history = await liquidityService.getLiquidityHistory(chain, tokenId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching liquidity history:', error);
    res.status(500).json({ error: 'Failed to fetch liquidity history' });
  }
}

export async function getTopLiquidityTokens(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const topTokens = await liquidityService.getTopLiquidityTokens(chain, limit);
    res.json(topTokens);
  } catch (error) {
    console.error('Error fetching top liquidity tokens:', error);
    res.status(500).json({ error: 'Failed to fetch top liquidity tokens' });
  }
}

export async function getLiquidityAddedInTimeframe(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';

    const liquidityAdded = await liquidityService.getLiquidityAddedInTimeframe(chain, tokenId, timeframe);
    res.json(liquidityAdded);
  } catch (error) {
    console.error('Error fetching liquidity added in timeframe:', error);
    res.status(500).json({ error: 'Failed to fetch liquidity added' });
  }
}