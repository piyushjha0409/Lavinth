-- Table: dust_transactions
CREATE TABLE dust_transactions (
  id SERIAL PRIMARY KEY,
  signature TEXT,
  timestamp TIMESTAMPTZ,
  slot BIGINT,
  success BOOLEAN,
  sender TEXT,
  recipient TEXT,
  amount NUMERIC,
  fee NUMERIC,
  token_type TEXT,
  token_address TEXT,
  is_potential_dust BOOLEAN,
  is_potential_poisoning BOOLEAN,
  risk_score NUMERIC,
  created_at TIMESTAMPTZ
);

-- Table: dusting_attackers
CREATE TABLE dusting_attackers (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE,
  small_transfers_count INTEGER,
  unique_victims_count INTEGER,
  unique_victims TEXT,
  timestamps TEXT,
  risk_score NUMERIC,
  wallet_age_days INTEGER,
  total_transaction_volume NUMERIC,
  known_labels TEXT,
  related_addresses TEXT,
  previous_attack_patterns TEXT,
  time_patterns TEXT,
  temporal_pattern TEXT,
  network_pattern TEXT,
  behavioral_indicators TEXT,
  ml_features TEXT,
  ml_prediction TEXT,
  last_updated TIMESTAMPTZ
);

-- Table: dusting_candidates
CREATE TABLE dusting_candidates (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE,
  risk_score NUMERIC,
  first_detected_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ
);

-- Table: dusting_victims (extended)
CREATE TABLE dusting_victims (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE,
  dust_transactions_count INTEGER,
  unique_attackers_count INTEGER,
  unique_attackers TEXT,
  timestamps TEXT,
  risk_score NUMERIC,
  wallet_age_days INTEGER,
  wallet_value_estimate NUMERIC,
  time_patterns TEXT,
  vulnerability_assessment TEXT,
  ml_features TEXT,
  ml_prediction TEXT,
  last_updated TIMESTAMPTZ
);

-- Table: risk_analysis
CREATE TABLE risk_analysis (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE,
  risk_score NUMERIC,
  chain_analysis_data JSONB,
  trm_labs_data JSONB,
  temporal_pattern TEXT,
  network_pattern TEXT,
  last_updated TIMESTAMPTZ
);
