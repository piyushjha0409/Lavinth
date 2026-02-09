"use strict";
/**
 * Compromise Detector Service
 *
 * Monitors wallets for signs of compromise and generates alerts.
 * Part of WalletShield Recovery - Phase 2
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
exports.compromiseDetector = exports.CompromiseDetector = void 0;
const web3_js_1 = require("@solana/web3.js");
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
// Helius RPC configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
const RPC_ENDPOINTS = HELIUS_API_KEYS.length > 0
    ? HELIUS_API_KEYS.map((apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`)
    : ["https://api.mainnet-beta.solana.com"];
// Detection thresholds
const DETECTION_CONFIG = {
    // Large outflow detection
    largeOutflowThresholdSol: parseFloat(process.env.LARGE_OUTFLOW_THRESHOLD || "10"),
    largeOutflowThresholdPercent: parseFloat(process.env.LARGE_OUTFLOW_PERCENT || "50"),
    // Rapid drain detection
    rapidDrainWindowMinutes: parseInt(process.env.RAPID_DRAIN_WINDOW || "5"),
    rapidDrainTransactionCount: parseInt(process.env.RAPID_DRAIN_TX_COUNT || "3"),
    // Monitoring interval
    monitoringIntervalMs: parseInt(process.env.MONITORING_INTERVAL || "30000"),
    // Transaction lookback
    transactionLookbackCount: parseInt(process.env.TX_LOOKBACK_COUNT || "20"),
};
/**
 * CompromiseDetector class
 * Monitors wallets and detects signs of compromise
 */
