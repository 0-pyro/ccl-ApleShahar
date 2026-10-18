import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'apleshahar-jwt-production-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Registers a new user directly in PostgreSQL.
 */
export const registerUser = async ({ email, password, name, contact, ward_no, role = 'citizen' }) => {
  // Check if user already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) {
    throw new Error('A user with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const sql = `
    INSERT INTO users (email, password_hash, name, contact, ward_no, role)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, name, contact, ward_no, role, created_at;
  `;
  const result = await query(sql, [
    email.toLowerCase().trim(),
    passwordHash,
    name || '',
    contact || '',
    ward_no ? parseInt(ward_no, 10) : null,
    role.toLowerCase()
  ]);

  return result.rows[0];
};

/**
 * Authenticates user credentials and generates a signed JWT.
 * Returns response in the exact shape expected by the frontend.
 */
export const loginUser = async (email, password) => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const user = result.rows[0];

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      ward_no: user.ward_no,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  delete user.password_hash;

  return {
    session: {
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
    },
    user,
  };
};

/**
 * Retrieves a user profile by ID.
 */
export const getUserById = async (id) => {
  const result = await query(
    'SELECT id, email, name, contact, ward_no, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};