import { db } from '../config/database';
import { tokens, transactions, liquidityEvents } from '../config/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function createToken(data: {
  address: string;
  creatorAddress: string;
  name: string;
  symbol: string;
  logo?: string;
  description?: string;
}) {
  const [token] = await db.insert(tokens).values({
    ...data,
    logo: data.logo || '',
    description: data.description || ''
  }).returning();
  return token;
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
  const [updatedToken] = await db.update(tokens)
    .set(data)
    .where(eq(tokens.address, address))
    .returning();
  return updatedToken;
}

export async function getTokenByAddress(address: string) {
  const [token] = await db.select({
    id: tokens.id,
    address: tokens.address,
    name: tokens.name,
    symbol: tokens.symbol,
    logo: tokens.logo,
    description: tokens.description,
  })
  .from(tokens)
  .where(eq(tokens.address, address))
  .limit(1);
  return token;
}

export async function getAllTokens(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;
  
  const [tokensResult, countResult] = await Promise.all([
    db.select({
      id: tokens.id,
      address: tokens.address,
      creatorAddress: tokens.creatorAddress,
      name: tokens.name,
      symbol: tokens.symbol,
      logo: tokens.logo,
      description: tokens.description,
      createdAt: tokens.createdAt,
      updatedAt: tokens.updatedAt,
    })
    .from(tokens)
    .orderBy(desc(tokens.createdAt))
    .limit(pageSize)
    .offset(offset),

    db.select({ count: sql<number>`count(*)` }).from(tokens)
  ]);

  const totalCount = countResult[0].count;

  return {
    tokens: tokensResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentTokens(page: number = 1, pageSize: number = 20, hours: number = 1) {
  const offset = (page - 1) * pageSize;
  const oneHourAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [tokensResult, countResult] = await Promise.all([
    db.select({
      id: tokens.id,
      address: tokens.address,
      creatorAddress: tokens.creatorAddress,
      name: tokens.name,
      symbol: tokens.symbol,
      logo: tokens.logo,
      description: tokens.description,
      createdAt: tokens.createdAt,
      updatedAt: tokens.updatedAt,
    })
    .from(tokens)
    .where(gte(tokens.createdAt, oneHourAgo))
    .orderBy(desc(tokens.createdAt))
    .limit(pageSize)
    .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(gte(tokens.createdAt, oneHourAgo))
  ]);

  const totalCount = countResult[0].count;

  return {
    tokens: tokensResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTokensWithLiquidityEvents(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const latestLiquidityEvent = alias(liquidityEvents, 'latest_liquidity_event');

  const [tokensResult, countResult] = await Promise.all([
    db.select({
      id: tokens.id,
      address: tokens.address,
      creatorAddress: tokens.creatorAddress,
      name: tokens.name,
      symbol: tokens.symbol,
      logo: tokens.logo,
      description: tokens.description,
      createdAt: tokens.createdAt,
      updatedAt: tokens.updatedAt,
      latestLiquidityEvent: {
        id: latestLiquidityEvent.id,
        ethAmount: latestLiquidityEvent.ethAmount,
        tokenAmount: latestLiquidityEvent.tokenAmount,
        timestamp: latestLiquidityEvent.timestamp,
      },
    })
    .from(tokens)
    .leftJoin(
      latestLiquidityEvent,
      and(
        eq(tokens.id, latestLiquidityEvent.tokenId),
        eq(
          latestLiquidityEvent.id,
          db.select({ id: liquidityEvents.id })
            .from(liquidityEvents)
            .where(eq(liquidityEvents.tokenId, tokens.id))
            .orderBy(desc(liquidityEvents.timestamp))
            .limit(1)
        )
      )
    )
    .where(sql`${latestLiquidityEvent.id} IS NOT NULL`)
    .orderBy(desc(tokens.createdAt))
    .limit(pageSize)
    .offset(offset),

    db.select({ count: sql<number>`count(DISTINCT ${tokens.id})` })
      .from(tokens)
      .innerJoin(liquidityEvents, eq(tokens.id, liquidityEvents.tokenId))
  ]);

  const totalCount = countResult[0].count;

  return {
    tokens: tokensResult,
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
  const offset = (transactionPage - 1) * transactionPageSize;

  const [token, transactionsResult, transactionCount] = await Promise.all([
    db.select().from(tokens).where(eq(tokens.address, address)).limit(1),
    db.select().from(transactions)
      .where(eq(transactions.tokenId, sql`(SELECT id FROM ${tokens} WHERE address = ${address})`))
      .orderBy(desc(transactions.timestamp))
      .limit(transactionPageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(transactions)
      .where(eq(transactions.tokenId, sql`(SELECT id FROM ${tokens} WHERE address = ${address})`))
  ]);

  if (!token[0]) {
    return null;
  }

  const totalCount = transactionCount[0].count;

  return {
    ...token[0],
    transactions: {
      data: transactionsResult,
      pagination: {
        currentPage: transactionPage,
        pageSize: transactionPageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / transactionPageSize)
      }
    }
  };
}

export async function getTokenHistoricalPrices(address: string) {
  return db.select({
    tokenPrice: transactions.tokenPrice,
    timestamp: transactions.timestamp
  })
  .from(transactions)
  .innerJoin(tokens, eq(tokens.id, transactions.tokenId))
  .where(eq(tokens.address, address))
  .orderBy(transactions.timestamp);
}

export async function getTokenById(
  id: string, 
  transactionPage: number = 1, 
  transactionPageSize: number = 20
) {
  const offset = (transactionPage - 1) * transactionPageSize;

  const [token, transactionsResult, transactionCount, latestLiquidityEvent] = await Promise.all([
    db.select().from(tokens).where(eq(tokens.id, id)).limit(1),
    db.select().from(transactions)
      .where(eq(transactions.tokenId, id))
      .orderBy(desc(transactions.timestamp))
      .limit(transactionPageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(transactions)
      .where(eq(transactions.tokenId, id)),
    db.select().from(liquidityEvents)
      .where(eq(liquidityEvents.tokenId, id))
      .orderBy(desc(liquidityEvents.timestamp))
      .limit(1)
  ]);

  if (!token[0]) {
    return null;
  }

  const totalCount = transactionCount[0].count;

  return {
    ...token[0],
    latestLiquidityEvent: latestLiquidityEvent[0] || null,
    transactions: {
      data: transactionsResult,
      pagination: {
        currentPage: transactionPage,
        pageSize: transactionPageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / transactionPageSize)
      }
    }
  };
}

export async function getAllTokenAddresses() {
  return db.select({
    address: tokens.address,
    symbol: tokens.symbol
  }).from(tokens);
}