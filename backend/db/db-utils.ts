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
}

export interface DustingCandidate {
    address: string;
    smallTransfersCount: number;
    uniqueRecipientsCount: number;
    uniqueRecipients: string[];
    timestamps: number[];
    riskScore: number;
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
        const client = await pool.connect();
        try {
            console.log("Initializing database schema...");
            
            // Read schema SQL from file
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            
            // Execute schema SQL
            await client.query(schemaSql);
            
            console.log("Database schema initialized successfully");
        } catch (error) {
            console.error("Error initializing database schema:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    async insertDustTransaction(transaction: DustTransaction): Promise<QueryResult> {
        try {
            const {
                signature,
                timestamp,
                slot,
                success,
                sender,
                recipient,
                amount,
                fee,
                tokenType,
                tokenAddress,
                isPotentialDust,
                isPotentialPoisoning,
                riskScore
            } = transaction;
            
            // Use ON CONFLICT to handle duplicates based on signature and timestamp
            const result = await pool.query(
                `INSERT INTO dust_transactions 
                (signature, timestamp, slot, success, sender, recipient, amount, fee, 
                    token_type, token_address, is_potential_dust, is_potential_poisoning, risk_score) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
                RETURNING *`,
                [
                    signature, 
                    timestamp, 
                    slot, 
                    success, 
                    sender, 
                    recipient, 
                    amount, 
                    fee, 
                    tokenType, 
                    tokenAddress, 
                    isPotentialDust, 
                    isPotentialPoisoning, 
                    riskScore
                ]
            );
            
            return result.rows[0];
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error inserting transaction:', error.message);
            } else {
                console.error('Error inserting transaction:', error);
            }
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

    async insertOrUpdateDustingCandidate(candidate: DustingCandidate): Promise<QueryResult> {
        try {
            const {
                address,
                smallTransfersCount,
                uniqueRecipientsCount,
                uniqueRecipients,
                timestamps,
                riskScore,
                temporalPattern,
                networkPattern
            } = candidate;
            
            // Use ON CONFLICT to handle duplicates based on address
            const result = await pool.query(
                `INSERT INTO dusting_candidates 
                (address, small_transfers_count, unique_recipients_count, unique_recipients, timestamps, 
                    risk_score, temporal_pattern, network_pattern, last_updated) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                ON CONFLICT (address) DO UPDATE SET
                    small_transfers_count = EXCLUDED.small_transfers_count,
                    unique_recipients_count = EXCLUDED.unique_recipients_count,
                    unique_recipients = EXCLUDED.unique_recipients,
                    timestamps = EXCLUDED.timestamps,
                    risk_score = EXCLUDED.risk_score,
                    temporal_pattern = EXCLUDED.temporal_pattern,
                    network_pattern = EXCLUDED.network_pattern,
                    last_updated = CURRENT_TIMESTAMP
                RETURNING *`,
                [
                    address, 
                    smallTransfersCount, 
                    uniqueRecipientsCount,
                    uniqueRecipients, 
                    timestamps, 
                    riskScore, 
                    temporalPattern, 
                    networkPattern
                ]
            );
            
            return result.rows[0];
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error inserting/updating dusting candidate:', error.message);
            } else {
                console.error('Error inserting/updating dusting candidate:', error);
            }
            throw error;
        }
    }

    async getDustingCandidates(minRiskScore: number = 0.5): Promise<QueryResult> {
        return this.pool.query(
            'SELECT * FROM dusting_candidates WHERE risk_score >= $1 ORDER BY risk_score DESC',
            [minRiskScore]
        );
    }
}

export default new DatabaseUtils();
