import { Request, Response } from 'express';
import * as liquidityService from '../services/liquidityService';

export async function getLiquidityEventsByTokenId(req: Request, res: Response) {
  try {
    const liquidityEvents = await liquidityService.getLiquidityEventsByTokenId(req.params.tokenId);
    res.json(liquidityEvents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch liquidity events' });
  }
}