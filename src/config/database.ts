import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import logger from '../utils/logger';

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });

export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    logger.info('Successfully connected to the database');
    client.release();
  } catch (err) {
    logger.error('Error connecting to the database:', err);
    throw err;
  }
}