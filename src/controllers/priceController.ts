import { Request, Response } from 'express';
import * as priceService from '../services/priceService';

export async function getCurrentPrice(req: Request, res: Response) {
    try {
        const price = await priceService.getPrice();
        if (price) {
            res.json({ price });
        } else {
            res.status(404).json({ error: 'Price not available' });
        }
    } catch (error) {
        console.error('Error getting current price:', error);
        res.status(500).json({ error: 'Failed to fetch current price' });
    }
}