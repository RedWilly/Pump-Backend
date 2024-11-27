import { prisma } from '../app';

export async function trackVolume(ethAmount: number, type: 'BUY' | 'SELL') {
  try {
    // Record individual volume entry
    await prisma.platformVolume.create({
      data: {
        volume: ethAmount,
        type: type,
      }
    });

    // Update total volume
    const totalVolume = await prisma.totalVolume.findFirst();
    
    if (totalVolume) {
      await prisma.totalVolume.update({
        where: { id: totalVolume.id },
        data: {
          totalVolume: totalVolume.totalVolume + ethAmount
        }
      });
    } else {
      await prisma.totalVolume.create({
        data: {
          totalVolume: ethAmount
        }
      });
    }
  } catch (error) {
    console.error('Error tracking volume:', error);
    throw error;
  }
}

export async function getTotalVolume() {
  try {
    const totalVolume = await prisma.totalVolume.findFirst();
    return totalVolume?.totalVolume || 0;
  } catch (error) {
    console.error('Error getting total volume:', error);
    throw error;
  }
}

export async function getVolumeByTimeRange(startDate: Date, endDate: Date) {
  try {
    const volumes = await prisma.platformVolume.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const buyVolume = volumes
      .filter(v => v.type === 'BUY')
      .reduce((acc, curr) => acc + curr.volume, 0);

    const sellVolume = volumes
      .filter(v => v.type === 'SELL')
      .reduce((acc, curr) => acc + curr.volume, 0);

    return {
      buyVolume,
      sellVolume,
      totalVolume: buyVolume + sellVolume
    };
  } catch (error) {
    console.error('Error getting volume by time range:', error);
    throw error;
  }
} 