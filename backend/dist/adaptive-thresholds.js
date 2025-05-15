"use strict";
/**
 * Adaptive Thresholds for Dust Detection
 * This module provides dynamic threshold adjustment based on network conditions
 */
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
exports.AdaptiveThresholds = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const web3_js_1 = require("@solana/web3.js");
const db_utils_1 = __importDefault(require("./db/db-utils"));
class AdaptiveThresholds {
    constructor(connection, initialThresholds) {
        this.historicalDustAmounts = [];
        this.networkCongestionLevels = [];
        this.lastUpdateTimestamp = 0;
        this.updateInterval = 3600000; // 1 hour in milliseconds
        // Current thresholds
        this.currentThresholds = {
            dustAmountThreshold: 0.001, // SOL
            transferCountThreshold: 3,
            timeWindowThreshold: 86400000, // 24 hours in milliseconds
            networkFeeMultiplier: 10
        };
        this.connection = connection;
        if (initialThresholds) {
            this.currentThresholds = Object.assign(Object.assign({}, this.currentThresholds), initialThresholds);
        }
        // Load historical data from database
        this.loadHistoricalData();
    }
    loadHistoricalData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Load historical dust transaction amounts from database
                const result = yield db_utils_1.default.pool.query(`SELECT amount FROM dust_transactions 
         WHERE is_potential_dust = true 
         ORDER BY timestamp DESC LIMIT 1000`);
                this.historicalDustAmounts = result.rows.map((row) => parseFloat(row.amount));
                console.log(`Loaded ${this.historicalDustAmounts.length} historical dust amounts`);
            }
            catch (error) {
                console.error('Error loading historical dust data:', error);
            }
        });
    }
    calculateNetworkCongestion() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Get average transaction count per slot in the last hour
                const result = yield db_utils_1.default.query(`SELECT AVG(transaction_count) as avg_tx_count
         FROM network_stats
         WHERE timestamp > NOW() - INTERVAL '1 hour'`);
                // Get baseline transaction count (average over the last week)
                const baselineResult = yield db_utils_1.default.query(`SELECT AVG(transaction_count) as avg_tx_count
         FROM network_stats
         WHERE timestamp > NOW() - INTERVAL '1 week'`);
                const currentAvg = parseFloat((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.avg_tx_count) || 0;
                const baselineAvg = parseFloat((_b = baselineResult.rows[0]) === null || _b === void 0 ? void 0 : _b.avg_tx_count) || 1;
                // Calculate congestion as a ratio of current to baseline
                // Normalize to a value between 0 and 1
                return Math.min(1, currentAvg / baselineAvg);
            }
            catch (error) {
                console.error('Error calculating network congestion:', error);
                return 0.5; // Default to medium congestion on error
            }
        });
    }
    getNetworkCongestion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get recent performance samples
                const perfSamples = yield this.connection.getRecentPerformanceSamples(10);
                if (perfSamples.length === 0) {
                    return 1.0; // Default congestion level
                }
                // Calculate average TPS
                const avgTps = perfSamples.reduce((sum, sample) => sum + sample.numTransactions / sample.samplePeriodSecs, 0) / perfSamples.length;
                // Normalize congestion (higher TPS = higher congestion)
                // Typical Solana TPS ranges from 1,000 to 50,000
                const normalizedCongestion = Math.min(1.0, avgTps / 20000);
                this.networkCongestionLevels.push(normalizedCongestion);
                // Keep only the last 24 samples
                if (this.networkCongestionLevels.length > 24) {
                    this.networkCongestionLevels.shift();
                }
                return normalizedCongestion;
            }
            catch (error) {
                console.error('Error getting network congestion:', error);
                return 1.0; // Default congestion level on error
            }
        });
    }
    updateThresholds() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            // Only update if enough time has passed since last update
            if (now - this.lastUpdateTimestamp < this.updateInterval) {
                return this.currentThresholds;
            }
            this.lastUpdateTimestamp = now;
            try {
                // Get current network fee using the newer getFeeForMessage API
                // Create a dummy transaction to estimate fees
                const { blockhash } = yield this.connection.getLatestBlockhash();
                // Create a dummy keypair for fee calculation
                const payer = web3.Keypair.generate();
                // Create a simple transfer transaction
                const transaction = new web3.Transaction().add(web3.SystemProgram.transfer({
                    fromPubkey: payer.publicKey,
                    toPubkey: payer.publicKey,
                    lamports: 1000,
                }));
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = payer.publicKey;
                // Get the message from the transaction
                const message = transaction.compileMessage();
                // Get the fee for this message
                let currentFee = 0.000005; // Default fallback fee (5000 lamports) if API call fails
                try {
                    const feeResponse = yield this.connection.getFeeForMessage(message);
                    if (feeResponse && feeResponse.value) {
                        currentFee = feeResponse.value / web3_js_1.LAMPORTS_PER_SOL;
                        console.log(`Successfully retrieved current network fee: ${currentFee} SOL`);
                    }
                    else {
                        console.warn('Fee response value is null or undefined, using fallback fee');
                    }
                }
                catch (error) {
                    console.warn(`Error getting fee for message, using fallback fee: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`);
                }
                // Get current network congestion
                const currentCongestion = yield this.getNetworkCongestion();
                // Calculate adaptive dust threshold based on network fee and congestion
                const baseDustThreshold = currentFee * this.currentThresholds.networkFeeMultiplier;
                // Adjust based on congestion (higher congestion = higher threshold)
                const congestionAdjustment = 1 + (currentCongestion * 0.5); // Up to 50% increase
                // Calculate statistical threshold from historical data
                let statisticalThreshold = 0.001; // Default
                if (this.historicalDustAmounts.length > 10) {
                    // Sort amounts
                    const sortedAmounts = [...this.historicalDustAmounts].sort((a, b) => a - b);
                    // Use 10th percentile as a baseline
                    const percentileIndex = Math.floor(sortedAmounts.length * 0.1);
                    statisticalThreshold = sortedAmounts[percentileIndex];
                }
                // Combine thresholds (weighted average)
                const newDustAmountThreshold = (0.6 * baseDustThreshold * congestionAdjustment +
                    0.4 * statisticalThreshold);
                // Adjust transfer count threshold based on congestion
                // Higher congestion = require more transfers to reduce false positives
                const newTransferCountThreshold = Math.max(2, Math.round(this.currentThresholds.transferCountThreshold * (1 + (currentCongestion * 0.3))));
                // Adjust time window threshold
                // Higher congestion = shorter time window (attackers might act faster)
                const newTimeWindowThreshold = Math.max(3600000, // Minimum 1 hour
                Math.round(this.currentThresholds.timeWindowThreshold * (1 - (currentCongestion * 0.2))));
                // Update current thresholds
                this.currentThresholds = Object.assign(Object.assign({}, this.currentThresholds), { dustAmountThreshold: newDustAmountThreshold, transferCountThreshold: newTransferCountThreshold, timeWindowThreshold: newTimeWindowThreshold });
                console.log('Updated adaptive thresholds:', this.currentThresholds);
                return this.currentThresholds;
            }
            catch (error) {
                console.error('Error updating thresholds:', error);
                return this.currentThresholds;
            }
        });
    }
    getCurrentThresholds() {
        return Object.assign({}, this.currentThresholds);
    }
}
exports.AdaptiveThresholds = AdaptiveThresholds;
