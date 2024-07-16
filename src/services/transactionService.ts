// transactionService.ts
import { prisma } from '../app';

export async function createTransaction(data: {
  tokenId: string;
  type: string;
  senderAddress: string;
  recipientAddress: string;
  ethAmount: string;
  tokenAmount: string;
  tokenPrice: string;
  txHash: string;
}) {
  return prisma.transaction.create({
    data: {
      ...data,
      ethAmount: data.ethAmount.toString(),
      tokenAmount: data.tokenAmount.toString(),
      tokenPrice: data.tokenPrice.toString()
    }
  });
}

export async function getTransactionsByTokenId(tokenId: string, page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { tokenId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({
      where: { tokenId }
    })
  ]);

  return {
    transactions,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentTransactions(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
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
    prisma.transaction.count()
  ]);

  return {
    transactions,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTransactionsByAddress(address: string, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        OR: [
          { senderAddress: address },
          { recipientAddress: address }
        ]
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({
      where: {
        OR: [
          { senderAddress: address },
          { recipientAddress: address }
        ]
      }
    })
  ]);

  return {
    transactions,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}