-- ============================================
-- WalletShield Recovery Tables (Phase 1)
-- ============================================

-- Table: token_approvals
-- Tracks SPL token delegate approvals for wallets
CREATE TABLE IF NOT EXISTS token_approvals (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  token_account TEXT NOT NULL,
  delegate_address TEXT NOT NULL,
  delegated_amount NUMERIC,
  is_unlimited BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT 0,
  risk_factors JSONB,
  delegate_label TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  revoke_signature TEXT,
  status TEXT DEFAULT 'active',
  UNIQUE(wallet_address, token_account, delegate_address)
);

-- Table: known_malicious_delegates
-- Database of known malicious delegate addresses (drainers, scams)
CREATE TABLE IF NOT EXISTS known_malicious_delegates (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  label TEXT,
  category TEXT,
  reported_losses NUMERIC DEFAULT 0,
  victim_count INTEGER DEFAULT 0,
  first_reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ,
  source TEXT,
  metadata JSONB
);

-- Table: recovery_sessions
-- Tracks emergency recovery sessions
CREATE TABLE IF NOT EXISTS recovery_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'initiated',
  initiated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  total_approvals_found INTEGER DEFAULT 0,
  approvals_revoked INTEGER DEFAULT 0,
  revoke_signatures TEXT[],
  assets_at_risk NUMERIC,
  assets_saved NUMERIC,
  assets_lost NUMERIC,
  error_log JSONB,
  metadata JSONB
);

