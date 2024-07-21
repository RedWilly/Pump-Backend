// transactionService.ts

import { db } from '../config/database';
import { transactions, tokens } from '../config/schema';
import { eq, desc, or, sql, and } from 'drizzle-orm';
import logger from '../utils/logger';

export async function createTransaction(data: {
  tokenId: string;
  chain: string;
  type: string;
  senderAddress: string;
  recipientAddress: string;
  ethAmount: string;
  tokenAmount: string;
  tokenPrice: string;
  txHash: string;
}) {
  const [newTransaction] = await db.insert(transactions).values({
    ...data,
    ethAmount: data.ethAmount.toString(),
    tokenAmount: data.tokenAmount.toString(),
    tokenPrice: data.tokenPrice.toString()
  }).returning();

  logger.info(`Transaction recorded: ${newTransaction.id} (${data.type}) for token ${data.tokenId} on chain ${data.chain}`);
  return newTransaction;
}

export async function getTransactionsByTokenId(chain: string, tokenId: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [transactionsResult, countResult] = await Promise.all([
    db.select()
      .from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        eq(transactions.tokenId, tokenId)
      ))
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        eq(transactions.tokenId, tokenId)
      ))
  ]);

  const totalCount = countResult[0].count;

  return {
    transactions: transactionsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentTransactions(chain: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [transactionsResult, countResult] = await Promise.all([
    db.select({
      id: transactions.id,
      tokenId: transactions.tokenId,
      type: transactions.type,
      senderAddress: transactions.senderAddress,
      recipientAddress: transactions.recipientAddress,
      ethAmount: transactions.ethAmount,
      tokenAmount: transactions.tokenAmount,
      txHash: transactions.txHash,
      timestamp: transactions.timestamp,
      tokenPrice: transactions.tokenPrice,
      token: {
        name: tokens.name,
        symbol: tokens.symbol
      }
    })
      .from(transactions)
      .leftJoin(tokens, and(
        eq(tokens.id, transactions.tokenId),
        eq(tokens.chain, transactions.chain)
      ))
      .where(eq(transactions.chain, chain))
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.chain, chain))
  ]);

  const totalCount = countResult[0].count;

  return {
    transactions: transactionsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTransactionsByAddress(chain: string, address: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [transactionsResult, countResult] = await Promise.all([
    db.select()
      .from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        or(
          eq(transactions.senderAddress, address),
          eq(transactions.recipientAddress, address)
        )
      ))
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(
        eq(transactions.chain, chain),
        or(
          eq(transactions.senderAddress, address),
          eq(transactions.recipientAddress, address)
        )
      ))
  ]);

  const totalCount = countResult[0].count;

  return {
    transactions: transactionsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTransactionByTxHash(chain: string, txHash: string) {
  const [transaction] = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.chain, chain),
      eq(transactions.txHash, txHash)
    ))
    .limit(1);
  return transaction || null;
}

export async function getTransactionVolume(chain: string, tokenId: string, timeframe: 'day' | 'week' | 'month') {
  let timeCondition;
  const now = new Date();

  switch (timeframe) {
    case 'day':
      timeCondition = sql`${transactions.timestamp} >= ${new Date(now.setDate(now.getDate() - 1))}`;
      break;
    case 'week':
      timeCondition = sql`${transactions.timestamp} >= ${new Date(now.setDate(now.getDate() - 7))}`;
      break;
    case 'month':
      timeCondition = sql`${transactions.timestamp} >= ${new Date(now.setMonth(now.getMonth() - 1))}`;
      break;
  }

  const [result] = await db.select({
    volume: sql<string>`SUM(CAST(${transactions.ethAmount} AS DECIMAL(78,0)))`.as('volume')
  })
    .from(transactions)
    .where(and(
      eq(transactions.chain, chain),
      eq(transactions.tokenId, tokenId),
      timeCondition
    ));

  return result.volume || '0';
}

export async function getTransactionCount(chain: string, tokenId: string, timeframe: 'day' | 'week' | 'month') {
  let timeCondition;
  const now = new Date();

  switch (timeframe) {
    case 'day':
      timeCondition = sql`${transactions.timestamp} >= ${new Date(now.setDate(now.getDate() - 1))}`;
      break;
    case 'week':
      timeCondition = sql`${transactions.timestamp} >= ${new Date(now.setDate(now.getDate() - 7))}`;
      break;
    case 'month':
      timeCondition = sql`${transactions.timestamp} >= ${new Date(now.setMonth(now.getMonth() - 1))}`;
      break;
  }

  const [result] = await db.select({
    count: sql<number>`count(*)`.as('count')
  })
    .from(transactions)
    .where(and(
      eq(transactions.chain, chain),
      eq(transactions.tokenId, tokenId),
      timeCondition
    ));

  return result.count || 0;
}

export async function getLatestTokenPrice(chain: string, tokenId: string) {
  const [latestTransaction] = await db.select({
    tokenPrice: transactions.tokenPrice
  })
    .from(transactions)
    .where(and(
      eq(transactions.chain, chain),
      eq(transactions.tokenId, tokenId)
    ))
    .orderBy(desc(transactions.timestamp))
    .limit(1);

  return latestTransaction ? latestTransaction.tokenPrice : null;
}

export async function getTokenPriceHistory(chain: string, tokenId: string, limit: number = 100) {
  return db.select({
    tokenPrice: transactions.tokenPrice,
    timestamp: transactions.timestamp
  })
    .from(transactions)
    .where(and(
      eq(transactions.chain, chain),
      eq(transactions.tokenId, tokenId)
    ))
    .orderBy(desc(transactions.timestamp))
    .limit(limit);
}