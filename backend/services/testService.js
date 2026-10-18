import { query } from "../config/db.js";

export const getTestData = async () => {
  try {
    const { rows } = await query("SELECT 1 AS status;");
    return rows;
  } catch (err) {
    return [{ status: "Database not connected yet", error: err.message }];
  }
};