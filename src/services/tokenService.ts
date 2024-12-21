// tokenService.ts
import { prisma } from '../app';
import { Prisma } from '@prisma/client';
import { updateQueue } from '../blockchain/updateQueue';
import { client } from '../blockchain/client';
import { Address } from 'viem';

/**
 * Creates a new token or updates an existing one.
 * 
 * @param data Token data to create or update.
 * @returns The created or updated token.
 */
export async function createToken(data: {
  address: string;
  creatorAddress: string;
  name: string;
  symbol: string;
  logo?: string;
  description?: string;
  timestamp?: Date;
  chainId: number;
}) {
  const { timestamp, ...tokenData } = data;
  
  // Check if token already exists
  const existingToken = await prisma.token.findUnique({
    where: { address: data.address }
  });

  if (existingToken) {
    // If token exists, only update the blockchain-specific fields
    // while preserving any existing social info
    return prisma.token.update({
      where: { address: data.address },
      data: {
        name: data.name,
        symbol: data.symbol,
        chainId: data.chainId,
        creatorAddress: data.creatorAddress,
        // Preserve existing social info if it exists
        logo: existingToken.logo || data.logo || '',
        description: existingToken.description || data.description || '',
        // Keep existing social links
        website: existingToken.website,
        telegram: existingToken.telegram,
        discord: existingToken.discord,
        twitter: existingToken.twitter,
        youtube: existingToken.youtube
      }
    });
  }

  // If token doesn't exist, create it normally
  return prisma.token.create({
    data: {
      ...tokenData,
      chainId: data.chainId,
      logo: data.logo || '',
      description: data.description || '',
      createdAt: timestamp || new Date()
    }
  });
}

async function getTokenInfoFromChain(address: string) {
  const tokenAbi = [
    {
      type: 'function',
      name: 'name',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }]
    },
    {
      type: 'function',
      name: 'symbol',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }]
    }
  ] as const;

  try {
    // Get token info
    const [name, symbol] = await Promise.all([
      client.readContract({
        address: address as Address,
        abi: tokenAbi,
        functionName: 'name'
      }),
      client.readContract({
        address: address as Address,
        abi: tokenAbi,
        functionName: 'symbol'
      })
    ]);

    // Get contract creation transaction by looking for OwnershipTransferred event
    const ownershipEventAbi = {
      type: 'event' as const,
      name: 'OwnershipTransferred',
      inputs: [
        { type: 'address', name: 'previousOwner', indexed: true },
        { type: 'address', name: 'newOwner', indexed: true }
      ]
    };

    const logs = await client.getLogs({
      address: address as Address,
      event: ownershipEventAbi,
      fromBlock: BigInt(0),
      toBlock: 'latest'
    });

    let creatorAddress = '0x0000000000000000000000000000000000000000';
    
    if (logs.length > 0) {
      // Get the first OwnershipTransferred event's transaction
      const firstOwnershipTx = await client.getTransaction({
        hash: logs[0].transactionHash
      });

      if (firstOwnershipTx) {
        // Use the transaction sender as the creator address
        creatorAddress = firstOwnershipTx.from;
      }
    }

    return { 
      name, 
      symbol, 
      creatorAddress 
    };
  } catch (error) {
    console.error('Error fetching token info from chain:', error);
    throw new Error('Failed to fetch token info from blockchain');
  }
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
  try {
    // First check if token exists
    let token = await prisma.token.findUnique({
      where: { address }
    });

    if (!token) {
      console.log(`Token ${address} not found in database. Creating new entry...`);
      try {
        // Create a basic token entry with required fields and default values
        token = await prisma.token.create({
          data: {
            address,
            name: "Unknown", // Temporary name
            symbol: "Unknown", // Temporary symbol
            creatorAddress: "0x0000000000000000000000000000000000000000", // Temporary creator
            logo: data.logo || '', 
            description: data.description || '',
            website: data.website || null,
            telegram: data.telegram || null,
            discord: data.discord || null,
            twitter: data.twitter || null,
            youtube: data.youtube || null
          }
        });

        // Try to fetch blockchain data asynchronously
        getTokenInfoFromChain(address)
          .then(async (chainInfo) => {
            // Get the latest token data to ensure we don't override any updates
            const currentToken = await prisma.token.findUnique({
              where: { address }
            });

            if (currentToken) {
              // Update only blockchain data while preserving the latest social info
              await prisma.token.update({
                where: { address },
                data: {
                  name: chainInfo.name,
                  symbol: chainInfo.symbol,
                  creatorAddress: chainInfo.creatorAddress,
                  // Preserve the most recent social info
                  logo: currentToken.logo,
                  description: currentToken.description,
                  website: currentToken.website,
                  telegram: currentToken.telegram,
                  discord: currentToken.discord,
                  twitter: currentToken.twitter,
                  youtube: currentToken.youtube
                }
              });
            }
          })
          .catch(error => {
            console.warn(`Failed to fetch chain info for ${address}:`, error);
          });

        return token;
      } catch (error) {
        console.error('Error creating token:', error);
        throw new Error('Failed to create token');
      }
    }

    // If token exists, queue the update
    await updateQueue.addToQueue(address, data);
    return { message: 'Update queued successfully' };
  } catch (error) {
    console.error('Error in updateToken:', error);
    throw error;
  }
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
      chainId: true,
      description: true,
    }
  });
}

