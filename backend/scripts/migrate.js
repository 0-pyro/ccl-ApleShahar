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

const schemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    contact VARCHAR(50),
    ward_no INTEGER,
    role VARCHAR(50) DEFAULT 'citizen',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    citizen_id INTEGER REFERENCES users(id),
    image_link TEXT NOT NULL,
    prob_description TEXT NOT NULL,
    ward INTEGER NOT NULL,
    location_coords TEXT,
    issue_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    estimated_time VARCHAR(100),
    resolve_description TEXT,
    resolve_image TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS facility_requests (
    id SERIAL PRIMARY KEY,
    citizen_id INTEGER REFERENCES users(id),
    facility_type VARCHAR(100) NOT NULL,
    request_reason TEXT NOT NULL,
    ward INTEGER NOT NULL,
    image_link TEXT,
    location_coords TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reject_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexing for high-performance query execution
  CREATE INDEX IF NOT EXISTS idx_complaints_ward ON complaints(ward);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

async function runMigration() {
  console.log('[Migration] Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    console.log('[Migration] Executing schema DDL and indexes...');
    await client.query(schemaSql);
    console.log('[Migration] Schema migration completed successfully: tables (users, complaints, facility_requests) and indexes verified.');
  } catch (err) {
    console.error('[Migration] Failed to execute database migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
