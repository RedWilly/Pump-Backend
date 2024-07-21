import logger from '../utils/logger';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../config/database';
import { tokens, transactions, liquidityEvents } from '../config/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

export async function createToken(data: {
  chain: string;
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

  logger.info(`Token created: ${token.id} (${token.name}) on chain ${data.chain}`);
  return token;
}

export async function updateToken(chain: string, address: string, data: {
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
    .where(and(
      eq(tokens.chain, chain),
      eq(tokens.address, address)
    ))
    .returning();
  logger.info(`Token updated: ${tokens.id}`);
  return updatedToken;
}

export async function getTokenByAddress(chain: string, address: string) {
  const [token] = await db.select()
    .from(tokens)
    .where(and(
      eq(tokens.chain, chain),
      eq(tokens.address, address)
    ))
    .limit(1);
  return token;
}

export async function getAllTokens(chain: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;
  
  const [tokensResult, countResult] = await Promise.all([
    db.select()
      .from(tokens)
      .where(eq(tokens.chain, chain))
      .orderBy(desc(tokens.createdAt))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(eq(tokens.chain, chain))
  ]);

  const totalCount = countResult[0].count;

  return {
    tokens: tokensResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentTokens(chain: string, page: number = 1, pageSize: number = 20, hours: number = 1) {
  const offset = (page - 1) * pageSize;
  const oneHourAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [tokensResult, countResult] = await Promise.all([
    db.select()
      .from(tokens)
      .where(and(
        eq(tokens.chain, chain),
        gte(tokens.createdAt, oneHourAgo)
      ))
      .orderBy(desc(tokens.createdAt))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(and(
        eq(tokens.chain, chain),
        gte(tokens.createdAt, oneHourAgo)
      ))
  ]);

  const totalCount = countResult[0].count;

  return {
    tokens: tokensResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTokensWithLiquidityEvents(chain: string, page: number = 1, pageSize: number = 20) {
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
        eq(tokens.chain, chain),
        eq(
          latestLiquidityEvent.id,
          db.select({ id: liquidityEvents.id })
            .from(liquidityEvents)
            .where(and(
              eq(liquidityEvents.tokenId, tokens.id),
              eq(liquidityEvents.chain, chain)
            ))
            .orderBy(desc(liquidityEvents.timestamp))
            .limit(1)
        )
      )
    )
    .where(and(
      eq(tokens.chain, chain),
      sql`${latestLiquidityEvent.id} IS NOT NULL`
    ))
    .orderBy(desc(tokens.createdAt))
    .limit(pageSize)
    .offset(offset),

    db.select({ count: sql<number>`count(DISTINCT ${tokens.id})` })
      .from(tokens)
      .innerJoin(liquidityEvents, and(
        eq(tokens.id, liquidityEvents.tokenId),
        eq(tokens.chain, chain),
        eq(liquidityEvents.chain, chain)
      ))
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
  chain: string,
  address: string,
  transactionPage: number = 1,
  transactionPageSize: number = 20
) {
  const offset = (transactionPage - 1) * transactionPageSize;

  const [token, transactionsResult, transactionCount] = await Promise.all([
    db.select().from(tokens).where(and(
      eq(tokens.chain, chain),
      eq(tokens.address, address)
    )).limit(1),
    db.select().from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        eq(transactions.tokenId, sql`(SELECT id FROM ${tokens} WHERE address = ${address} AND chain = ${chain})`)
      ))
      .orderBy(desc(transactions.timestamp))
      .limit(transactionPageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        eq(transactions.tokenId, sql`(SELECT id FROM ${tokens} WHERE address = ${address} AND chain = ${chain})`)
      ))
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

export async function getTokenHistoricalPrices(chain: string, address: string) {
  return db.select({
    tokenPrice: transactions.tokenPrice,
    timestamp: transactions.timestamp
  })
  .from(transactions)
  .innerJoin(tokens, and(
    eq(tokens.id, transactions.tokenId),
    eq(tokens.chain, chain)
  ))
  .where(and(
    eq(tokens.address, address),
    eq(transactions.chain, chain)
  ))
  .orderBy(transactions.timestamp);
}

export async function getTokenById(
  chain: string,
  id: string, 
  transactionPage: number = 1, 
  transactionPageSize: number = 20
) {
  const offset = (transactionPage - 1) * transactionPageSize;

  const [token, transactionsResult, transactionCount, latestLiquidityEvent] = await Promise.all([
    db.select().from(tokens).where(and(
      eq(tokens.chain, chain),
      eq(tokens.id, id)
    )).limit(1),
    db.select().from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        eq(transactions.tokenId, id)
      ))
      .orderBy(desc(transactions.timestamp))
      .limit(transactionPageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        eq(transactions.tokenId, id)
      )),
    db.select().from(liquidityEvents)
      .where(and(
        eq(liquidityEvents.chain, chain),
        eq(liquidityEvents.tokenId, id)
      ))
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

export async function getAllTokenAddresses(chain: string) {
  return db.select({
    address: tokens.address,
    symbol: tokens.symbol
  })
  .from(tokens)
  .where(eq(tokens.chain, chain));
}