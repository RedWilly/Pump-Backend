import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'prisma_to_drizzle_migration.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);