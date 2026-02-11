/**
 * Phase 7 Database Migration
 * Forensic Analysis
 *
 * New tables: forensic_reports, attack_timeline_events
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";
import logger from '../logger';

dotenv.config();

const phase7Schema = `
-- Table: forensic_reports
-- Stores full forensic analysis reports for compromised wallets
CREATE TABLE IF NOT EXISTS forensic_reports (
  id SERIAL PRIMARY KEY,
  report_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  attack_vector TEXT,
  first_compromise_at TIMESTAMPTZ,
  last_drain_at TIMESTAMPTZ,
  total_stolen NUMERIC DEFAULT 0,
  total_at_risk NUMERIC DEFAULT 0,
  threat_actors JSONB,
  affected_assets JSONB,
  executive_summary TEXT,
  recommendations JSONB,
  confidence_score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: attack_timeline_events
-- Chronological events within a forensic report
CREATE TABLE IF NOT EXISTS attack_timeline_events (
  id SERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES forensic_reports(report_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  signature TEXT,
  description TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  amount NUMERIC,
  token_mint TEXT,
  severity TEXT DEFAULT 'medium',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forensic_reports_wallet ON forensic_reports(wallet_address);
CREATE INDEX IF NOT EXISTS idx_forensic_reports_status ON forensic_reports(status);
CREATE INDEX IF NOT EXISTS idx_timeline_events_report ON attack_timeline_events(report_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_timestamp ON attack_timeline_events(report_id, timestamp);
`;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    logger.info("Running Phase 7 migration: Forensic Analysis...");

    await pool.query(phase7Schema);
    logger.info("Phase 7 tables created successfully");

    // Verify tables exist
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('forensic_reports', 'attack_timeline_events')
      ORDER BY table_name
    `);
    logger.info({ count: tables.rows.length, tables: tables.rows.map((r: any) => r.table_name) }, 'Verified Phase 7 tables');

    logger.info("Phase 7 migration completed successfully!");
  } catch (error) {
    logger.error({ err: error }, 'Phase 7 migration failed');
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error({ err }, 'Migration error');
  process.exit(1);
});
