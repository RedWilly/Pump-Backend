import { db } from '../config/database';
import { liquidityEvents, tokens } from '../config/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function createLiquidityEvent(data: {
  tokenId: string;
  ethAmount: string;
  tokenAmount: string;
  txHash: string;
}) {
  const [newEvent] = await db.insert(liquidityEvents).values({
    ...data,
    ethAmount: data.ethAmount.toString(),
    tokenAmount: data.tokenAmount.toString()
  }).returning();
  return newEvent;
}

export async function getLiquidityEventsByTokenId(tokenId: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [eventsResult, countResult] = await Promise.all([
    db.select()
      .from(liquidityEvents)
      .where(eq(liquidityEvents.tokenId, tokenId))
      .orderBy(desc(liquidityEvents.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(liquidityEvents)
      .where(eq(liquidityEvents.tokenId, tokenId))
  ]);

  const totalCount = countResult[0].count;

  return {
    liquidityEvents: eventsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentLiquidityEvents(page: number = 1, pageSize: number = 20) {
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
      .leftJoin(tokens, eq(tokens.id, liquidityEvents.tokenId))
      .orderBy(desc(liquidityEvents.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` }).from(liquidityEvents)
  ]);

  const totalCount = countResult[0].count;

  return {
    liquidityEvents: eventsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getLiquidityEventByTxHash(txHash: string) {
  const [event] = await db.select()
    .from(liquidityEvents)
    .where(eq(liquidityEvents.txHash, txHash))
    .limit(1);
  return event || null;
}

export async function getTotalLiquidityForToken(tokenId: string) {
  const result = await db.select({
    totalEthAmount: sql<string>`SUM(CAST(${liquidityEvents.ethAmount} AS DECIMAL(78,0)))`,
    totalTokenAmount: sql<string>`SUM(CAST(${liquidityEvents.tokenAmount} AS DECIMAL(78,0)))`
  })
    .from(liquidityEvents)
    .where(eq(liquidityEvents.tokenId, tokenId));

  return result[0] || { totalEthAmount: '0', totalTokenAmount: '0' };
}

export async function getLatestLiquidityEventForToken(tokenId: string) {
  const [event] = await db.select()
    .from(liquidityEvents)
    .where(eq(liquidityEvents.tokenId, tokenId))
    .orderBy(desc(liquidityEvents.timestamp))
    .limit(1);
  return event || null;
}