-- Table: wallet_security_profiles
-- Cached security profile for wallets
CREATE TABLE IF NOT EXISTS wallet_security_profiles (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  total_approvals INTEGER DEFAULT 0,
  high_risk_approvals INTEGER DEFAULT 0,
  unlimited_approvals INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  security_score INTEGER,
  risk_level TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_approvals_wallet ON token_approvals(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_approvals_delegate ON token_approvals(delegate_address);
CREATE INDEX IF NOT EXISTS idx_token_approvals_status ON token_approvals(status);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_wallet ON recovery_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_security_profiles_address ON wallet_security_profiles(wallet_address);

-- ============================================
-- WalletShield Recovery Tables (Phase 2)
-- Compromise Detection & Fund Tracking
-- ============================================

-- Table: known_exchanges
-- Database of known centralized exchange deposit addresses
CREATE TABLE IF NOT EXISTS known_exchanges (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  exchange_name TEXT NOT NULL,
  exchange_type TEXT, -- 'cex', 'dex', 'bridge', 'mixer'
  is_verified BOOLEAN DEFAULT FALSE,
  contact_info JSONB, -- For freeze requests
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: known_bridges
-- Database of known bridge contract addresses
CREATE TABLE IF NOT EXISTS known_bridges (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  bridge_name TEXT NOT NULL,
  destination_chains TEXT[], -- ['ethereum', 'bsc', 'polygon']
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: monitored_wallets
-- Wallets being actively monitored for suspicious activity
CREATE TABLE IF NOT EXISTS monitored_wallets (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  user_id TEXT, -- Owner who registered monitoring
  monitoring_level TEXT DEFAULT 'standard', -- 'standard', 'high', 'critical'
  alert_channels JSONB, -- {email: '', discord: '', webhook: ''}
  baseline_balance NUMERIC,
  last_known_balance NUMERIC,
  last_activity_at TIMESTAMPTZ,
  is_compromised BOOLEAN DEFAULT FALSE,
  compromise_detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: wallet_transactions
-- Recent transactions for monitored wallets
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  signature TEXT UNIQUE NOT NULL,
  transaction_type TEXT, -- 'transfer_out', 'transfer_in', 'swap', 'approval', 'revoke'
  amount NUMERIC,
  token_mint TEXT,
  counterparty TEXT,
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicion_reasons TEXT[],
  risk_score INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: compromise_alerts
-- Alerts generated when compromise is detected
CREATE TABLE IF NOT EXISTS compromise_alerts (
  id SERIAL PRIMARY KEY,
  alert_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'large_outflow', 'rapid_drain', 'suspicious_approval', 'known_drainer'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: fund_traces
-- Master table for fund tracing operations
CREATE TABLE IF NOT EXISTS fund_traces (
  id SERIAL PRIMARY KEY,
  trace_id TEXT UNIQUE NOT NULL,
  source_wallet TEXT NOT NULL,
  initial_amount NUMERIC NOT NULL,
  token_mint TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'partial', 'funds_recovered', 'funds_lost'
  current_depth INTEGER DEFAULT 0,
  recovery_probability NUMERIC DEFAULT 0,
  total_tracked NUMERIC DEFAULT 0,
  total_recoverable NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: fund_trace_nodes
-- Nodes in the fund tracking graph
CREATE TABLE IF NOT EXISTS fund_trace_nodes (
  id SERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  address TEXT NOT NULL,
  node_type TEXT NOT NULL, -- 'source', 'intermediate', 'exchange', 'bridge', 'mixer', 'drainer', 'unknown'
  label TEXT,
  total_received NUMERIC DEFAULT 0,
  total_sent NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trace_id, address)
);

-- Table: fund_trace_edges
-- Edges (transactions) in the fund tracking graph
CREATE TABLE IF NOT EXISTS fund_trace_edges (
  id SERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_mint TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  hop_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trace_id, signature)
);

-- Table: freeze_requests
-- Track requests sent to exchanges for fund freezing
CREATE TABLE IF NOT EXISTS freeze_requests (
  id SERIAL PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  trace_id TEXT NOT NULL,
  exchange_name TEXT NOT NULL,
  exchange_address TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  amount NUMERIC,
  token_mint TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'ready', 'submitted', 'acknowledged', 'frozen', 'rejected', 'expired'
  submitted_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  response_notes TEXT,
  evidence_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Phase 2
CREATE INDEX IF NOT EXISTS idx_monitored_wallets_address ON monitored_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_timestamp ON wallet_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_compromise_alerts_wallet ON compromise_alerts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_fund_traces_source ON fund_traces(source_wallet);
CREATE INDEX IF NOT EXISTS idx_fund_traces_trace_id ON fund_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_known_exchanges_address ON known_exchanges(address);
CREATE INDEX IF NOT EXISTS idx_fund_trace_nodes_trace ON fund_trace_nodes(trace_id);
CREATE INDEX IF NOT EXISTS idx_fund_trace_edges_trace ON fund_trace_edges(trace_id);

-- Table: notification_queue
-- Queue for outbound notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  notification_id TEXT UNIQUE NOT NULL,
  alert_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT NOT NULL,
  metadata JSONB,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: alert_subscriptions
-- User subscriptions for wallet alerts
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id SERIAL PRIMARY KEY,
  subscription_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  user_id TEXT,
  channels JSONB NOT NULL,
  severity_filter TEXT[] DEFAULT ARRAY['medium', 'high', 'critical'],
  alert_types TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notification system
CREATE INDEX IF NOT EXISTS idx_notification_queue_wallet ON notification_queue(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_wallet ON alert_subscriptions(wallet_address);

-- ============================================
-- Seed Data: Known Solana Exchanges
-- ============================================
INSERT INTO known_exchanges (address, exchange_name, exchange_type, is_verified) VALUES
-- Binance
('5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', 'Binance', 'cex', true),
('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'Binance Hot Wallet', 'cex', true),
-- Coinbase
('H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS', 'Coinbase', 'cex', true),
('GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE', 'Coinbase Custody', 'cex', true),
-- FTX (historical)
('2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm', 'FTX (Defunct)', 'cex', true),
-- Kraken
('GXMaB73zk5dS5Pd7QmeYw5kcwBrgP48qrb9p4JLfSqk8', 'Kraken', 'cex', true),
-- OKX
('5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD', 'OKX', 'cex', true),
-- Bybit
('AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2', 'Bybit', 'cex', true),
-- KuCoin
('BmFdpraQhkiDQE6SnfG5omcA1VwzqfXrwtNYBwWTymy6', 'KuCoin', 'cex', true),
-- Gate.io
('u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w', 'Gate.io', 'cex', true),
-- Huobi/HTX
('88xTWZMeKfiTgbfEmPLdsUCQcZinwUfk25EBQZ21XMAZ', 'HTX (Huobi)', 'cex', true),
-- Crypto.com
('6FEVkH17P9y8Q9aCkDdPcMDjvj7SVxrTETaYEm8f51Jy', 'Crypto.com', 'cex', true),
-- Jupiter Aggregator (DEX)
('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', 'Jupiter', 'dex', true),
-- Raydium
('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', 'Raydium AMM', 'dex', true),
-- Orca
('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', 'Orca Whirlpool', 'dex', true),
-- Marinade
('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD', 'Marinade Finance', 'dex', true)
ON CONFLICT (address) DO NOTHING;

-- ============================================
-- Seed Data: Known Solana Bridges
-- ============================================
INSERT INTO known_bridges (address, bridge_name, destination_chains, is_active) VALUES
-- Wormhole
('worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth', 'Wormhole', ARRAY['ethereum', 'bsc', 'polygon', 'avalanche', 'fantom', 'arbitrum', 'optimism'], true),
('WnFt12ZrnzZrFZkt2xsNsaNWoQribnuQ5B5FrDbwDhD', 'Wormhole Token Bridge', ARRAY['ethereum', 'bsc', 'polygon'], true),
-- Allbridge
('a]br1oxQe4cHgQeT1jkgzNuPQxhLfTyiV9zCpM8PQZJ', 'Allbridge Core', ARRAY['ethereum', 'bsc', 'polygon', 'avalanche'], true),
-- Portal (Wormhole)
('Portal1111111111111111111111111111111111111', 'Portal Bridge', ARRAY['ethereum', 'terra', 'bsc'], true),
-- deBridge
('DEbrdGj3HsRgiAQeC8LJP6DPWwrzDhLH1VBKu9hEYyqB', 'deBridge', ARRAY['ethereum', 'bsc', 'polygon', 'arbitrum'], true),
-- Mayan Finance
('8LPjGDbxhW4G2Q8S6FvdvUdfGWssgtqmvsc63bwNFA7E', 'Mayan Finance', ARRAY['ethereum', 'bsc', 'polygon', 'avalanche'], true),
-- LiFi
('LiFi11111111111111111111111111111111111111', 'LiFi Bridge', ARRAY['ethereum', 'arbitrum', 'optimism', 'polygon'], true)
ON CONFLICT (address) DO NOTHING;

-- ============================================
-- Seed Data: Known Malicious Addresses
-- ============================================
INSERT INTO known_malicious_delegates (address, label, category, source) VALUES
-- Known drainer contracts (examples - real addresses should be researched)
('DrainerExample1111111111111111111111111111', 'NFT Drainer v1', 'drainer', 'community_report'),
('DrainerExample2222222222222222222222222222', 'Token Drainer', 'drainer', 'community_report'),
('PhishingWallet111111111111111111111111111', 'Phishing Campaign Wallet', 'phishing', 'security_research'),
('ScamNFT111111111111111111111111111111111', 'Fake NFT Mint', 'scam', 'community_report')
ON CONFLICT (address) DO NOTHING;

-- ============================================
-- WalletShield Recovery Tables (Phase 3)
-- Exchange Coordination & Freeze Requests
-- ============================================

-- Table: exchange_contacts
-- Contact information for exchange compliance teams
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
-- Enhanced freeze request tracking
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
-- Compiled evidence for freeze requests
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

-- Indexes for Phase 3
CREATE INDEX IF NOT EXISTS idx_exchange_contacts_name ON exchange_contacts(exchange_name);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_trace ON freeze_requests_v2(trace_id);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_status ON freeze_requests_v2(status);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_priority ON freeze_requests_v2(priority);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_trace ON evidence_packages(trace_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_request ON evidence_packages(request_id);

-- ============================================
-- Seed Data: Exchange Compliance Contacts
-- ============================================
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

-- ============================================
-- Users & API Keys (wallet-based auth)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

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
