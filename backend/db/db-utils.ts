import { Pool, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import pool from './config';

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

export interface TimePattern {
    hourlyDistribution: number[];
    weekdayDistribution: number[];
    burstDetection: {
        burstThreshold: number;
        burstWindows: Array<{start: number, end: number}>;
    }
}

export interface BehavioralIndicators {
    usesNewAccounts: boolean;
    hasAbnormalFundingPattern: boolean;
    targetsPremiumWallets: boolean;
    usesScriptedTransactions: boolean;
}

export interface MLFeatures {
    transactionFrequency: number;
    averageAmount: number;
    recipientCount: number;
    timePatternFeatures: number[];
    networkFeatures: number[];
}

export interface MLPrediction {
    attackerScore: number;
    victimScore: number;
    confidence: number;
}

export interface VulnerabilityAssessment {
    walletActivity: 'high' | 'medium' | 'low';
    assetValue: 'high' | 'medium' | 'low';
    previousInteractions: boolean;
    riskExposure: number;
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
    previousAttackPatterns?: {
        timestamp: number;
        victimCount: number;
        pattern: string;
    }[];
    timePatterns?: TimePattern;
    temporalPattern: {
        burstCount: number;
        averageTimeBetweenTransfers: number;
        regularityScore: number;
    };
    networkPattern: {
        clusterSize: number;
        centralityScore: number;
        recipientOverlap: number;
        betweennessCentrality?: number;
    };
    behavioralIndicators?: BehavioralIndicators;
    mlFeatures?: MLFeatures;
    mlPrediction?: MLPrediction;
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
    timePatterns?: TimePattern;
    vulnerabilityAssessment?: VulnerabilityAssessment;
    mlFeatures?: MLFeatures;
    mlPrediction?: MLPrediction;
    lastUpdated?: Date;
}

export interface RiskAnalysis {
    address: string;
    riskScore: number;
    chainAnalysisData?: any;
    trmLabsData?: any;
    temporalPattern: {
        burstCount: number;
        averageTimeBetweenTransfers: number;
        regularityScore: number;
    };
    networkPattern: {
        clusterSize: number;
        centralityScore: number;
        recipientOverlap: number;
    };
}

export class DatabaseUtils {
    pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async initializeDatabase(): Promise<void> {
        let client = null;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
            try {
                console.log(`Initializing database schema (attempt ${retries + 1}/${maxRetries})...`);
                
                // Read schema SQL from file
                const schemaPath = path.join(__dirname, 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                
                // Use our robust connection pool's executeQuery method
                await pool.executeQuery(schemaSql, [], maxRetries);
                
                // Verify that all required tables exist
                const tables = ['dust_transactions', 'risk_analysis', 'dusting_attackers', 'dusting_victims', 'dusting_candidates'];
                for (const table of tables) {
                    console.log(`Verifying table ${table}...`);
                    const result = await pool.executeQuery(`SELECT to_regclass('public.${table}') as table_exists;`, []);
                    if (!result.rows[0].table_exists) {
                        throw new Error(`Table ${table} was not created successfully`);
                    }
                }
                
                console.log("Database schema initialized successfully with all required tables");
                return;
            } catch (error) {
                retries++;
                console.error(`Error initializing database schema (attempt ${retries}/${maxRetries}):`, error);
                
                if (retries < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s, etc.
                    const backoffTime = 1000 * Math.pow(2, retries - 1);
                    console.log(`Retrying database initialization in ${backoffTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                } else {
                    throw error;
                }
            }
        }
    }

    async insertDustTransaction(transaction: DustTransaction, maxRetries: number = 3): Promise<QueryResult> {
        console.log(`Attempting to insert dust transaction: ${transaction.signature}`);
        
        // SQL query for insertion with conflict handling
        const query = `
          INSERT INTO dust_transactions (
            signature, timestamp, slot, success, sender, recipient, amount, fee, token_type, token_address, is_potential_dust, is_potential_poisoning, risk_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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

        // Parameters for the query
        const params = [
          transaction.signature,
          transaction.timestamp,
          transaction.slot,
          transaction.success,
          transaction.sender,
          transaction.recipient,
          transaction.amount,
          transaction.fee,
          transaction.tokenType,
          transaction.tokenAddress,
          transaction.isPotentialDust,
          transaction.isPotentialPoisoning,
          transaction.riskScore
        ];

        try {
          // Use the pool's executeQuery method which has built-in retry logic
          const result = await pool.executeQuery(query, params, maxRetries);
          console.log(`Successfully inserted/updated dust transaction: ${transaction.signature}`);
          return result;
        } catch (error) {
          console.error(`Failed to insert dust transaction after ${maxRetries} retries:`, error);
          throw error;
        }
    }

    async updateRiskAnalysis(analysis: RiskAnalysis): Promise<QueryResult> {
        const query = `
            INSERT INTO risk_analysis (
                address, risk_score, chain_analysis_data, trm_labs_data,
                temporal_pattern, network_pattern, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (address) DO UPDATE SET
                risk_score = EXCLUDED.risk_score,
                chain_analysis_data = EXCLUDED.chain_analysis_data,
                trm_labs_data = EXCLUDED.trm_labs_data,
                temporal_pattern = EXCLUDED.temporal_pattern,
                network_pattern = EXCLUDED.network_pattern,
                last_updated = CURRENT_TIMESTAMP
            RETURNING *;
        `;

        return this.pool.query(query, [
            analysis.address,
            analysis.riskScore,
            analysis.chainAnalysisData,
            analysis.trmLabsData,
            analysis.temporalPattern,
            analysis.networkPattern
        ]);
    }

    async getHighRiskAddresses(minRiskScore: number = 0.7): Promise<QueryResult> {
        return this.pool.query(
            'SELECT * FROM risk_analysis WHERE risk_score >= $1 ORDER BY risk_score DESC',
            [minRiskScore]
        );
    }

    async getAddressTransactions(address: string): Promise<QueryResult> {
        return this.pool.query(
            'SELECT * FROM dust_transactions WHERE sender = $1 OR recipient = $1 ORDER BY timestamp DESC',
            [address]
        );
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    /**
     * Find transaction by signature and timestamp
     */
    async findTransactionBySignature(signature: string, timestamp: Date | null = null) {
        try {
            // If timestamp is provided, use both for exact match
            if (timestamp) {
                const result = await pool.query(
                    'SELECT * FROM dust_transactions WHERE signature = $1 AND timestamp = $2',
                    [signature, timestamp]
                );
                return result.rows[0];
            } else {
                // Otherwise just search by signature
                const result = await pool.query(
                    'SELECT * FROM dust_transactions WHERE signature = $1 ORDER BY timestamp DESC LIMIT 1',
                    [signature]
                );
                return result.rows[0];
            }
        } catch (error) {
            console.error('Database error finding transaction:', error);
            return null;
        }
    }

    /**
     * Update existing transaction
     */
    async updateTransaction(signature: string, updateFields: Partial<DustTransaction>): Promise<boolean> {
        try {
            // Build the SET part of the query dynamically based on provided fields
            const setEntries = Object.entries(updateFields).map(([key, _], index) => {
                // Convert camelCase to snake_case for SQL column names
                const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                return `${column} = $${index + 2}`;
            });

            const query = `
                UPDATE dust_transactions 
                SET ${setEntries.join(', ')} 
                WHERE signature = $1
            `;

            const values = [signature, ...Object.values(updateFields)];
            const result = await pool.query(query, values);
            return result.rowCount !== null && result.rowCount > 0;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async insertOrUpdateDustingAttacker(attacker: DustingAttacker): Promise<QueryResult> {
        try {
            const {
                address,
                smallTransfersCount,
                uniqueVictimsCount,
                uniqueVictims,
                timestamps,
                riskScore,
                temporalPattern,
                networkPattern,
                walletAgeDays,
                totalTransactionVolume,
                knownLabels,
                relatedAddresses,
                previousAttackPatterns,
                timePatterns,
                behavioralIndicators,
                mlFeatures,
                mlPrediction
            } = attacker;
            
            // Use ON CONFLICT to handle duplicates based on address
            const result = await pool.query(
                `INSERT INTO dusting_attackers 
                (address, small_transfers_count, unique_victims_count, unique_victims, timestamps, 
                    risk_score, temporal_pattern, network_pattern, wallet_age_days, total_transaction_volume,
                    known_labels, related_addresses, previous_attack_patterns, time_patterns,
                    behavioral_indicators, ml_features, ml_prediction, last_updated) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
                ON CONFLICT (address) DO UPDATE SET
                    small_transfers_count = EXCLUDED.small_transfers_count,
                    unique_victims_count = EXCLUDED.unique_victims_count,
                    unique_victims = EXCLUDED.unique_victims,
                    timestamps = EXCLUDED.timestamps,
                    risk_score = EXCLUDED.risk_score,
                    temporal_pattern = EXCLUDED.temporal_pattern,
                    network_pattern = EXCLUDED.network_pattern,
                    wallet_age_days = EXCLUDED.wallet_age_days,
                    total_transaction_volume = EXCLUDED.total_transaction_volume,
                    known_labels = EXCLUDED.known_labels,
                    related_addresses = EXCLUDED.related_addresses,
                    previous_attack_patterns = EXCLUDED.previous_attack_patterns,
                    time_patterns = EXCLUDED.time_patterns,
                    behavioral_indicators = EXCLUDED.behavioral_indicators,
                    ml_features = EXCLUDED.ml_features,
                    ml_prediction = EXCLUDED.ml_prediction,
                    last_updated = CURRENT_TIMESTAMP
                RETURNING *`,
                [
                    address, 
                    smallTransfersCount, 
                    uniqueVictimsCount,
                    uniqueVictims, 
                    timestamps, 
                    riskScore, 
                    temporalPattern, 
                    networkPattern,
                    walletAgeDays || null,
                    totalTransactionVolume || null,
                    knownLabels || null,
                    relatedAddresses || null,
                    previousAttackPatterns || null,
                    timePatterns || null,
                    behavioralIndicators || null,
                    mlFeatures || null,
                    mlPrediction || null
                ]
            );
            
            return result.rows[0];
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error inserting/updating dusting attacker:', error.message);
            } else {
                console.error('Error inserting/updating dusting attacker:', error);
            }
            throw error;
        }
    }

    async insertOrUpdateDustingVictim(victim: DustingVictim): Promise<QueryResult> {
        try {
            const {
                address,
                dustTransactionsCount,
                uniqueAttackersCount,
                uniqueAttackers,
                timestamps,
                riskScore,
                walletAgeDays,
                walletValueEstimate,
                timePatterns,
                vulnerabilityAssessment,
                mlFeatures,
                mlPrediction
            } = victim;
            
            // Use ON CONFLICT to handle duplicates based on address
            const result = await pool.query(
                `INSERT INTO dusting_victims 
                (address, dust_transactions_count, unique_attackers_count, unique_attackers, timestamps, 
                    risk_score, wallet_age_days, wallet_value_estimate, time_patterns, vulnerability_assessment,
                    ml_features, ml_prediction, last_updated) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
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
                RETURNING *`,
                [
                    address, 
                    dustTransactionsCount, 
                    uniqueAttackersCount,
                    uniqueAttackers, 
                    timestamps, 
                    riskScore,
                    walletAgeDays || null,
                    walletValueEstimate || null,
                    timePatterns || null,
                    vulnerabilityAssessment || null,
                    mlFeatures || null,
                    mlPrediction || null
                ]
            );
            
            return result.rows[0];
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error inserting/updating dusting victim:', error.message);
            } else {
                console.error('Error inserting/updating dusting victim:', error);
            }
            throw error;
        }
    }

    async getDustingAttackers(minRiskScore: number = 0.5): Promise<QueryResult> {
        return this.pool.query(
            'SELECT * FROM dusting_attackers WHERE risk_score >= $1 ORDER BY risk_score DESC',
            [minRiskScore]
        );
    }

    async getDustingVictims(minRiskScore: number = 0.5): Promise<QueryResult> {
        return this.pool.query(
            'SELECT * FROM dusting_victims WHERE risk_score >= $1 ORDER BY risk_score DESC',
            [minRiskScore]
        );
    }
}

export default new DatabaseUtils();
