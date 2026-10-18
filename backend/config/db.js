import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Build configuration: Supports both a full connection string (DATABASE_URL) or individual DB_* variables
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

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

export const query = (text, params) => pool.query(text, params);

/**
 * Automatically creates all tables on startup if they don't already exist.
 * This guarantees zero-touch migration when connecting to a fresh RDS instance.
 */
export async function initDb() {
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
  `;

  try {
    await pool.query(schemaSql);
    console.log('✅ PostgreSQL Schema verified: tables (users, complaints, facility_requests) ready.');
  } catch (err) {
    console.warn('⚠️ Database connection / schema auto-init deferred:', err.message);
    console.warn('   Ensure DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD are set correctly.');
  }
}

export default pool;
