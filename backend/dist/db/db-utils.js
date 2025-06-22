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
                const schemaPath = path.join(__dirname, 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                yield client.query(schemaSql);
            }
            catch (error) {
                console.error('Error initializing database schema:', error);
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    insertDustTransaction(tx) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                (_a = tx.riskScore) !== null && _a !== void 0 ? _a : null
            ]);
        });
    }
    insertOrUpdateDustingAttacker(attacker) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
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
                (_a = attacker.walletAgeDays) !== null && _a !== void 0 ? _a : null,
                (_b = attacker.totalTransactionVolume) !== null && _b !== void 0 ? _b : null,
                (_c = attacker.knownLabels) !== null && _c !== void 0 ? _c : null,
                (_d = attacker.relatedAddresses) !== null && _d !== void 0 ? _d : null,
                (_e = attacker.previousAttackPatterns) !== null && _e !== void 0 ? _e : null,
                (_f = attacker.timePatterns) !== null && _f !== void 0 ? _f : null,
                attacker.temporalPattern,
                attacker.networkPattern,
                (_g = attacker.behavioralIndicators) !== null && _g !== void 0 ? _g : null,
                (_h = attacker.mlFeatures) !== null && _h !== void 0 ? _h : null,
                (_j = attacker.mlPrediction) !== null && _j !== void 0 ? _j : null
            ]);
        });
    }
    insertOrUpdateDustingVictim(victim) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
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
                (_a = victim.walletAgeDays) !== null && _a !== void 0 ? _a : null,
                (_b = victim.walletValueEstimate) !== null && _b !== void 0 ? _b : null,
                (_c = victim.timePatterns) !== null && _c !== void 0 ? _c : null,
                (_d = victim.vulnerabilityAssessment) !== null && _d !== void 0 ? _d : null,
                (_e = victim.mlFeatures) !== null && _e !== void 0 ? _e : null,
                (_f = victim.mlPrediction) !== null && _f !== void 0 ? _f : null
            ]);
        });
    }
    updateRiskAnalysis(analysis) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
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
                (_a = analysis.chainAnalysisData) !== null && _a !== void 0 ? _a : null,
                (_b = analysis.trmLabsData) !== null && _b !== void 0 ? _b : null,
                analysis.temporalPattern,
                analysis.networkPattern
            ]);
        });
    }
    getAddressTransactions(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pool.executeQuery('SELECT * FROM dust_transactions WHERE sender = $1 OR recipient = $1 ORDER BY timestamp DESC', [address]);
        });
    }
    getHighRiskAddresses() {
        return __awaiter(this, arguments, void 0, function* (minRiskScore = 0.7) {
            return this.pool.executeQuery('SELECT * FROM risk_analysis WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore]);
        });
    }
    getDustingAttackers() {
        return __awaiter(this, arguments, void 0, function* (minRiskScore = 0.5) {
            return this.pool.executeQuery('SELECT * FROM dusting_attackers WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore]);
        });
    }
    getDustingVictims() {
        return __awaiter(this, arguments, void 0, function* (minRiskScore = 0.5) {
            return this.pool.executeQuery('SELECT * FROM dusting_victims WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore]);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pool.end();
        });
    }
    getOverviewStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            // Query for total transactions count
            const totalTransactionsQuery = "SELECT COUNT(*) as total FROM dust_transactions";
            const totalTransactionsResult = yield this.pool.executeQuery(totalTransactionsQuery);
            const totalTransactions = parseInt(totalTransactionsResult.rows[0].total || '0');
            // Query for successful transactions count
            const successfulTransactionsQuery = "SELECT COUNT(*) as successful FROM dust_transactions WHERE success = true";
            const successfulTransactionsResult = yield this.pool.executeQuery(successfulTransactionsQuery);
            const successfulTransactions = parseInt(successfulTransactionsResult.rows[0].successful || '0');
            // Calculate failed transactions
            const failedTransactions = totalTransactions - successfulTransactions;
            // Query for dusted transactions count
            const dustedTransactionsQuery = "SELECT COUNT(*) as dusted FROM dust_transactions WHERE is_potential_dust = true";
            const dustedTransactionsResult = yield this.pool.executeQuery(dustedTransactionsQuery);
            const dustedTransactions = parseInt(dustedTransactionsResult.rows[0].dusted || '0');
            // Query for poisoned transactions count
            const poisonedTransactionsQuery = "SELECT COUNT(*) as poisoned FROM dust_transactions WHERE is_potential_poisoning = true";
            const poisonedTransactionsResult = yield this.pool.executeQuery(poisonedTransactionsQuery);
            const poisonedTransactions = parseInt(poisonedTransactionsResult.rows[0].poisoned || '0');
            // Query for total volume in SOL
            const volumeQuery = "SELECT SUM(amount) as total_volume FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
            const volumeResult = yield this.pool.executeQuery(volumeQuery);
            const volume = parseFloat(volumeResult.rows[0].total_volume || '0');
            // Query for average transaction amount
            const avgAmountQuery = "SELECT AVG(amount) as avg_amount FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
            const avgAmountResult = yield this.pool.executeQuery(avgAmountQuery);
            const avgTransactionAmount = parseFloat(avgAmountResult.rows[0].avg_amount || '0');
            // Query for average fee
            const avgFeeQuery = "SELECT AVG(fee::numeric) as avg_fee FROM dust_transactions WHERE success = true";
            const avgFeeResult = yield this.pool.executeQuery(avgFeeQuery);
            const avgTransactionFee = parseFloat(avgFeeResult.rows[0].avg_fee || '0');
            // Query for token type distribution
            const tokenDistributionQuery = "SELECT token_type, COUNT(*) as count FROM dust_transactions GROUP BY token_type ORDER BY count DESC";
            const tokenDistributionResult = yield this.pool.executeQuery(tokenDistributionQuery);
            const tokenDistribution = tokenDistributionResult.rows;
            // Query for unique senders and recipients
            const uniqueAddressesQuery = "SELECT COUNT(DISTINCT sender) as unique_senders, COUNT(DISTINCT recipient) as unique_recipients FROM dust_transactions";
            const uniqueAddressesResult = yield this.pool.executeQuery(uniqueAddressesQuery);
            const uniqueSenders = parseInt(uniqueAddressesResult.rows[0].unique_senders || '0');
            const uniqueRecipients = parseInt(uniqueAddressesResult.rows[0].unique_recipients || '0');
            // Query for top dusting senders (potential attackers)
            const topDustingSourcesQuery = "SELECT sender as address, COUNT(*) as small_transfers_count, COUNT(DISTINCT recipient) as unique_victims_count, AVG(amount) as avg_amount, MAX(timestamp) as last_activity FROM dust_transactions WHERE is_potential_dust = true AND sender IS NOT NULL GROUP BY sender ORDER BY small_transfers_count DESC LIMIT 10";
            const topDustingSourcesResult = yield this.pool.executeQuery(topDustingSourcesQuery);
            const attackerPatterns = topDustingSourcesResult.rows.map((row) => ({
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
            const topDustedRecipientsResult = yield this.pool.executeQuery(topDustedRecipientsQuery);
            const victimExposure = topDustedRecipientsResult.rows.map((row) => ({
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
            const dailySummaryResult = yield this.pool.executeQuery(dailySummaryQuery);
            const dailySummary = dailySummaryResult.rows.map((row) => ({
                day: row.day,
                total_transactions: parseInt(row.total_transactions),
                total_dust_transactions: parseInt(row.total_dust_transactions),
                unique_attackers: parseInt(row.unique_senders),
                unique_victims: parseInt(row.unique_recipients),
                avg_dust_amount: parseFloat(row.avg_amount || '0')
            }));
            // Query for recent transactions (limit to 10)
            const recentTransactionsQuery = "SELECT * FROM dust_transactions ORDER BY timestamp DESC LIMIT 10";
            const recentTransactionsResult = yield this.pool.executeQuery(recentTransactionsQuery);
            const recentTransactions = recentTransactionsResult.rows.map((tx) => ({
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
            const dustingSourcesResult = yield this.pool.executeQuery(dustingSourcesQuery);
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
        });
    }
}
exports.DatabaseUtils = DatabaseUtils;
exports.default = new DatabaseUtils();
