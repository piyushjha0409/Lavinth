"use strict";
/**
 * Adaptive Thresholds for Dust Detection
 * Dynamically adjusts thresholds based on network conditions and historical data
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
        this.updateInterval = 3600000; // 1 hour
        this.currentThresholds = {
            dustAmountThreshold: 0.001, // in SOL
            transferCountThreshold: 3,
            timeWindowThreshold: 86400000, // 24 hours in ms
            networkFeeMultiplier: 10,
        };
        this.connection = connection;
        if (initialThresholds) {
            this.currentThresholds = Object.assign(Object.assign({}, this.currentThresholds), initialThresholds);
        }
        this.loadHistoricalData();
    }
    loadHistoricalData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_utils_1.default.pool.query(`SELECT amount FROM dust_transactions 
         WHERE is_potential_dust = true 
         ORDER BY timestamp DESC 
         LIMIT 1000`);
                this.historicalDustAmounts = result.rows.map((row) => parseFloat(String(row.amount)));
                console.log(`Loaded ${this.historicalDustAmounts.length} historical dust amounts`);
            }
            catch (error) {
                console.error('Failed to load historical dust data:', error);
            }
        });
    }
    getNetworkCongestion() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const perfSamples = yield this.connection.getRecentPerformanceSamples(10);
                if (!perfSamples.length)
                    return 1.0;
                const avgTps = perfSamples.reduce((sum, s) => sum + s.numTransactions / s.samplePeriodSecs, 0) /
                    perfSamples.length;
                const normalizedCongestion = Math.min(1.0, avgTps / 20000); // Normalize to ~1 at 20k TPS
                this.networkCongestionLevels.push(normalizedCongestion);
                if (this.networkCongestionLevels.length > 24) {
                    this.networkCongestionLevels.shift();
                }
                return normalizedCongestion;
            }
            catch (error) {
                console.error('Failed to fetch network congestion:', error);
                return 1.0;
            }
        });
    }
    /**
     * Dynamically updates thresholds based on network fees and congestion
     */
    updateThresholds() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (now - this.lastUpdateTimestamp < this.updateInterval) {
                return this.getCurrentThresholds();
            }
            this.lastUpdateTimestamp = now;
            try {
                const { blockhash } = yield this.connection.getLatestBlockhash();
                const payer = web3.Keypair.generate();
                const transaction = new web3.Transaction().add(web3.SystemProgram.transfer({
                    fromPubkey: payer.publicKey,
                    toPubkey: payer.publicKey,
                    lamports: 1000,
                }));
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = payer.publicKey;
                const message = transaction.compileMessage();
                let currentFee = 0.000005; // 5000 lamports default fallback
                try {
                    const feeResponse = yield this.connection.getFeeForMessage(message);
                    if (feeResponse === null || feeResponse === void 0 ? void 0 : feeResponse.value) {
                        currentFee = feeResponse.value / web3_js_1.LAMPORTS_PER_SOL;
                        console.log(`Network fee retrieved: ${currentFee} SOL`);
                    }
                    else {
                        console.warn('Fee response is empty, using fallback');
                    }
                }
                catch (err) {
                    console.warn(`Fee estimation error: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`);
                }
                const currentCongestion = yield this.getNetworkCongestion();
                const baseDustThreshold = currentFee * this.currentThresholds.networkFeeMultiplier;
                const congestionAdjustment = 1 + currentCongestion * 0.5;
                let statisticalThreshold = 0.001;
                if (this.historicalDustAmounts.length > 10) {
                    const sorted = [...this.historicalDustAmounts].sort((a, b) => a - b);
                    const index = Math.floor(sorted.length * 0.1); // 10th percentile
                    statisticalThreshold = sorted[index];
                }
                const newDustAmountThreshold = 0.6 * baseDustThreshold * congestionAdjustment +
                    0.4 * statisticalThreshold;
                const newTransferCountThreshold = Math.max(2, Math.round(this.currentThresholds.transferCountThreshold * (1 + currentCongestion * 0.3)));
                const newTimeWindowThreshold = Math.max(3600000, Math.round(this.currentThresholds.timeWindowThreshold * (1 - currentCongestion * 0.2)));
                this.currentThresholds = Object.assign(Object.assign({}, this.currentThresholds), { dustAmountThreshold: newDustAmountThreshold, transferCountThreshold: newTransferCountThreshold, timeWindowThreshold: newTimeWindowThreshold });
                console.log('Adaptive thresholds updated:', this.currentThresholds);
                return this.currentThresholds;
            }
            catch (err) {
                console.error('Threshold update error:', err);
                return this.getCurrentThresholds();
            }
        });
    }
    getCurrentThresholds() {
        return Object.assign({}, this.currentThresholds);
    }
}
exports.AdaptiveThresholds = AdaptiveThresholds;
