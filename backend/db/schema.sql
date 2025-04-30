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

-- Dusting candidates table to store potential dust attack sources
CREATE TABLE IF NOT EXISTS dusting_candidates (
    id SERIAL PRIMARY KEY,
    address VARCHAR(44) UNIQUE NOT NULL,
    small_transfers_count INTEGER NOT NULL DEFAULT 0,
    unique_recipients_count INTEGER NOT NULL DEFAULT 0,
    unique_recipients TEXT[] NOT NULL DEFAULT '{}',
    timestamps BIGINT[] NOT NULL DEFAULT '{}',
    risk_score DECIMAL(5, 4) NOT NULL DEFAULT 0,
    temporal_pattern JSONB NOT NULL DEFAULT '{"burstCount": 0, "averageTimeBetweenTransfers": 0, "regularityScore": 0}',
    network_pattern JSONB NOT NULL DEFAULT '{"clusterSize": 0, "centralityScore": 0, "recipientOverlap": 0}',
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index on address for quick lookups
CREATE INDEX IF NOT EXISTS idx_dusting_candidates_address ON dusting_candidates (address);

-- Create index on risk score for quick lookups
CREATE INDEX IF NOT EXISTS idx_dusting_candidates_risk_score ON dusting_candidates (risk_score);

-- Create a view for high-risk addresses
CREATE OR REPLACE VIEW high_risk_addresses AS
SELECT address, risk_score, last_updated
FROM risk_analysis
WHERE risk_score >= 0.7
ORDER BY risk_score DESC;
