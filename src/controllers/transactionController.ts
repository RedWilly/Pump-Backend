import { Request, Response } from 'express';
import * as transactionService from '../services/transactionService';

export async function getTransactionsByTokenId(req: Request, res: Response) {
  try {
    const transactions = await transactionService.getTransactionsByTokenId(req.params.tokenId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

export async function getTransactionsByAddress(req: Request, res: Response) {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await transactionService.getTransactionsByAddress(address, page, pageSize);

    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}