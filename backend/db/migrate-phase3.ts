/**
 * Phase 3 Database Migration
 * Creates exchange coordination and freeze request tables
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const phase3Schema = `
-- Table: exchange_contacts
CREATE TABLE IF NOT EXISTS exchange_contacts (
  id SERIAL PRIMARY KEY,
  exchange_id TEXT UNIQUE NOT NULL,
  exchange_name TEXT NOT NULL,
  exchange_type TEXT DEFAULT 'cex',
  compliance_email TEXT,
  compliance_phone TEXT,
  emergency_email TEXT,
  api_endpoint TEXT,
  response_time_sla INTEGER DEFAULT 24,
  freeze_capability BOOLEAN DEFAULT TRUE,
  kyc_required BOOLEAN DEFAULT TRUE,
  min_freeze_amount NUMERIC DEFAULT 0,
  supported_tokens TEXT[],
  documentation_url TEXT,
  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_contacted_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  successful_freezes INTEGER DEFAULT 0,
  avg_response_time NUMERIC,
  success_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: freeze_requests_v2
CREATE TABLE IF NOT EXISTS freeze_requests_v2 (
  id SERIAL PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  trace_id TEXT NOT NULL,
  exchange_id TEXT NOT NULL,
  exchange_name TEXT NOT NULL,
  victim_wallet TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  deposit_signature TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_mint TEXT,
  token_symbol TEXT,
  status TEXT DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  evidence_package_id TEXT,
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  frozen_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  exchange_ticket_id TEXT,
  exchange_response TEXT,
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: evidence_packages
CREATE TABLE IF NOT EXISTS evidence_packages (
  id SERIAL PRIMARY KEY,
  package_id TEXT UNIQUE NOT NULL,
  trace_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  victim_wallet TEXT NOT NULL,
  victim_statement TEXT,
  incident_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  total_stolen_amount NUMERIC NOT NULL,
  token_mint TEXT,
  transaction_signatures JSONB NOT NULL,
  fund_flow_summary JSONB NOT NULL,
  exchange_deposits JSONB NOT NULL,
  blockchain_evidence JSONB NOT NULL,
  supporting_documents JSONB,
  hash_signature TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exchange_contacts_name ON exchange_contacts(exchange_name);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_trace ON freeze_requests_v2(trace_id);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_status ON freeze_requests_v2(status);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_priority ON freeze_requests_v2(priority);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_trace ON evidence_packages(trace_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_request ON evidence_packages(request_id);

-- Seed exchange contacts
INSERT INTO exchange_contacts (exchange_id, exchange_name, exchange_type, compliance_email, emergency_email, response_time_sla, freeze_capability, kyc_required, min_freeze_amount, is_verified) VALUES
('binance', 'Binance', 'cex', 'compliance@binance.com', 'security@binance.com', 24, true, true, 0.1, true),
('coinbase', 'Coinbase', 'cex', 'compliance@coinbase.com', 'security@coinbase.com', 24, true, true, 0.1, true),
('kraken', 'Kraken', 'cex', 'compliance@kraken.com', 'security@kraken.com', 48, true, true, 0.5, true),
('okx', 'OKX', 'cex', 'compliance@okx.com', 'security@okx.com', 24, true, true, 0.1, true),
('bybit', 'Bybit', 'cex', 'compliance@bybit.com', 'security@bybit.com', 24, true, true, 0.1, true),
('kucoin', 'KuCoin', 'cex', 'compliance@kucoin.com', 'security@kucoin.com', 48, true, true, 0.5, true),
('gate-io', 'Gate.io', 'cex', 'compliance@gate.io', 'security@gate.io', 48, true, true, 0.5, true),
('htx', 'HTX (Huobi)', 'cex', 'compliance@htx.com', 'security@htx.com', 48, true, true, 0.5, true),
('crypto-com', 'Crypto.com', 'cex', 'compliance@crypto.com', 'security@crypto.com', 24, true, true, 0.1, true),
('jupiter', 'Jupiter', 'dex', NULL, NULL, 72, false, false, 1.0, false),
('raydium', 'Raydium AMM', 'dex', NULL, NULL, 72, false, false, 1.0, false),
('orca', 'Orca Whirlpool', 'dex', NULL, NULL, 72, false, false, 1.0, false)
ON CONFLICT (exchange_id) DO NOTHING;
`;

async function runMigration() {
  console.log("Starting Phase 3 migration...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log("Connected to Neon PostgreSQL\n");

    console.log("Creating Phase 3 tables...\n");
    await client.query(phase3Schema);

    console.log("Phase 3 tables created successfully!\n");

    // Verify
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('exchange_contacts', 'freeze_requests_v2', 'evidence_packages')
      ORDER BY table_name
    `);

    console.log("Phase 3 tables:");
    tablesResult.rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check exchange contacts
    const contactsResult = await client.query(`SELECT COUNT(*) FROM exchange_contacts`);
    console.log(`\nExchange contacts seeded: ${contactsResult.rows[0].count}`);

    client.release();
    console.log("\n✓ Phase 3 migration complete!");
  } catch (error: any) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
