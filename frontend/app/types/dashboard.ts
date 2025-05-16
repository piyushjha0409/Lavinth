// Dashboard related interfaces

export interface DailySummary {
  day: string;
  unique_attackers: number;
  unique_victims: number;
  total_dust_transactions: number;
  avg_dust_amount: number;
  total_transactions?: number;
}

export interface AttackerPattern {
  address: string;
  risk_score: number;
  small_transfers_count: number;
  unique_victims_count: number;
  regularity_score: number;
  centrality_score: number;
  uses_scripts: boolean;
  last_updated: string;
  avg_amount?: number;
}

export interface VictimExposure {
  address: string;
  risk_score: number;
  dust_transactions_count: number;
  unique_attackers_count: number;
  risk_exposure: number;
  wallet_activity: string;
  asset_value: string;
  last_updated: string;
  total_received?: number;
}

export interface TokenDistribution {
  token_type: string;
  count: number;
}
