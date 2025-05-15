"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseUtils = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("./config"));
class DatabaseUtils {
    constructor() {
        this.pool = config_1.default;
    }
    initializeDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield config_1.default.connect();
            try {
                console.log("Initializing database schema...");
                // Read schema SQL from file
                const schemaPath = path.join(__dirname, 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                // Execute schema SQL
                yield client.query(schemaSql);
                console.log("Database schema initialized successfully");
            }
            catch (error) {
                console.error("Error initializing database schema:", error);
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    insertDustTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { signature, timestamp, slot, success, sender, recipient, amount, fee, tokenType, tokenAddress, isPotentialDust, isPotentialPoisoning, riskScore } = transaction;
                // Use ON CONFLICT to handle duplicates based on signature and timestamp
                const result = yield config_1.default.query(`INSERT INTO dust_transactions 
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
                RETURNING *`, [
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
                ]);
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Error inserting transaction:', error.message);
                }
                else {
                    console.error('Error inserting transaction:', error);
                }
                throw error;
            }
        });
    }
    updateRiskAnalysis(analysis) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    getHighRiskAddresses() {
        return __awaiter(this, arguments, void 0, function* (minRiskScore = 0.7) {
            return this.pool.query('SELECT * FROM risk_analysis WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore]);
        });
    }
    getAddressTransactions(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pool.query('SELECT * FROM dust_transactions WHERE sender = $1 OR recipient = $1 ORDER BY timestamp DESC', [address]);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pool.end();
        });
    }
    /**
     * Find transaction by signature and timestamp
     */
    findTransactionBySignature(signature_1) {
        return __awaiter(this, arguments, void 0, function* (signature, timestamp = null) {
            try {
                // If timestamp is provided, use both for exact match
                if (timestamp) {
                    const result = yield config_1.default.query('SELECT * FROM dust_transactions WHERE signature = $1 AND timestamp = $2', [signature, timestamp]);
                    return result.rows[0];
                }
                else {
                    // Otherwise just search by signature
                    const result = yield config_1.default.query('SELECT * FROM dust_transactions WHERE signature = $1 ORDER BY timestamp DESC LIMIT 1', [signature]);
                    return result.rows[0];
                }
            }
            catch (error) {
                console.error('Database error finding transaction:', error);
                return null;
            }
        });
    }
    /**
     * Update existing transaction
     */
    updateTransaction(signature, updateFields) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const result = yield config_1.default.query(query, values);
                return result.rowCount !== null && result.rowCount > 0;
            }
            catch (error) {
                console.error('Error updating transaction:', error);
                throw error;
            }
        });
    }
    insertOrUpdateDustingAttacker(attacker) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { address, smallTransfersCount, uniqueVictimsCount, uniqueVictims, timestamps, riskScore, temporalPattern, networkPattern, walletAgeDays, totalTransactionVolume, knownLabels, relatedAddresses, previousAttackPatterns, timePatterns, behavioralIndicators, mlFeatures, mlPrediction } = attacker;
                // Use ON CONFLICT to handle duplicates based on address
                const result = yield config_1.default.query(`INSERT INTO dusting_attackers 
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
                RETURNING *`, [
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
                ]);
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Error inserting/updating dusting attacker:', error.message);
                }
                else {
                    console.error('Error inserting/updating dusting attacker:', error);
                }
                throw error;
            }
        });
    }
    insertOrUpdateDustingVictim(victim) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { address, dustTransactionsCount, uniqueAttackersCount, uniqueAttackers, timestamps, riskScore, walletAgeDays, walletValueEstimate, timePatterns, vulnerabilityAssessment, mlFeatures, mlPrediction } = victim;
                // Use ON CONFLICT to handle duplicates based on address
                const result = yield config_1.default.query(`INSERT INTO dusting_victims 
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
                RETURNING *`, [
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
                ]);
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error('Error inserting/updating dusting victim:', error.message);
                }
                else {
                    console.error('Error inserting/updating dusting victim:', error);
                }
                throw error;
            }
        });
    }
    getDustingAttackers() {
        return __awaiter(this, arguments, void 0, function* (minRiskScore = 0.5) {
            return this.pool.query('SELECT * FROM dusting_attackers WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore]);
        });
    }
    getDustingVictims() {
        return __awaiter(this, arguments, void 0, function* (minRiskScore = 0.5) {
            return this.pool.query('SELECT * FROM dusting_victims WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore]);
        });
    }
}
exports.DatabaseUtils = DatabaseUtils;
exports.default = new DatabaseUtils();
