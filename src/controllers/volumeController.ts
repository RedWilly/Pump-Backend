import { Request, Response } from 'express';
import * as volumeService from '../services/volumeService';

export async function getTotalVolume(req: Request, res: Response) {
  try {
    const totalVolume = await volumeService.getTotalVolume();
    res.json({ totalVolume });
  } catch (error) {
    console.error('Error getting total volume:', error);
    res.status(500).json({ error: 'Failed to get total volume' });
  }
}

export async function getVolumeByTimeRange(req: Request, res: Response) {
  try {
    const hours = parseInt(req.query.hours as string) || 24; // Default to 24 hours if not specified
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000));

    const volumeData = await volumeService.getVolumeByTimeRange(startDate, endDate);
    res.json({
      ...volumeData,
      timeRange: {
        hours,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting volume by time range:', error);
    res.status(500).json({ error: 'Failed to get volume data' });
  }
} 