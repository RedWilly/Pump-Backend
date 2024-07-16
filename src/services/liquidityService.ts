// liquidityService.ts
import { prisma } from '../app';

export async function createLiquidityEvent(data: {
  tokenId: string;
  ethAmount: string;
  tokenAmount: string;
  txHash: string;
}) {
  return prisma.liquidityEvent.create({
    data: {
      ...data,
      ethAmount: data.ethAmount.toString(),
      tokenAmount: data.tokenAmount.toString()
    }
  });
}

export async function getLiquidityEventsByTokenId(tokenId: string, page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [liquidityEvents, totalCount] = await Promise.all([
    prisma.liquidityEvent.findMany({
      where: { tokenId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.liquidityEvent.count({
      where: { tokenId }
    })
  ]);

  return {
    liquidityEvents,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentLiquidityEvents(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [liquidityEvents, totalCount] = await Promise.all([
    prisma.liquidityEvent.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        token: {
          select: {
            name: true,
            symbol: true
          }
        }
      },
      skip,
      take: pageSize,
    }),
    prisma.liquidityEvent.count()
  ]);

  return {
    liquidityEvents,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}