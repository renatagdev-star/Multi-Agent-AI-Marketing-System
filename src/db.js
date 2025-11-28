// src/db.js
import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;

// Neon connection string from env
const connectionString = process.env.NEON_DB_URL;

if (!connectionString) {
  throw new Error("Missing NEON_DB_URL in environment variables");
}

export const pool = new Pool({
  connectionString,
});

// Helper for simple queries
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}
