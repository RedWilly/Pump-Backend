import { Request, Response, NextFunction } from 'express';
import * as priceService from '../services/priceService';
import { NotFoundError, AppError } from '../utils/errors';
import logger from '../utils/logger';

export async function getPrice(req: Request, res: Response, next: NextFunction) {
  try {
    const { chain } = req.params;
    const price = await priceService.getPrice(chain);
    res.json({ price });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      logger.error(`Error in getPrice for chain ${req.params.chain}: ${error.message}`);
      next(new AppError(500, `Failed to fetch price for ${req.params.chain}`));
    } else {
      logger.error(`Unknown error in getPrice for chain ${req.params.chain}`);
      next(new AppError(500, 'An unexpected error occurred'));
    }
  }
}

export function getSupportedChains(req: Request, res: Response) {
  const chains = priceService.getSupportedChains();
  res.json({ supportedChains: chains });
}