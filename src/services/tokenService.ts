// tokenService.ts
import { prisma } from '../app';
import { Prisma } from '@prisma/client';

export async function createToken(data: {
  address: string;
  creatorAddress: string;
  name: string;
  symbol: string;
  logo?: string;
  description?: string;
}) {
  return prisma.token.create({
    data: {
      ...data,
      logo: data.logo || '',
      description: data.description || ''
    }
  });
}

export async function updateToken(address: string, data: {
  logo?: string;
  description?: string;
  website?: string;
  telegram?: string;
  discord?: string;
  twitter?: string;
  youtube?: string;
}) {
  return prisma.token.update({
    where: { address },
    data
  });
}

export async function getTokenByAddress(address: string) {
  return prisma.token.findUnique({
    where: { address },
    select: {
      id: true,
      address: true,
      name: true,
      symbol: true,
      logo: true,
      description: true,
    }
  });
}

export async function getAllTokens(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;
  const [tokens, totalCount] = await Promise.all([
    prisma.token.findMany({
      where: {
        liquidityEvents: {
          none: {}
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        address: true,
        creatorAddress: true,
        name: true,
        symbol: true,
        logo: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            liquidityEvents: true
          }
        }
      },
      skip,
      take: pageSize,
    }),
    prisma.token.count({
      where: {
        liquidityEvents: {
          none: {}
        }
      }
    })
  ]);

  return {
    tokens,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentTokens(page: number = 1, pageSize: number = 20, hours: number = 1) {
  const oneHourAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  const skip = (page - 1) * pageSize;

  const [tokens, totalCount] = await Promise.all([
    prisma.token.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      },
      select: {
        id: true,
        address: true,
        creatorAddress: true,
        name: true,
        symbol: true,
        logo: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            liquidityEvents: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize,
    }),
    prisma.token.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    })
  ]);

  return {
    tokens,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTokensWithLiquidityEvents(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;
  const [tokens, totalCount] = await Promise.all([
    prisma.token.findMany({
      where: {
        liquidityEvents: {
          some: {} 
        }
      },
      include: {
        liquidityEvents: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1 
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    }),
    prisma.token.count({
      where: {
        liquidityEvents: {
          some: {}
        }
      }
    })
  ]);

  return {
    tokens,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  };
}

export async function getTokenInfoAndTransactionsByAddress(
  address: string,
  transactionPage: number = 1,
  transactionPageSize: number = 20
) {
  const token = await prisma.token.findUnique({
    where: { address },
    include: {
      transactions: {
        orderBy: { timestamp: 'desc' },
        skip: (transactionPage - 1) * transactionPageSize,
        take: transactionPageSize,
      },
    },
  });

  if (!token) {
    return null;
  }

  const transactionCount = await prisma.transaction.count({
    where: { tokenId: token.id }
  });

  return {
    ...token,
    transactions: {
      data: token.transactions,
      pagination: {
        currentPage: transactionPage,
        pageSize: transactionPageSize,
        totalCount: transactionCount,
        totalPages: Math.ceil(transactionCount / transactionPageSize)
      }
    }
  };
}

export async function getTokenById(
  id: string, 
  transactionPage: number = 1, 
  transactionPageSize: number = 20
) {
  const skip = (transactionPage - 1) * transactionPageSize;

  const [token, transactionCount] = await Promise.all([
    prisma.token.findUnique({
      where: { id },
      include: {
        liquidityEvents: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        },
        transactions: {
          orderBy: {
            timestamp: 'desc'
          },
          skip,
          take: transactionPageSize
        },
      }
    }),
    prisma.transaction.count({
      where: { tokenId: id }
    })
  ]);

  if (!token) {
    return null;
  }

  return {
    ...token,
    transactions: {
      data: token.transactions,
      pagination: {
        currentPage: transactionPage,
        pageSize: transactionPageSize,
        totalCount: transactionCount,
        totalPages: Math.ceil(transactionCount / transactionPageSize)
      }
    }
  };
}

//Token History - price timestamp
export async function getTokenHistoricalPrices(address: string) {
  const token = await prisma.token.findUnique({
    where: { address },
    select: { id: true }
  });

  if (!token) {
    return null;
  }

  const historicalPrices = await prisma.transaction.findMany({
    where: { tokenId: token.id },
    select: {
      tokenPrice: true,
      timestamp: true
    },
    orderBy: { timestamp: 'asc' }
  });

  return historicalPrices;
}

//get all token address
export async function getAllTokenAddresses() {
  return prisma.token.findMany({
    select: {
      address: true,
      name: true,
      symbol: true
    }
  });
}


//search token
export async function searchTokens(query: string, page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [tokens, totalCount] = await Promise.all([
    prisma.token.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { symbol: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        address: true,
        name: true,
        symbol: true,
        logo: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            liquidityEvents: true,
          },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.token.count({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { symbol: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
  ]);

  return {
    tokens,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTokensByCreator(creatorAddress: string, page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [tokens, totalCount] = await Promise.all([
    prisma.token.findMany({
      where: {
        creatorAddress: creatorAddress
      },
      select: {
        address: true,
        name: true,
        symbol: true,
        logo: true,
        description: true,
        creatorAddress: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize,
    }),
    prisma.token.count({
      where: {
        creatorAddress: creatorAddress
      }
    })
  ]);

  return {
    tokens,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}