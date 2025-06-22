import { QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import pool, { CustomPool } from './config';

export interface DustTransaction {
  signature: string;
  timestamp: Date;
  slot: number;
  success: boolean;
  sender: string | null;
  recipient: string | null;
  amount: number;
  fee: number;
  tokenType: string;
  tokenAddress?: string;
  isPotentialDust: boolean;
  isPotentialPoisoning: boolean;
  riskScore?: number;
  isScamUrl?: boolean;
  memoContent?: string;
}

export interface DustingAttacker {
  address: string;
  smallTransfersCount: number;
  uniqueVictimsCount: number;
  uniqueVictims: string[];
  timestamps: number[];
  riskScore: number;
  walletAgeDays?: number;
  totalTransactionVolume?: number;
  knownLabels?: string[];
  relatedAddresses?: string[];
  previousAttackPatterns?: any;
  timePatterns?: any;
  temporalPattern: any;
  networkPattern: any;
  behavioralIndicators?: any;
  mlFeatures?: any;
  mlPrediction?: any;
  lastUpdated?: Date;
}

export interface DustingVictim {
  address: string;
  dustTransactionsCount: number;
  uniqueAttackersCount: number;
  uniqueAttackers: string[];
  timestamps: number[];
  riskScore: number;
  walletAgeDays?: number;
  walletValueEstimate?: number;
  timePatterns?: any;
  vulnerabilityAssessment?: any;
  mlFeatures?: any;
  mlPrediction?: any;
  lastUpdated?: Date;
}

export interface RiskAnalysis {
  address: string;
  riskScore: number;
  chainAnalysisData?: any;
  trmLabsData?: any;
  temporalPattern: any;
  networkPattern: any;
}

export class DatabaseUtils {
  pool: CustomPool;

  constructor() {
    this.pool = pool;
  }

  async initializeDatabase(): Promise<void> {
    const client = await pool.connect();
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async insertDustTransaction(tx: DustTransaction): Promise<QueryResult> {
    const query = `
      INSERT INTO dust_transactions (
        signature, timestamp, slot, success, sender, recipient, amount, fee, token_type, token_address, is_potential_dust, is_potential_poisoning, risk_score
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (signature, timestamp) DO UPDATE SET
        slot = EXCLUDED.slot,
        success = EXCLUDED.success,
        sender = EXCLUDED.sender,
        recipient = EXCLUDED.recipient,
        amount = EXCLUDED.amount,
        fee = EXCLUDED.fee,
        token_type = EXCLUDED.token_type,
        token_address = EXCLUDED.token_address,
        is_potential_dust = EXCLUDED.is_potential_dust,
        is_potential_poisoning = EXCLUDED.is_potential_poisoning,
        risk_score = EXCLUDED.risk_score
      RETURNING *;
    `;
    return this.pool.executeQuery(query, [
      tx.signature,
      tx.timestamp,
      tx.slot,
      tx.success,
      tx.sender,
      tx.recipient,
      tx.amount,
      tx.fee,
      tx.tokenType,
      tx.tokenAddress,
      tx.isPotentialDust,
      tx.isPotentialPoisoning,
      tx.riskScore ?? null
    ]);
  }

  async insertOrUpdateDustingAttacker(attacker: DustingAttacker): Promise<QueryResult> {
    const query = `
      INSERT INTO dusting_attackers (
        address, small_transfers_count, unique_victims_count, unique_victims, timestamps,
        risk_score, wallet_age_days, total_transaction_volume, known_labels, related_addresses,
        previous_attack_patterns, time_patterns, temporal_pattern, network_pattern,
        behavioral_indicators, ml_features, ml_prediction, last_updated
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CURRENT_TIMESTAMP)
      ON CONFLICT (address) DO UPDATE SET
        small_transfers_count = EXCLUDED.small_transfers_count,
        unique_victims_count = EXCLUDED.unique_victims_count,
        unique_victims = EXCLUDED.unique_victims,
        timestamps = EXCLUDED.timestamps,
        risk_score = EXCLUDED.risk_score,
        wallet_age_days = EXCLUDED.wallet_age_days,
        total_transaction_volume = EXCLUDED.total_transaction_volume,
        known_labels = EXCLUDED.known_labels,
        related_addresses = EXCLUDED.related_addresses,
        previous_attack_patterns = EXCLUDED.previous_attack_patterns,
        time_patterns = EXCLUDED.time_patterns,
        temporal_pattern = EXCLUDED.temporal_pattern,
        network_pattern = EXCLUDED.network_pattern,
        behavioral_indicators = EXCLUDED.behavioral_indicators,
        ml_features = EXCLUDED.ml_features,
        ml_prediction = EXCLUDED.ml_prediction,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    return this.pool.executeQuery(query, [
      attacker.address,
      attacker.smallTransfersCount,
      attacker.uniqueVictimsCount,
      attacker.uniqueVictims,
      attacker.timestamps,
      attacker.riskScore,
      attacker.walletAgeDays ?? null,
      attacker.totalTransactionVolume ?? null,
      attacker.knownLabels ?? null,
      attacker.relatedAddresses ?? null,
      attacker.previousAttackPatterns ?? null,
      attacker.timePatterns ?? null,
      attacker.temporalPattern,
      attacker.networkPattern,
      attacker.behavioralIndicators ?? null,
      attacker.mlFeatures ?? null,
      attacker.mlPrediction ?? null
    ]);
  }

  async insertOrUpdateDustingVictim(victim: DustingVictim): Promise<QueryResult> {
    const query = `
      INSERT INTO dusting_victims (
        address, dust_transactions_count, unique_attackers_count, unique_attackers, timestamps,
        risk_score, wallet_age_days, wallet_value_estimate, time_patterns, vulnerability_assessment,
        ml_features, ml_prediction, last_updated
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP)
      ON CONFLICT (address) DO UPDATE SET
        dust_transactions_count = EXCLUDED.dust_transactions_count,
        unique_attackers_count = EXCLUDED.unique_attackers_count,
        unique_attackers = EXCLUDED.unique_attackers,
        timestamps = EXCLUDED.timestamps,
        risk_score = EXCLUDED.risk_score,
        wallet_age_days = EXCLUDED.wallet_age_days,
        wallet_value_estimate = EXCLUDED.wallet_value_estimate,
        time_patterns = EXCLUDED.time_patterns,
        vulnerability_assessment = EXCLUDED.vulnerability_assessment,
        ml_features = EXCLUDED.ml_features,
        ml_prediction = EXCLUDED.ml_prediction,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    return this.pool.executeQuery(query, [
      victim.address,
      victim.dustTransactionsCount,
      victim.uniqueAttackersCount,
      victim.uniqueAttackers,
      victim.timestamps,
      victim.riskScore,
      victim.walletAgeDays ?? null,
      victim.walletValueEstimate ?? null,
      victim.timePatterns ?? null,
      victim.vulnerabilityAssessment ?? null,
      victim.mlFeatures ?? null,
      victim.mlPrediction ?? null
    ]);
  }

  async updateRiskAnalysis(analysis: RiskAnalysis): Promise<QueryResult> {
    const query = `
      INSERT INTO risk_analysis (
        address, risk_score, chain_analysis_data, trm_labs_data,
        temporal_pattern, network_pattern, last_updated
      ) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
      ON CONFLICT (address) DO UPDATE SET
        risk_score = EXCLUDED.risk_score,
        chain_analysis_data = EXCLUDED.chain_analysis_data,
        trm_labs_data = EXCLUDED.trm_labs_data,
        temporal_pattern = EXCLUDED.temporal_pattern,
        network_pattern = EXCLUDED.network_pattern,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    return this.pool.executeQuery(query, [
      analysis.address,
      analysis.riskScore,
      analysis.chainAnalysisData ?? null,
      analysis.trmLabsData ?? null,
      analysis.temporalPattern,
      analysis.networkPattern
    ]);
  }

  async getAddressTransactions(address: string): Promise<QueryResult> {
    return this.pool.executeQuery(
      'SELECT * FROM dust_transactions WHERE sender = $1 OR recipient = $1 ORDER BY timestamp DESC',
      [address]
    );
  }

  async getHighRiskAddresses(minRiskScore: number = 0.7): Promise<QueryResult> {
    return this.pool.executeQuery(
      'SELECT * FROM risk_analysis WHERE risk_score >= $1 ORDER BY risk_score DESC',
      [minRiskScore]
    );
  }

  async getDustingAttackers(minRiskScore: number = 0.5): Promise<QueryResult> {
    return this.pool.executeQuery(
      'SELECT * FROM dusting_attackers WHERE risk_score >= $1 ORDER BY risk_score DESC',
      [minRiskScore]
    );
  }

  async getDustingVictims(minRiskScore: number = 0.5): Promise<QueryResult> {
    return this.pool.executeQuery(
      'SELECT * FROM dusting_victims WHERE risk_score >= $1 ORDER BY risk_score DESC',
      [minRiskScore]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getOverviewStatistics(): Promise<any> {
    // Query for total transactions count
    const totalTransactionsQuery = "SELECT COUNT(*) as total FROM dust_transactions";
    const totalTransactionsResult = await this.pool.executeQuery(totalTransactionsQuery);
    const totalTransactions = parseInt(totalTransactionsResult.rows[0].total || '0');

    // Query for successful transactions count
    const successfulTransactionsQuery = "SELECT COUNT(*) as successful FROM dust_transactions WHERE success = true";
    const successfulTransactionsResult = await this.pool.executeQuery(successfulTransactionsQuery);
    const successfulTransactions = parseInt(successfulTransactionsResult.rows[0].successful || '0');

    // Calculate failed transactions
    const failedTransactions = totalTransactions - successfulTransactions;

    // Query for dusted transactions count
    const dustedTransactionsQuery = "SELECT COUNT(*) as dusted FROM dust_transactions WHERE is_potential_dust = true";
    const dustedTransactionsResult = await this.pool.executeQuery(dustedTransactionsQuery);
    const dustedTransactions = parseInt(dustedTransactionsResult.rows[0].dusted || '0');

    // Query for poisoned transactions count
    const poisonedTransactionsQuery = "SELECT COUNT(*) as poisoned FROM dust_transactions WHERE is_potential_poisoning = true";
    const poisonedTransactionsResult = await this.pool.executeQuery(poisonedTransactionsQuery);
    const poisonedTransactions = parseInt(poisonedTransactionsResult.rows[0].poisoned || '0');

    // Query for total volume in SOL
    const volumeQuery = "SELECT SUM(amount) as total_volume FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
    const volumeResult = await this.pool.executeQuery(volumeQuery);
    const volume = parseFloat(volumeResult.rows[0].total_volume || '0');

    // Query for average transaction amount
    const avgAmountQuery = "SELECT AVG(amount) as avg_amount FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
    const avgAmountResult = await this.pool.executeQuery(avgAmountQuery);
    const avgTransactionAmount = parseFloat(avgAmountResult.rows[0].avg_amount || '0');

    // Query for average fee
    const avgFeeQuery = "SELECT AVG(fee::numeric) as avg_fee FROM dust_transactions WHERE success = true";
    const avgFeeResult = await this.pool.executeQuery(avgFeeQuery);
    const avgTransactionFee = parseFloat(avgFeeResult.rows[0].avg_fee || '0');

    // Query for token type distribution
    const tokenDistributionQuery = "SELECT token_type, COUNT(*) as count FROM dust_transactions GROUP BY token_type ORDER BY count DESC";
    const tokenDistributionResult = await this.pool.executeQuery(tokenDistributionQuery);
    const tokenDistribution = tokenDistributionResult.rows;

    // Query for unique senders and recipients
    const uniqueAddressesQuery = "SELECT COUNT(DISTINCT sender) as unique_senders, COUNT(DISTINCT recipient) as unique_recipients FROM dust_transactions";
    const uniqueAddressesResult = await this.pool.executeQuery(uniqueAddressesQuery);
    const uniqueSenders = parseInt(uniqueAddressesResult.rows[0].unique_senders || '0');
    const uniqueRecipients = parseInt(uniqueAddressesResult.rows[0].unique_recipients || '0');

    // Query for top dusting senders (potential attackers)
    const topDustingSourcesQuery = "SELECT sender as address, COUNT(*) as small_transfers_count, COUNT(DISTINCT recipient) as unique_victims_count, AVG(amount) as avg_amount, MAX(timestamp) as last_activity FROM dust_transactions WHERE is_potential_dust = true AND sender IS NOT NULL GROUP BY sender ORDER BY small_transfers_count DESC LIMIT 10";
    const topDustingSourcesResult = await this.pool.executeQuery(topDustingSourcesQuery);
    const attackerPatterns = topDustingSourcesResult.rows.map((row: any) => ({
      address: row.address,
      small_transfers_count: parseInt(row.small_transfers_count),
      unique_victims_count: parseInt(row.unique_victims_count),
      avg_amount: parseFloat(row.avg_amount || '0'),
      last_updated: row.last_activity,
      // Adding placeholder values for compatibility
      risk_score: 0.7,
      regularity_score: 0.5,
      centrality_score: 0.5,
      uses_scripts: false
    }));

    // Query for top dusted recipients (potential victims)
    const topDustedRecipientsQuery = "SELECT recipient as address, COUNT(*) as dust_transactions_count, COUNT(DISTINCT sender) as unique_attackers_count, SUM(amount) as total_received, MAX(timestamp) as last_activity FROM dust_transactions WHERE is_potential_dust = true AND recipient IS NOT NULL GROUP BY recipient ORDER BY dust_transactions_count DESC LIMIT 10";
    const topDustedRecipientsResult = await this.pool.executeQuery(topDustedRecipientsQuery);
    const victimExposure = topDustedRecipientsResult.rows.map((row: any) => ({
      address: row.address,
      dust_transactions_count: parseInt(row.dust_transactions_count),
      unique_attackers_count: parseInt(row.unique_attackers_count),
      total_received: parseFloat(row.total_received || '0'),
      last_updated: row.last_activity,
      // Adding placeholder values for compatibility
      risk_score: 0.5,
      risk_exposure: 0.6,
      wallet_activity: "medium",
      asset_value: "unknown"
    }));

    // Query for daily transaction summary
    const dailySummaryQuery = "SELECT DATE(timestamp) as day, COUNT(*) as total_transactions, COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as total_dust_transactions, COUNT(DISTINCT sender) as unique_senders, COUNT(DISTINCT recipient) as unique_recipients, AVG(amount) as avg_amount FROM dust_transactions GROUP BY DATE(timestamp) ORDER BY day DESC LIMIT 30";
    const dailySummaryResult = await this.pool.executeQuery(dailySummaryQuery);
    const dailySummary = dailySummaryResult.rows.map((row: any) => ({
      day: row.day,
      total_transactions: parseInt(row.total_transactions),
      total_dust_transactions: parseInt(row.total_dust_transactions),
      unique_attackers: parseInt(row.unique_senders),
      unique_victims: parseInt(row.unique_recipients),
      avg_dust_amount: parseFloat(row.avg_amount || '0')
    }));

    // Query for recent transactions (limit to 10)
    const recentTransactionsQuery = "SELECT * FROM dust_transactions ORDER BY timestamp DESC LIMIT 10";
    const recentTransactionsResult = await this.pool.executeQuery(recentTransactionsQuery);
    const recentTransactions = recentTransactionsResult.rows.map((tx: any) => ({
      id: tx.id,
      signature: tx.signature,
      timestamp: tx.timestamp,
      slot: tx.slot,
      success: tx.success,
      sender: tx.sender,
      recipient: tx.recipient,
      amount: String(parseFloat(tx.amount)),
      fee: String(parseFloat(tx.fee)),
      token_type: tx.token_type,
      token_address: tx.token_address,
      is_potential_dust: tx.is_potential_dust,
      is_potential_poisoning: tx.is_potential_poisoning,
      risk_score: String(tx.risk_score || 0.5),
      created_at: tx.created_at || tx.timestamp
    }));

    // Query for dusting sources count (addresses that are potential dusting sources)
    const dustingSourcesQuery = "SELECT COUNT(DISTINCT sender) as sources FROM dust_transactions WHERE is_potential_dust = true";
    const dustingSourcesResult = await this.pool.executeQuery(dustingSourcesQuery);
    const dustingSources = parseInt(dustingSourcesResult.rows[0].sources || '0');

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      dustedTransactions,
      poisonedTransactions,
      volume,
      dustingSources,
      avgTransactionAmount,
      avgTransactionFee,
      tokenDistribution,
      uniqueSenders,
      uniqueRecipients,
      attackerPatterns,
      victimExposure,
      dailySummary,
      recentTransactions
    };
  }
}

export default new DatabaseUtils();
