-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create a schema for our dust detection system
CREATE SCHEMA IF NOT EXISTS dust_detector;

-- Create the transactions table with proper TimescaleDB compatibility
CREATE TABLE IF NOT EXISTS dust_transactions (
    id SERIAL,
    signature TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    slot BIGINT,
    success BOOLEAN DEFAULT TRUE,
    sender TEXT,
    recipient TEXT,
    amount DECIMAL(20, 9),
    fee DECIMAL(20, 9),
    token_type TEXT,
    token_address TEXT,
    is_potential_dust BOOLEAN DEFAULT FALSE,
    is_potential_poisoning BOOLEAN DEFAULT FALSE,
    risk_score DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Make the primary key a composite of signature AND timestamp
    PRIMARY KEY (signature, timestamp)
);

-- Create hypertable with time partitioning on timestamp column
SELECT create_hypertable('dust_transactions', 'timestamp', if_not_exists => TRUE);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dust_transactions_timestamp ON dust_transactions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dust_transactions_sender ON dust_transactions (sender);
CREATE INDEX IF NOT EXISTS idx_dust_transactions_recipient ON dust_transactions (recipient);
CREATE INDEX IF NOT EXISTS idx_dust_transactions_is_dust ON dust_transactions (is_potential_dust);
CREATE INDEX IF NOT EXISTS idx_dust_transactions_risk_score ON dust_transactions (risk_score DESC);

