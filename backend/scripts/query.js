import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'apleshahar',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    };

const pool = new Pool(poolConfig);

const sql = process.argv.slice(2).join(' ') || 'SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\';';

async function executeQuery() {
  const client = await pool.connect();
  try {
    const res = await client.query(sql);
    console.log(`\nQuery: ${sql}`);
    console.log(`Rows returned: ${res.rowCount}\n`);
    if (res.rows.length > 0) {
      console.table(res.rows);
    }
  } catch (err) {
    console.error('Database query error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

executeQuery();
