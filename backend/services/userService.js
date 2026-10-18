import { query } from "../config/db.js";

export const createUserProfile = async (user) => {
  const sql = `
    INSERT INTO users (email, name, role)
    VALUES ($1, $2, 'citizen')
    RETURNING *;
  `;
  const { rows } = await query(sql, [user.email, user.name || '']);
  return rows[0];
};