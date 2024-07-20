import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const liquidityEvents = pgTable('LiquidityEvent', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenId: uuid('tokenId').notNull(),
  ethAmount: varchar('ethAmount', { length: 256 }).notNull(),
  tokenAmount: varchar('tokenAmount', { length: 256 }).notNull(),
  txHash: varchar('txHash', { length: 256 }).notNull().unique(),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  tokenIdTimestampIndex: index('LiquidityEvent_tokenId_timestamp_idx').on(table.tokenId, table.timestamp),
  txHashIndex: index('LiquidityEvent_txHash_idx').on(table.txHash),
}));

export const tokens = pgTable('Token', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: varchar('address', { length: 256 }).notNull().unique(),
  creatorAddress: varchar('creatorAddress', { length: 256 }).notNull(),
  name: varchar('name', { length: 256 }).notNull(),
  symbol: varchar('symbol', { length: 256 }).notNull(),
  logo: varchar('logo', { length: 256 }).notNull(),
  description: varchar('description', { length: 1000 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  website: varchar('website', { length: 256 }),
  telegram: varchar('telegram', { length: 256 }),
  discord: varchar('discord', { length: 256 }),
  twitter: varchar('twitter', { length: 256 }),
  youtube: varchar('youtube', { length: 256 }),
}, (table) => ({
  addressIndex: index('Token_address_idx').on(table.address),
  addressCreatedAtIndex: index('Token_address_createdAt_idx').on(table.address, table.createdAt),
  createdAtIndex: index('Token_createdAt_idx').on(table.createdAt),
}));

export const transactions = pgTable('Transaction', {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenId: uuid('tokenId').notNull(),
    type: varchar('type', { length: 256 }).notNull(),
    senderAddress: varchar('senderAddress', { length: 256 }).notNull(),
    recipientAddress: varchar('recipientAddress', { length: 256 }).notNull(),
    ethAmount: varchar('ethAmount', { length: 256 }).notNull(),
    tokenAmount: varchar('tokenAmount', { length: 256 }).notNull(),
    txHash: varchar('txHash', { length: 256 }).notNull().unique(),
    timestamp: timestamp('timestamp').defaultNow(),
    tokenPrice: varchar('tokenPrice', { length: 256 }).notNull(),
  }, (table) => ({
    tokenIdTypeTimestampIndex: index('Transaction_tokenId_type_timestamp_idx').on(table.tokenId, table.type, table.timestamp),
    txHashIndex: index('Transaction_txHash_idx').on(table.txHash),
  }));