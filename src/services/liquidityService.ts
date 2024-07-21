import { db } from '../config/database';
import { liquidityEvents, tokens } from '../config/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import logger from '../utils/logger';

export async function createLiquidityEvent(data: {
  tokenId: string;
  chain: string;
  ethAmount: string;
  tokenAmount: string;
  txHash: string;
}) {
  const [newEvent] = await db.insert(liquidityEvents).values({
    ...data,
    ethAmount: data.ethAmount.toString(),
    tokenAmount: data.tokenAmount.toString()
  }).returning();

  logger.info(`Liquidity event recorded: ${newEvent.id} for token ${data.tokenId} on chain ${data.chain}`);
  return newEvent;
}

export async function getLiquidityEventsByTokenId(chain: string, tokenId: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [eventsResult, countResult] = await Promise.all([
    db.select()
      .from(liquidityEvents)
      .where(and(
        eq(liquidityEvents.chain, chain),
        eq(liquidityEvents.tokenId, tokenId)
      ))
      .orderBy(desc(liquidityEvents.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(liquidityEvents)
      .where(and(
        eq(liquidityEvents.chain, chain),
        eq(liquidityEvents.tokenId, tokenId)
      ))
  ]);

  const totalCount = countResult[0].count;

  return {
    liquidityEvents: eventsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentLiquidityEvents(chain: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [eventsResult, countResult] = await Promise.all([
    db.select({
      id: liquidityEvents.id,
      tokenId: liquidityEvents.tokenId,
      ethAmount: liquidityEvents.ethAmount,
      tokenAmount: liquidityEvents.tokenAmount,
      txHash: liquidityEvents.txHash,
      timestamp: liquidityEvents.timestamp,
      token: {
        name: tokens.name,
        symbol: tokens.symbol
      }
    })
      .from(liquidityEvents)
      .leftJoin(tokens, and(
        eq(tokens.id, liquidityEvents.tokenId),
        eq(tokens.chain, liquidityEvents.chain)
      ))
      .where(eq(liquidityEvents.chain, chain))
      .orderBy(desc(liquidityEvents.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(liquidityEvents)
      .where(eq(liquidityEvents.chain, chain))
  ]);

  const totalCount = countResult[0].count;

  return {
    liquidityEvents: eventsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getLiquidityEventByTxHash(chain: string, txHash: string) {
  const [event] = await db.select()
    .from(liquidityEvents)
    .where(and(
      eq(liquidityEvents.chain, chain),
      eq(liquidityEvents.txHash, txHash)
    ))
    .limit(1);
  return event || null;
}

export async function getTotalLiquidityForToken(chain: string, tokenId: string) {
  const result = await db.select({
    totalEthAmount: sql<string>`SUM(CAST(${liquidityEvents.ethAmount} AS DECIMAL(78,0)))`,
    totalTokenAmount: sql<string>`SUM(CAST(${liquidityEvents.tokenAmount} AS DECIMAL(78,0)))`
  })
    .from(liquidityEvents)
    .where(and(
      eq(liquidityEvents.chain, chain),
      eq(liquidityEvents.tokenId, tokenId)
    ));

  return result[0] || { totalEthAmount: '0', totalTokenAmount: '0' };
}

export async function getLatestLiquidityEventForToken(chain: string, tokenId: string) {
  const [event] = await db.select()
    .from(liquidityEvents)
    .where(and(
      eq(liquidityEvents.chain, chain),
      eq(liquidityEvents.tokenId, tokenId)
    ))
    .orderBy(desc(liquidityEvents.timestamp))
    .limit(1);
  return event || null;
}

export async function getLiquidityHistory(chain: string, tokenId: string, limit: number = 100) {
  return db.select({
    ethAmount: liquidityEvents.ethAmount,
    tokenAmount: liquidityEvents.tokenAmount,
    timestamp: liquidityEvents.timestamp
  })
    .from(liquidityEvents)
    .where(and(
      eq(liquidityEvents.chain, chain),
      eq(liquidityEvents.tokenId, tokenId)
    ))
    .orderBy(desc(liquidityEvents.timestamp))
    .limit(limit);
}

export async function getTopLiquidityTokens(chain: string, limit: number = 10) {
  const subquery = db.select({
    tokenId: liquidityEvents.tokenId,
    totalLiquidity: sql<string>`SUM(CAST(${liquidityEvents.ethAmount} AS DECIMAL(78,0)))`.as('total_liquidity')
  })
    .from(liquidityEvents)
    .where(eq(liquidityEvents.chain, chain))
    .groupBy(liquidityEvents.tokenId)
    .as('liquidity_totals');

  return db.select({
    id: tokens.id,
    name: tokens.name,
    symbol: tokens.symbol,
    address: tokens.address,
    totalLiquidity: subquery.totalLiquidity
  })
    .from(tokens)
    .innerJoin(subquery, eq(tokens.id, subquery.tokenId))
    .where(eq(tokens.chain, chain))
    .orderBy(desc(subquery.totalLiquidity))
    .limit(limit);
}

export async function getLiquidityAddedInTimeframe(chain: string, tokenId: string, timeframe: 'day' | 'week' | 'month') {
  let timeCondition;
  const now = new Date();

  switch (timeframe) {
    case 'day':
      timeCondition = sql`${liquidityEvents.timestamp} >= ${new Date(now.setDate(now.getDate() - 1))}`;
      break;
    case 'week':
      timeCondition = sql`${liquidityEvents.timestamp} >= ${new Date(now.setDate(now.getDate() - 7))}`;
      break;
    case 'month':
      timeCondition = sql`${liquidityEvents.timestamp} >= ${new Date(now.setMonth(now.getMonth() - 1))}`;
      break;
  }

  const [result] = await db.select({
    ethAmount: sql<string>`SUM(CAST(${liquidityEvents.ethAmount} AS DECIMAL(78,0)))`,
    tokenAmount: sql<string>`SUM(CAST(${liquidityEvents.tokenAmount} AS DECIMAL(78,0)))`
  })
    .from(liquidityEvents)
    .where(and(
      eq(liquidityEvents.chain, chain),
      eq(liquidityEvents.tokenId, tokenId),
      timeCondition
    ));

  return result || { ethAmount: '0', tokenAmount: '0' };
}