class CompromiseDetector {
    constructor() {
        this.currentConnectionIndex = 0;
        this.monitoringInterval = null;
        this.knownDrainers = new Set();
        this.knownExchanges = new Map();
        this.knownBridges = new Map();
        this.threatIntel = null;
        this.connections = RPC_ENDPOINTS.map((endpoint) => new web3_js_1.Connection(endpoint, "confirmed"));
        this.loadKnownAddresses();
    }
    /**
     * Set the threat intelligence service for enhanced detection
     */
    setThreatIntel(service) {
        this.threatIntel = service;
    }
    /**
     * Refresh known addresses from database (public wrapper)
     */
    refreshKnownAddresses() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadKnownAddresses();
        });
    }
    /**
     * Get next connection (round-robin)
     */
    getConnection() {
        const connection = this.connections[this.currentConnectionIndex];
        this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
        return connection;
    }
    /**
     * Load known drainer, exchange, and bridge addresses from database
     */
    loadKnownAddresses() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Load known malicious delegates/drainers
                const drainers = yield config_1.default.executeQuery(`SELECT address FROM known_malicious_delegates`);
                drainers.rows.forEach((row) => this.knownDrainers.add(row.address));
                // Load known exchanges
                const exchanges = yield config_1.default.executeQuery(`SELECT address, exchange_name FROM known_exchanges`);
                exchanges.rows.forEach((row) => this.knownExchanges.set(row.address, row.exchange_name));
                // Load known bridges
                const bridges = yield config_1.default.executeQuery(`SELECT address, bridge_name FROM known_bridges`);
                bridges.rows.forEach((row) => this.knownBridges.set(row.address, row.bridge_name));
                logger_1.default.info({ source: 'CompromiseDetector', drainers: this.knownDrainers.size, exchanges: this.knownExchanges.size, bridges: this.knownBridges.size }, 'Loaded known addresses');
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error loading known addresses');
            }
        });
    }
    /**
     * Register a wallet for monitoring
     */
    registerWallet(walletAddress_1, userId_1, alertChannels_1) {
        return __awaiter(this, arguments, void 0, function* (walletAddress, userId, alertChannels, monitoringLevel = "standard") {
            const connection = this.getConnection();
            // Get current balance
            const pubkey = new web3_js_1.PublicKey(walletAddress);
            const balance = yield connection.getBalance(pubkey);
            const balanceSol = balance / 1e9;
            const wallet = {
                walletAddress,
                userId,
                monitoringLevel,
                alertChannels: alertChannels || {},
                baselineBalance: balanceSol,
                lastKnownBalance: balanceSol,
                isCompromised: false,
            };
            // Store in database
            yield config_1.default.executeQuery(`INSERT INTO monitored_wallets (
        wallet_address, user_id, monitoring_level, alert_channels,
        baseline_balance, last_known_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        monitoring_level = EXCLUDED.monitoring_level,
        alert_channels = EXCLUDED.alert_channels,
        updated_at = CURRENT_TIMESTAMP`, [
                walletAddress,
                userId,
                monitoringLevel,
                JSON.stringify(alertChannels || {}),
                balanceSol,
                balanceSol,
            ]);
            return wallet;
        });
    }
    /**
     * Analyze a wallet for signs of compromise
     */
    analyzeWallet(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.getConnection();
            const pubkey = new web3_js_1.PublicKey(walletAddress);
            const alerts = [];
            const transactions = [];
            let isCompromised = false;
            let riskScore = 0;
            try {
                // Get recent transactions
                const signatures = yield connection.getSignaturesForAddress(pubkey, {
                    limit: DETECTION_CONFIG.transactionLookbackCount,
                });
                // Get current balance
                const currentBalance = yield connection.getBalance(pubkey);
                const currentBalanceSol = currentBalance / 1e9;
                // Get monitored wallet info
                const walletInfo = yield this.getMonitoredWallet(walletAddress);
                const baselineBalance = (walletInfo === null || walletInfo === void 0 ? void 0 : walletInfo.baselineBalance) || currentBalanceSol;
                // Analyze each transaction
                for (const sig of signatures) {
                    const tx = yield this.analyzeTransaction(connection, sig, walletAddress);
                    if (tx) {
                        transactions.push(tx);
                        riskScore += tx.riskScore;
                    }
                }
                // Detection: Large outflow
                const largeOutflowAlert = this.detectLargeOutflow(walletAddress, baselineBalance, currentBalanceSol, transactions);
                if (largeOutflowAlert) {
                    alerts.push(largeOutflowAlert);
                    if (largeOutflowAlert.severity === "critical")
                        isCompromised = true;
                }
                // Detection: Rapid drain
                const rapidDrainAlert = this.detectRapidDrain(walletAddress, transactions);
                if (rapidDrainAlert) {
                    alerts.push(rapidDrainAlert);
                    if (rapidDrainAlert.severity === "critical")
                        isCompromised = true;
                }
                // Detection: Known drainer interaction
                const drainerAlert = this.detectKnownDrainer(walletAddress, transactions);
                if (drainerAlert) {
                    alerts.push(drainerAlert);
                    isCompromised = true;
                }
                // Detection: Exchange deposits (potential laundering)
                const exchangeAlerts = this.detectExchangeDeposits(walletAddress, transactions);
                alerts.push(...exchangeAlerts);
                // Detection: Bridge transfers
                const bridgeAlerts = this.detectBridgeTransfers(walletAddress, transactions);
                alerts.push(...bridgeAlerts);
                // Update wallet status
                if (isCompromised && walletInfo) {
                    yield this.markWalletCompromised(walletAddress);
                }
                // Store alerts
                for (const alert of alerts) {
                    yield this.storeAlert(alert);
                }
                // Update last known balance
                yield this.updateWalletBalance(walletAddress, currentBalanceSol);
                return {
                    isCompromised,
                    alerts,
                    transactions,
                    riskScore: Math.min(riskScore, 100),
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector', walletAddress }, 'Error analyzing wallet');
                return {
                    isCompromised: false,
                    alerts: [],
                    transactions: [],
                    riskScore: 0,
                };
            }
        });
    }
    /**
     * Analyze a single transaction
     */
    analyzeTransaction(connection, sigInfo, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const tx = yield connection.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0,
                });
                if (!tx || !tx.meta)
                    return null;
                const suspicionReasons = [];
                let riskScore = 0;
                let transactionType = "unknown";
                let amount = 0;
                let counterparty;
                let tokenMint;
                // Analyze pre/post balances to determine flow
                const preBalance = tx.meta.preBalances[0] || 0;
                const postBalance = tx.meta.postBalances[0] || 0;
                const balanceChange = (postBalance - preBalance) / 1e9;
                if (balanceChange < 0) {
                    transactionType = "transfer_out";
                    amount = Math.abs(balanceChange);
                    // Check if large outflow
                    if (amount > DETECTION_CONFIG.largeOutflowThresholdSol) {
                        suspicionReasons.push("Large outflow detected");
                        riskScore += 30;
                    }
                }
                else if (balanceChange > 0) {
                    transactionType = "transfer_in";
                    amount = balanceChange;
                }
                // Check for token transfers
                if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
                    // Analyze token balance changes
                    for (const postToken of tx.meta.postTokenBalances) {
                        const preToken = tx.meta.preTokenBalances.find((t) => t.accountIndex === postToken.accountIndex);
                        if (preToken && postToken.uiTokenAmount && preToken.uiTokenAmount) {
                            const tokenChange = (postToken.uiTokenAmount.uiAmount || 0) -
                                (preToken.uiTokenAmount.uiAmount || 0);
                            if (tokenChange < 0) {
                                tokenMint = postToken.mint;
                                transactionType = "token_transfer_out";
                            }
                        }
                    }
                }
                // Extract counterparty from instructions
                const instructions = tx.transaction.message.instructions;
                for (const ix of instructions) {
                    if ("parsed" in ix && ix.parsed) {
                        const parsed = ix.parsed;
                        if ((_a = parsed.info) === null || _a === void 0 ? void 0 : _a.destination) {
                            counterparty = parsed.info.destination;
                        }
                        else if ((_b = parsed.info) === null || _b === void 0 ? void 0 : _b.newAuthority) {
                            counterparty = parsed.info.newAuthority;
                        }
                    }
                }
                // Check if counterparty is known drainer
                if (counterparty && this.knownDrainers.has(counterparty)) {
                    suspicionReasons.push("Interaction with known drainer");
                    riskScore += 50;
                }
                // Check if counterparty is exchange
                if (counterparty && this.knownExchanges.has(counterparty)) {
                    suspicionReasons.push(`Transfer to exchange: ${this.knownExchanges.get(counterparty)}`);
                    riskScore += 10;
                }
                // Check if counterparty is bridge
                if (counterparty && this.knownBridges.has(counterparty)) {
                    suspicionReasons.push(`Bridge transfer: ${this.knownBridges.get(counterparty)}`);
                    riskScore += 15;
                }
                // Helius enhanced parsing for richer type classification
                if (this.threatIntel) {
                    try {
                        const enhanced = yield this.threatIntel.parseTransactionSignatures([sigInfo.signature]);
                        if (enhanced.length > 0) {
                            const eTx = enhanced[0];
                            if (eTx.type && eTx.type !== "UNKNOWN") {
                                transactionType = eTx.type.toLowerCase();
                            }
                            // Extract counterparty from native transfers if not already found
                            if (!counterparty && ((_c = eTx.nativeTransfers) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                                const outTransfer = eTx.nativeTransfers.find((t) => t.fromUserAccount === walletAddress);
                                if (outTransfer) {
                                    counterparty = outTransfer.toUserAccount;
                                }
                            }
                        }
                    }
                    catch (err) {
                        // Helius enhancement failed, continue with raw parsing
                    }
                }
                const isSuspicious = suspicionReasons.length > 0;
                const walletTx = {
                    signature: sigInfo.signature,
                    walletAddress,
                    transactionType,
                    amount,
                    tokenMint,
                    counterparty,
                    isSuspicious,
                    suspicionReasons,
                    riskScore,
                    timestamp: new Date((sigInfo.blockTime || 0) * 1000),
                };
                // Store transaction
                yield this.storeTransaction(walletTx);
                return walletTx;
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error analyzing transaction');
                return null;
            }
        });
    }
    /**
     * Detect large outflow
     */
    detectLargeOutflow(walletAddress, baselineBalance, currentBalance, transactions) {
        const balanceLoss = baselineBalance - currentBalance;
        const lossPercent = baselineBalance > 0 ? (balanceLoss / baselineBalance) * 100 : 0;
        if (balanceLoss > DETECTION_CONFIG.largeOutflowThresholdSol ||
            lossPercent > DETECTION_CONFIG.largeOutflowThresholdPercent) {
            const severity = lossPercent > 80 ? "critical" : lossPercent > 50 ? "high" : "medium";
            return {
                alertId: (0, uuid_1.v4)(),
                walletAddress,
                alertType: "large_outflow",
                severity,
                title: "Large Balance Outflow Detected",
                description: `Wallet lost ${balanceLoss.toFixed(4)} SOL (${lossPercent.toFixed(1)}% of baseline balance)`,
                metadata: {
                    baselineBalance,
                    currentBalance,
                    balanceLoss,
                    lossPercent,
                },
                createdAt: new Date(),
            };
        }
        return null;
    }
    /**
     * Detect rapid drain pattern
     */
    detectRapidDrain(walletAddress, transactions) {
        const windowMs = DETECTION_CONFIG.rapidDrainWindowMinutes * 60 * 1000;
        const now = Date.now();
        // Filter outgoing transactions within window
        const recentOutflows = transactions.filter((tx) => tx.transactionType.includes("out") &&
            now - tx.timestamp.getTime() < windowMs);
        if (recentOutflows.length >= DETECTION_CONFIG.rapidDrainTransactionCount) {
            const totalAmount = recentOutflows.reduce((sum, tx) => sum + tx.amount, 0);
            return {
                alertId: (0, uuid_1.v4)(),
                walletAddress,
                alertType: "rapid_drain",
                severity: "critical",
                title: "Rapid Drain Detected",
                description: `${recentOutflows.length} outgoing transactions totaling ${totalAmount.toFixed(4)} SOL in ${DETECTION_CONFIG.rapidDrainWindowMinutes} minutes`,
                metadata: {
                    transactionCount: recentOutflows.length,
                    totalAmount,
                    windowMinutes: DETECTION_CONFIG.rapidDrainWindowMinutes,
                    transactions: recentOutflows.map((tx) => tx.signature),
                },
                createdAt: new Date(),
            };
        }
        return null;
    }
    /**
     * Detect interaction with known drainer
     */
    detectKnownDrainer(walletAddress, transactions) {
        const drainerTxs = transactions.filter((tx) => tx.counterparty && this.knownDrainers.has(tx.counterparty));
        if (drainerTxs.length > 0) {
            return {
                alertId: (0, uuid_1.v4)(),
                walletAddress,
                alertType: "known_drainer",
                severity: "critical",
                title: "Known Drainer Detected",
                description: `Wallet interacted with ${drainerTxs.length} known drainer address(es)`,
                metadata: {
                    drainerAddresses: [...new Set(drainerTxs.map((tx) => tx.counterparty))],
                    transactions: drainerTxs.map((tx) => tx.signature),
                },
                createdAt: new Date(),
            };
        }
        return null;
    }
    /**
     * Detect deposits to exchanges
     */
    detectExchangeDeposits(walletAddress, transactions) {
        const alerts = [];
        const exchangeTxs = transactions.filter((tx) => tx.counterparty &&
            this.knownExchanges.has(tx.counterparty) &&
            tx.transactionType.includes("out"));
        for (const tx of exchangeTxs) {
            const exchangeName = this.knownExchanges.get(tx.counterparty);
            alerts.push({
                alertId: (0, uuid_1.v4)(),
                walletAddress,
                alertType: "exchange_deposit",
                severity: "medium",
                title: `Deposit to ${exchangeName}`,
                description: `${tx.amount.toFixed(4)} SOL deposited to ${exchangeName}`,
                metadata: {
                    exchangeName,
                    exchangeAddress: tx.counterparty,
                    amount: tx.amount,
                    signature: tx.signature,
                },
                createdAt: new Date(),
            });
        }
        return alerts;
    }
    /**
     * Detect bridge transfers
     */
    detectBridgeTransfers(walletAddress, transactions) {
        const alerts = [];
        const bridgeTxs = transactions.filter((tx) => tx.counterparty &&
            this.knownBridges.has(tx.counterparty) &&
            tx.transactionType.includes("out"));
        for (const tx of bridgeTxs) {
            const bridgeName = this.knownBridges.get(tx.counterparty);
            alerts.push({
                alertId: (0, uuid_1.v4)(),
                walletAddress,
                alertType: "bridge_transfer",
                severity: "high",
                title: `Bridge Transfer via ${bridgeName}`,
                description: `${tx.amount.toFixed(4)} SOL bridged via ${bridgeName} - funds may be leaving Solana`,
                metadata: {
                    bridgeName,
                    bridgeAddress: tx.counterparty,
                    amount: tx.amount,
                    signature: tx.signature,
                },
                createdAt: new Date(),
            });
        }
        return alerts;
    }
    /**
     * Store transaction in database
     */
    storeTransaction(tx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`INSERT INTO wallet_transactions (
          wallet_address, signature, transaction_type, amount, token_mint,
          counterparty, is_suspicious, suspicion_reasons, risk_score, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (signature) DO UPDATE SET
          is_suspicious = EXCLUDED.is_suspicious,
          suspicion_reasons = EXCLUDED.suspicion_reasons,
          risk_score = EXCLUDED.risk_score`, [
                    tx.walletAddress,
                    tx.signature,
                    tx.transactionType,
                    tx.amount,
                    tx.tokenMint,
                    tx.counterparty,
                    tx.isSuspicious,
                    tx.suspicionReasons,
                    tx.riskScore,
                    tx.timestamp,
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error storing transaction');
            }
        });
    }
    /**
     * Store alert in database
     */
    storeAlert(alert) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`INSERT INTO compromise_alerts (
          alert_id, wallet_address, alert_type, severity, title, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (alert_id) DO NOTHING`, [
                    alert.alertId,
                    alert.walletAddress,
                    alert.alertType,
                    alert.severity,
                    alert.title,
                    alert.description,
                    JSON.stringify(alert.metadata),
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error storing alert');
            }
        });
    }
    /**
     * Get monitored wallet from database
     */
    getMonitoredWallet(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM monitored_wallets WHERE wallet_address = $1`, [walletAddress]);
                if (result.rows.length === 0)
                    return null;
                const row = result.rows[0];
                return {
                    walletAddress: row.wallet_address,
                    userId: row.user_id,
                    monitoringLevel: row.monitoring_level,
                    alertChannels: row.alert_channels,
                    baselineBalance: parseFloat(row.baseline_balance),
                    lastKnownBalance: parseFloat(row.last_known_balance),
                    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : undefined,
                    isCompromised: row.is_compromised,
                    compromiseDetectedAt: row.compromise_detected_at
                        ? new Date(row.compromise_detected_at)
                        : undefined,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error getting monitored wallet');
                return null;
            }
        });
    }
    /**
     * Mark wallet as compromised
     */
    markWalletCompromised(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`UPDATE monitored_wallets SET
          is_compromised = true,
          compromise_detected_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = $1`, [walletAddress]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error marking wallet compromised');
            }
        });
    }
    /**
     * Update wallet balance
     */
    updateWalletBalance(walletAddress, balance) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`UPDATE monitored_wallets SET
          last_known_balance = $2,
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = $1`, [walletAddress, balance]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error updating wallet balance');
            }
        });
    }
    /**
     * Get alerts for a wallet
     */
    getAlerts(walletAddress_1) {
        return __awaiter(this, arguments, void 0, function* (walletAddress, limit = 50) {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM compromise_alerts
         WHERE wallet_address = $1
         ORDER BY created_at DESC
         LIMIT $2`, [walletAddress, limit]);
                return result.rows.map((row) => ({
                    alertId: row.alert_id,
                    walletAddress: row.wallet_address,
                    alertType: row.alert_type,
                    severity: row.severity,
                    title: row.title,
                    description: row.description,
                    metadata: row.metadata,
                    createdAt: new Date(row.created_at),
                }));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error getting alerts');
                return [];
            }
        });
    }
    /**
     * Get recent transactions for a wallet
     */
    getTransactions(walletAddress_1) {
        return __awaiter(this, arguments, void 0, function* (walletAddress, limit = 50) {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM wallet_transactions
         WHERE wallet_address = $1
         ORDER BY timestamp DESC
         LIMIT $2`, [walletAddress, limit]);
                return result.rows.map((row) => ({
                    signature: row.signature,
                    walletAddress: row.wallet_address,
                    transactionType: row.transaction_type,
                    amount: parseFloat(row.amount),
                    tokenMint: row.token_mint,
                    counterparty: row.counterparty,
                    isSuspicious: row.is_suspicious,
                    suspicionReasons: row.suspicion_reasons || [],
                    riskScore: row.risk_score,
                    timestamp: new Date(row.timestamp),
                }));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error getting transactions');
                return [];
            }
        });
    }
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`UPDATE compromise_alerts SET
          is_acknowledged = true,
          acknowledged_at = CURRENT_TIMESTAMP
        WHERE alert_id = $1`, [alertId]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'CompromiseDetector' }, 'Error acknowledging alert');
            }
        });
    }
}
exports.CompromiseDetector = CompromiseDetector;
// Export singleton instance
exports.compromiseDetector = new CompromiseDetector();
exports.default = exports.compromiseDetector;
