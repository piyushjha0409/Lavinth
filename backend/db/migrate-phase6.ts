/**
 * Phase 6 Database Migration
 * Threat Intelligence Data Source Integration
 *
 * New tables: threat_intel_sources, threat_intel_sync_log, address_entity_labels
 * Alter: known_malicious_delegates (add external_sources, last_verified_at, confidence_score)
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";
import logger from '../logger';

dotenv.config();

const phase6Schema = `
-- Table: threat_intel_sources
-- Tracks each external data source integration
CREATE TABLE IF NOT EXISTS threat_intel_sources (
  id SERIAL PRIMARY KEY,
  source_id TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'never',
  last_sync_error TEXT,
  total_addresses INTEGER DEFAULT 0,
  sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: threat_intel_sync_log
-- Audit log of every sync operation
CREATE TABLE IF NOT EXISTS threat_intel_sync_log (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES threat_intel_sources(source_id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress',
  addresses_found INTEGER DEFAULT 0,
  addresses_new INTEGER DEFAULT 0,
  addresses_updated INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: address_entity_labels
-- Cached Arkham entity lookups (address -> entity name/type with TTL)
CREATE TABLE IF NOT EXISTS address_entity_labels (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  entity_name TEXT,
  entity_type TEXT,
  entity_id TEXT,
  chain TEXT DEFAULT 'solana',
  source TEXT DEFAULT 'arkham',
  cached_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  raw_response JSONB
);

-- Create index on address_entity_labels for fast lookups
CREATE INDEX IF NOT EXISTS idx_address_entity_labels_address ON address_entity_labels(address);
CREATE INDEX IF NOT EXISTS idx_address_entity_labels_expires ON address_entity_labels(expires_at);

-- Create index on threat_intel_sync_log
CREATE INDEX IF NOT EXISTS idx_threat_intel_sync_log_source ON threat_intel_sync_log(source_id);

-- Table: malicious_domains
-- Tracks known scam/phishing domains from community lists
CREATE TABLE IF NOT EXISTS malicious_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'scam',
  external_sources TEXT[] DEFAULT '{}',
  first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_malicious_domains_domain ON malicious_domains(domain);

-- Alter known_malicious_delegates to add threat intel metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'known_malicious_delegates' AND column_name = 'external_sources'
  ) THEN
    ALTER TABLE known_malicious_delegates ADD COLUMN external_sources TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'known_malicious_delegates' AND column_name = 'last_verified_at'
  ) THEN
    ALTER TABLE known_malicious_delegates ADD COLUMN last_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'known_malicious_delegates' AND column_name = 'confidence_score'
  ) THEN
    ALTER TABLE known_malicious_delegates ADD COLUMN confidence_score NUMERIC DEFAULT 0.5;
  END IF;
END $$;
`;

const seedSources = `
-- Seed threat intel sources
INSERT INTO threat_intel_sources (source_id, source_name, source_type, source_url, is_enabled)
VALUES
  ('allenhark', 'AllenHark Scammer Database', 'community_list', 'https://allenhark.com/blacklist.jsonl', true),
  ('phantom-blocklist', 'Phantom NFT Blocklist', 'community_list', 'https://raw.githubusercontent.com/phantom/blocklist/master/nft-blocklist.yaml', true),
  ('goplus', 'GoPlus Security API', 'address_lookup', 'https://api.gopluslabs.io/api/v1/address_security', true),
  ('solana-safety-101-domains', 'Solana Safety 101 Domains', 'domain_list', 'https://github.com/The-Great-Ape/solana-safety-101', true),
  ('phishdestroy', 'PhishDestroy Destroylist', 'domain_list', 'https://github.com/phishdestroy/destroylist', true),
  ('arkham', 'Arkham Intelligence', 'entity_resolver', 'https://api.arkhamintelligence.com', true),
  ('helius', 'Helius Enhanced API', 'transaction_parser', 'https://api.helius.xyz', true)
ON CONFLICT (source_id) DO NOTHING;
`;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    logger.info("Running Phase 6 migration: Threat Intelligence...");

    // Create tables and alter existing
    await pool.query(phase6Schema);
    logger.info("Phase 6 tables created / altered successfully");

    // Seed sources
    await pool.query(seedSources);
    logger.info("Threat intel sources seeded");

    // Clean up stale sources and ensure new ones exist
    // Delete sync logs first (FK constraint), then stale sources
    await pool.query(`DELETE FROM threat_intel_sync_log WHERE source_id IN ('blowfish', 'solana-safety-101', 'haveibeendrained')`);
    await pool.query(`DELETE FROM threat_intel_sources WHERE source_id IN ('blowfish', 'solana-safety-101', 'haveibeendrained')`);
    await pool.query(`
      INSERT INTO threat_intel_sources (source_id, source_name, source_type, source_url, is_enabled)
      VALUES
        ('allenhark', 'AllenHark Scammer Database', 'community_list', 'https://allenhark.com/blacklist.jsonl', true),
        ('phantom-blocklist', 'Phantom NFT Blocklist', 'community_list', 'https://raw.githubusercontent.com/phantom/blocklist/master/nft-blocklist.yaml', true),
        ('goplus', 'GoPlus Security API', 'address_lookup', 'https://api.gopluslabs.io/api/v1/address_security', true),
        ('solana-safety-101-domains', 'Solana Safety 101 Domains', 'domain_list', 'https://github.com/The-Great-Ape/solana-safety-101', true),
        ('phishdestroy', 'PhishDestroy Destroylist', 'domain_list', 'https://github.com/phishdestroy/destroylist', true)
      ON CONFLICT (source_id) DO NOTHING
    `);
    logger.info("Stale sources removed, new sources ensured");

    // Verify
    const sources = await pool.query("SELECT source_id, source_name, source_type FROM threat_intel_sources");
    logger.info({ count: sources.rows.length }, 'Verified threat intel sources');
    sources.rows.forEach((row) => {
      logger.info({ sourceId: row.source_id, sourceName: row.source_name, sourceType: row.source_type }, 'Threat intel source');
    });

    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'known_malicious_delegates'
      AND column_name IN ('external_sources', 'last_verified_at', 'confidence_score')
    `);
    logger.info({ count: cols.rows.length, expected: 3 }, 'Verified new columns on known_malicious_delegates');

    logger.info("Phase 6 migration completed successfully!");
  } catch (error) {
    logger.error({ err: error }, 'Phase 6 migration failed');
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error({ err }, 'Migration error');
  process.exit(1);
});
