const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function showAllTables() {
  try {
    const client = await pool.connect();
    
    // Query to get all table names
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
    `);
    const tables = result.rows.map(row => row.table_name);
    
    // Log all list of tables
    console.log('Tables in the database:');
    tables.forEach(table => {
      console.log(`- ${table}`);
    });

    for (const table of tables) {
      console.log(`\nData from table: ${table}`);
      const tableDataResult = await client.query(`SELECT * FROM ${table}`);
      console.table(tableDataResult.rows);
    }

    client.release();
  } catch (err) {
    console.error('Error: ', err);
  }
}

showAllTables().then(() => {
  pool.end();
});

//test 