export async function getAllTokens(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  
  const [tokens, total] = await Promise.all([
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
        chainId: true,
        symbol: true,
        logo: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        website: true,
        telegram: true,
        discord: true,
        twitter: true,
        youtube: true,
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
      currentPage: page,
      totalPages: Math.ceil(total / pageSize),
      totalCount: total
    
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
        chainId: true,
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
  const tokenData = await prisma.token.findUnique({
    where: { address },
    include: {
      transactions: {
        orderBy: { timestamp: 'desc' },
        skip: (transactionPage - 1) * transactionPageSize,
        take: transactionPageSize,
      },
      _count: {
        select: { transactions: true }
      }
    },
  });

  if (!tokenData) {
    return null;
  }

  const { _count, ...tokenDataWithoutCount } = tokenData;


  return {
    ...tokenDataWithoutCount,
    transactions: {
      data: tokenData.transactions,
      pagination: {
        currentPage: transactionPage,
        pageSize: transactionPageSize,
        totalCount: tokenData._count.transactions,
        totalPages: Math.ceil(tokenData._count.transactions / transactionPageSize)
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
      symbol: true,
      chainId: true
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
        chainId: true,
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
        chainId: true,
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

export async function getListedTokens() {
  try {
    const listedTokens = await prisma.token.findMany({
      where: {
        liquidityEvents: {
          some: {}
        }
      },
      select: {
        name: true,
        symbol: true,
        logo: true,
        address: true,
        chainId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return listedTokens.map(token => ({
      name: token.name,
      symbol: token.symbol,
      image: token.logo || '',
      address: token.address
    }));
  } catch (error) {
    console.error('Error fetching listed tokens:', error);
    throw error;
  }
}
 
//just tokens recently traded
export const getTrendingTokens = async () => {
  try {
    // Get all tokens with transactions but no liquidity events
    const latestTransactions = await prisma.transaction.groupBy({
      by: ['tokenId'],
      _max: {
        timestamp: true
      },
      where: {
        token: {
          liquidityEvents: {
            none: {}
          }
        }
      },
      orderBy: {
        _max: {
          timestamp: 'desc'
        }
      }
    });

    // Get full token details
    const tokenIds = latestTransactions.map(t => t.tokenId);
    const tokens = await prisma.token.findMany({
      where: {
        id: {
          in: tokenIds
        },
        liquidityEvents: {
          none: {}
        }
      },
      include: {
        transactions: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    // Sort and format the tokens
    const formattedTokens = tokens
      .map(token => ({
        ...token,
        latestTransactionTimestamp: token.transactions[0]?.timestamp,
        transactions: undefined,
        _count: {
          liquidityEvents: 0
        }
      }))
      .sort((a, b) => {
        if (!a.latestTransactionTimestamp) return 1;
        if (!b.latestTransactionTimestamp) return -1;
        return b.latestTransactionTimestamp.getTime() - a.latestTransactionTimestamp.getTime();
      });

    return formattedTokens;
  } catch (error) {
    console.error('Error getting trending tokens:', error);
    throw new Error('Failed to get trending tokens');
  }
};

export async function getTokensWithoutLiquidityEvents() {
  const tokens = await prisma.token.findMany({
    where: {
      liquidityEvents: {
        none: {}
      }
    },
    select: {
      address: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return tokens.map(token => token.address);
}