-- Risk analysis table to store detailed risk assessments
CREATE TABLE IF NOT EXISTS risk_analysis (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    risk_score DECIMAL(5, 4) NOT NULL,
    chain_analysis_data JSONB,
    trm_labs_data JSONB,
    temporal_pattern JSONB NOT NULL,
    network_pattern JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index on risk score for quick lookups
CREATE INDEX IF NOT EXISTS idx_risk_analysis_risk_score ON risk_analysis (risk_score);

-- Dusting attackers table to store potential dust attack sources
CREATE TABLE IF NOT EXISTS dusting_attackers (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    small_transfers_count INTEGER NOT NULL DEFAULT 0,
    unique_victims_count INTEGER NOT NULL DEFAULT 0,
    unique_victims TEXT[] NOT NULL DEFAULT '{}',
    timestamps BIGINT[] NOT NULL DEFAULT '{}',
    risk_score DECIMAL(5, 4) NOT NULL DEFAULT 0,
    wallet_age_days INTEGER,
    total_transaction_volume DECIMAL(20, 9),
    known_labels TEXT[],
    related_addresses TEXT[],
    previous_attack_patterns JSONB,
    time_patterns JSONB NOT NULL DEFAULT '{"hourlyDistribution": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "weekdayDistribution": [0,0,0,0,0,0,0], "burstDetection": {"burstThreshold": 300000, "burstWindows": []}}',
    temporal_pattern JSONB NOT NULL DEFAULT '{"burstCount": 0, "averageTimeBetweenTransfers": 0, "regularityScore": 0}',
    network_pattern JSONB NOT NULL DEFAULT '{"clusterSize": 0, "centralityScore": 0, "recipientOverlap": 0, "betweennessCentrality": 0}',
    behavioral_indicators JSONB NOT NULL DEFAULT '{"usesNewAccounts": false, "hasAbnormalFundingPattern": false, "targetsPremiumWallets": false, "usesScriptedTransactions": false}',
    ml_features JSONB,
    ml_prediction JSONB,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Dusting victims table to store addresses that have received dust transactions
CREATE TABLE IF NOT EXISTS dusting_victims (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    dust_transactions_count INTEGER NOT NULL DEFAULT 0,
    unique_attackers_count INTEGER NOT NULL DEFAULT 0,
    unique_attackers TEXT[] NOT NULL DEFAULT '{}',
    timestamps BIGINT[] NOT NULL DEFAULT '{}',
    risk_score DECIMAL(5, 4) NOT NULL DEFAULT 0,
    wallet_age_days INTEGER,
    wallet_value_estimate DECIMAL(20, 9),
    time_patterns JSONB NOT NULL DEFAULT '{"hourlyDistribution": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "weekdayDistribution": [0,0,0,0,0,0,0], "burstDetection": {"burstThreshold": 300000, "burstWindows": []}}',
    vulnerability_assessment JSONB NOT NULL DEFAULT '{"walletActivity": "low", "assetValue": "low", "previousInteractions": false, "riskExposure": 0}',
    ml_features JSONB,
    ml_prediction JSONB,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for dusting attackers
CREATE INDEX IF NOT EXISTS idx_dusting_attackers_address ON dusting_attackers (address);
CREATE INDEX IF NOT EXISTS idx_dusting_attackers_risk_score ON dusting_attackers (risk_score);
CREATE INDEX IF NOT EXISTS idx_dusting_attackers_last_updated ON dusting_attackers (last_updated DESC);

-- Create indexes for dusting victims
CREATE INDEX IF NOT EXISTS idx_dusting_victims_address ON dusting_victims (address);
CREATE INDEX IF NOT EXISTS idx_dusting_victims_risk_score ON dusting_victims (risk_score);
CREATE INDEX IF NOT EXISTS idx_dusting_victims_last_updated ON dusting_victims (last_updated DESC);

-- Dusting candidates table to store potential dusting sources
CREATE TABLE IF NOT EXISTS dusting_candidates (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    risk_score DECIMAL(5, 4) NOT NULL DEFAULT 0,
    detection_count INTEGER NOT NULL DEFAULT 0,
    last_detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for dusting candidates
CREATE INDEX IF NOT EXISTS idx_dusting_candidates_address ON dusting_candidates (address);
CREATE INDEX IF NOT EXISTS idx_dusting_candidates_risk_score ON dusting_candidates (risk_score);

-- Add time-series partitioning for better query performance
SELECT create_hypertable('dust_transactions', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);

-- Create materialized views for common analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS dust_attack_daily_summary AS
SELECT 
  date_trunc('day', timestamp) AS day,
  COUNT(DISTINCT sender) AS unique_attackers,
  COUNT(DISTINCT recipient) AS unique_victims,
  COUNT(*) AS total_dust_transactions,
  AVG(amount) AS avg_dust_amount
FROM dust_transactions
WHERE is_potential_dust = true
GROUP BY 1
ORDER BY 1;

-- Create materialized view for attacker patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS attacker_pattern_summary AS
SELECT
  address,
  risk_score,
  small_transfers_count,
  unique_victims_count,
  (temporal_pattern->>'regularityScore')::float AS regularity_score,
  (network_pattern->>'centralityScore')::float AS centrality_score,
  (behavioral_indicators->>'usesScriptedTransactions')::boolean AS uses_scripts,
  last_updated
FROM dusting_attackers
WHERE risk_score >= 0.5
ORDER BY risk_score DESC;

-- Create materialized view for victim exposure
CREATE MATERIALIZED VIEW IF NOT EXISTS victim_exposure_summary AS
SELECT
  address,
  risk_score,
  dust_transactions_count,
  unique_attackers_count,
  (vulnerability_assessment->>'riskExposure')::float AS risk_exposure,
  (vulnerability_assessment->>'walletActivity')::text AS wallet_activity,
  (vulnerability_assessment->>'assetValue')::text AS asset_value,
  last_updated
FROM dusting_victims
WHERE risk_score >= 0.3
ORDER BY risk_score DESC;

-- Create index for common query patterns
CREATE INDEX IF NOT EXISTS idx_dust_transactions_timestamp_amount ON dust_transactions (timestamp, amount)
WHERE is_potential_dust = true;

-- Create a function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_dust_analysis_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW dust_attack_daily_summary;
  REFRESH MATERIALIZED VIEW attacker_pattern_summary;
  REFRESH MATERIALIZED VIEW victim_exposure_summary;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a view for high-risk addresses
CREATE OR REPLACE VIEW high_risk_addresses AS
SELECT address, risk_score, last_updated
FROM risk_analysis
WHERE risk_score >= 0.7
ORDER BY risk_score DESC;
