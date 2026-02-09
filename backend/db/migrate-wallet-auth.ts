/**
 * Wallet Auth Migration
 * Creates users and user_api_keys tables in the main database.
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";
import logger from '../logger';

dotenv.config();

const walletAuthSchema = `
-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Table: user_api_keys
CREATE TABLE IF NOT EXISTS user_api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  permissions TEXT[] DEFAULT ARRAY['wallet-check:read'],
  usage_limit INTEGER,
  current_usage INTEGER DEFAULT 0,
  ip_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  description TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_wallet ON user_api_keys(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_key ON user_api_keys(key);
`;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    logger.info("Running wallet auth migration: users & user_api_keys...");
    await pool.query(walletAuthSchema);
    logger.info("Wallet auth tables created successfully");

    // Verify
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'user_api_keys')
    `);
    logger.info({ tables: tables.rows.map(r => r.table_name) }, 'Verified tables');

    logger.info("Wallet auth migration completed successfully!");
  } catch (error) {
    logger.error({ err: error }, 'Wallet auth migration failed');
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error({ err }, 'Migration error');
  process.exit(1);
});
