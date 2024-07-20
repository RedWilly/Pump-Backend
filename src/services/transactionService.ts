// transactionService.ts

import { db } from '../config/database';
import { transactions, tokens } from '../config/schema';
import { eq, desc, or, sql, and } from 'drizzle-orm';

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
  const [newTransaction] = await db.insert(transactions).values({
    ...data,
    ethAmount: data.ethAmount.toString(),
    tokenAmount: data.tokenAmount.toString(),
    tokenPrice: data.tokenPrice.toString()
  }).returning();
  return newTransaction;
}

export async function getTransactionsByTokenId(tokenId: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [transactionsResult, countResult] = await Promise.all([
    db.select()
      .from(transactions)
      .where(eq(transactions.tokenId, tokenId))
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.tokenId, tokenId))
  ]);

  const totalCount = countResult[0].count;

  return {
    transactions: transactionsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getRecentTransactions(page: number = 1, pageSize: number = 20) {
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
      .leftJoin(tokens, eq(tokens.id, transactions.tokenId))
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` }).from(transactions)
  ]);

  const totalCount = countResult[0].count;

  return {
    transactions: transactionsResult,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getTransactionsByAddress(address: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const [transactionsResult, countResult] = await Promise.all([
    db.select()
      .from(transactions)
      .where(or(
        eq(transactions.senderAddress, address),
        eq(transactions.recipientAddress, address)
      ))
      .orderBy(desc(transactions.timestamp))
      .limit(pageSize)
      .offset(offset),

    db.select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(or(
        eq(transactions.senderAddress, address),
        eq(transactions.recipientAddress, address)
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

export async function getTransactionByTxHash(txHash: string) {
  const [transaction] = await db.select()
    .from(transactions)
    .where(eq(transactions.txHash, txHash))
    .limit(1);
  return transaction || null;
}

export async function getTransactionVolume(tokenId: string, timeframe: 'day' | 'week' | 'month') {
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
      eq(transactions.tokenId, tokenId),
      timeCondition
    ));

  return result.volume || '0';
}

export async function getTransactionCount(tokenId: string, timeframe: 'day' | 'week' | 'month') {
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
      eq(transactions.tokenId, tokenId),
      timeCondition
    ));

  return result.count || 0;
}