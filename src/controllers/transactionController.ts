import { Request, Response } from 'express';
import * as transactionService from '../services/transactionService';

export async function getTransactionsByTokenId(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const transactions = await transactionService.getTransactionsByTokenId(chain, tokenId, page, pageSize);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions by token ID:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

export async function getTransactionsByAddress(req: Request, res: Response) {
  try {
    const { chain, address } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await transactionService.getTransactionsByAddress(chain, address, page, pageSize);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions by address:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

export async function getRecentTransactions(req: Request, res: Response) {
  try {
    const { chain } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const transactions = await transactionService.getRecentTransactions(chain, page, pageSize);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
}

export async function getTransactionByTxHash(req: Request, res: Response) {
  try {
    const { chain, txHash } = req.params;
    const transaction = await transactionService.getTransactionByTxHash(chain, txHash);
    
    if (transaction) {
      res.json(transaction);
    } else {
      res.status(404).json({ error: 'Transaction not found' });
    }
  } catch (error) {
    console.error('Error fetching transaction by hash:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
}

export async function getTransactionVolume(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';

    const volume = await transactionService.getTransactionVolume(chain, tokenId, timeframe);
    res.json({ volume });
  } catch (error) {
    console.error('Error fetching transaction volume:', error);
    res.status(500).json({ error: 'Failed to fetch transaction volume' });
  }
}

export async function getTransactionCount(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';

    const count = await transactionService.getTransactionCount(chain, tokenId, timeframe);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching transaction count:', error);
    res.status(500).json({ error: 'Failed to fetch transaction count' });
  }
}

export async function getLatestTokenPrice(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;

    const price = await transactionService.getLatestTokenPrice(chain, tokenId);
    if (price) {
      res.json({ price });
    } else {
      res.status(404).json({ error: 'No transactions found for this token' });
    }
  } catch (error) {
    console.error('Error fetching latest token price:', error);
    res.status(500).json({ error: 'Failed to fetch latest token price' });
  }
}

export async function getTokenPriceHistory(req: Request, res: Response) {
  try {
    const { chain, tokenId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const priceHistory = await transactionService.getTokenPriceHistory(chain, tokenId, limit);
    res.json(priceHistory);
  } catch (error) {
    console.error('Error fetching token price history:', error);
    res.status(500).json({ error: 'Failed to fetch token price history' });
  }
}