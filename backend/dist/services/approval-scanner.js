"use strict";
/**
 * Approval Scanner Service
 *
 * Scans Solana wallets for SPL token delegate approvals and assesses risk.
 * Part of WalletShield Recovery - Phase 1
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
exports.approvalScanner = exports.ApprovalScanner = void 0;
const web3_js_1 = require("@solana/web3.js");
const dotenv = __importStar(require("dotenv"));
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
// SPL Token Program ID
const TOKEN_PROGRAM_ID = new web3_js_1.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
// Helius RPC configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
const RPC_ENDPOINTS = HELIUS_API_KEYS.map((apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`);
/**
 * ApprovalScanner class
 * Scans Solana wallets for token approvals and assesses risk
 */
class ApprovalScanner {
    constructor() {
        this.currentConnectionIndex = 0;
        this.isConfigured = false;
        if (RPC_ENDPOINTS.length === 0) {
            logger_1.default.warn({ source: 'ApprovalScanner' }, 'No Helius API keys configured. Approval scanning will use public RPC.');
            // Use public Solana RPC as fallback for development
            this.connections = [new web3_js_1.Connection("https://api.mainnet-beta.solana.com", "confirmed")];
        }
        else {
            this.connections = RPC_ENDPOINTS.map((endpoint) => new web3_js_1.Connection(endpoint, "confirmed"));
            this.isConfigured = true;
        }
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
     * Scan a wallet for all token approvals
     */
    scanWallet(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pubkey = new web3_js_1.PublicKey(walletAddress);
                const connection = this.getConnection();
                // Get all token accounts for this wallet
                const tokenAccounts = yield this.getTokenAccountsWithDelegates(connection, pubkey);
                // Process each approval
                const approvals = [];
                for (const account of tokenAccounts) {
                    if (account.delegateAddress) {
                        const approval = yield this.processApproval(walletAddress, account);
                        approvals.push(approval);
                        // Store in database
                        yield this.storeApproval(approval);
                    }
                }
                // Calculate security profile
                const profile = this.calculateSecurityProfile(walletAddress, approvals);
                // Store profile
                yield this.storeSecurityProfile(profile);
                return {
                    success: true,
                    walletAddress,
                    profile,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner', walletAddress }, 'Error scanning wallet');
                return {
                    success: false,
                    walletAddress,
                    profile: null,
                    error: error.message,
                };
            }
        });
    }
    /**
     * Get all token accounts with delegate authorities
     */
    getTokenAccountsWithDelegates(connection, owner) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const results = [];
            // Fetch from both Token Program and Token-2022
            for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
                try {
                    const accounts = yield connection.getParsedTokenAccountsByOwner(owner, {
                        programId,
                    });
                    for (const { pubkey, account } of accounts.value) {
                        const parsed = account.data;
                        const info = (_a = parsed.parsed) === null || _a === void 0 ? void 0 : _a.info;
                        if (info) {
                            results.push({
                                tokenAccount: pubkey.toBase58(),
                                mint: info.mint,
                                owner: info.owner,
                                delegateAddress: info.delegate || null,
                                delegatedAmount: info.delegatedAmount
                                    ? parseFloat(info.delegatedAmount.uiAmountString || "0")
                                    : 0,
                                tokenAmount: info.tokenAmount
                                    ? parseFloat(info.tokenAmount.uiAmountString || "0")
                                    : 0,
                                decimals: ((_b = info.tokenAmount) === null || _b === void 0 ? void 0 : _b.decimals) || 0,
                            });
                        }
                    }
                }
                catch (error) {
                    logger_1.default.error({ err: error, source: 'ApprovalScanner', programId: programId.toBase58() }, 'Error fetching token accounts for program');
                }
            }
            return results;
        });
    }
    /**
     * Process a single approval and calculate risk
     */
    processApproval(walletAddress, account) {
        return __awaiter(this, void 0, void 0, function* () {
            const riskFactors = yield this.calculateRiskFactors(account);
            const riskScore = this.calculateRiskScore(riskFactors);
            const delegateLabel = yield this.getDelegateLabel(account.delegateAddress);
            // Check if unlimited (delegated amount >= token amount or very large number)
            const isUnlimited = account.delegatedAmount >= account.tokenAmount ||
                account.delegatedAmount > 1000000000;
            return {
                walletAddress,
                tokenMint: account.mint,
                tokenAccount: account.tokenAccount,
                delegateAddress: account.delegateAddress,
                delegatedAmount: account.delegatedAmount,
                isUnlimited,
                riskScore,
                riskFactors,
                delegateLabel,
                status: "active",
            };
        });
    }
    /**
     * Calculate risk factors for an approval
     */
    calculateRiskFactors(account) {
        return __awaiter(this, void 0, void 0, function* () {
            const delegateAddress = account.delegateAddress;
            // Check if known malicious
            const maliciousInfo = yield this.checkKnownMalicious(delegateAddress);
            // Check if unlimited approval
            const isUnlimited = account.delegatedAmount >= account.tokenAmount ||
                account.delegatedAmount > 1000000000;
            // Check delegate age via transaction history
            const isNewDelegate = yield this.checkIsNewDelegate(delegateAddress);
            // Check transaction volume across wallets
            const hasHighVolume = yield this.checkHasHighVolume(delegateAddress);
            return {
                isKnownMalicious: maliciousInfo.isKnown,
                isUnlimited,
                isNewDelegate,
                hasHighVolume,
                victimCount: maliciousInfo.victimCount,
                reportedLosses: maliciousInfo.reportedLosses,
            };
        });
    }
    /**
     * Check if delegate is new (few transactions and not a known exchange)
     */
    checkIsNewDelegate(delegateAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connection = this.getConnection();
                const signatures = yield connection.getSignaturesForAddress(new web3_js_1.PublicKey(delegateAddress), { limit: 5 });
                // Check if delegate is a known exchange
                const exchangeResult = yield config_1.default.executeQuery(`SELECT exchange_name FROM known_exchanges WHERE address = $1`, [delegateAddress]);
                const isKnownExchange = exchangeResult.rows.length > 0;
                // A delegate is "new" if it has very few transactions and is not a known exchange
                return signatures.length < 5 && !isKnownExchange;
            }
            catch (_a) {
                // Default to true (conservative) on error
                return true;
            }
        });
    }
    /**
     * Check if delegate has high volume (approvals from many distinct wallets)
     */
    checkHasHighVolume(delegateAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const volumeResult = yield config_1.default.executeQuery(`SELECT COUNT(DISTINCT wallet_address) as unique_wallets
         FROM token_approvals
         WHERE delegate_address = $1 AND status = 'active'`, [delegateAddress]);
                const uniqueWallets = parseInt(((_a = volumeResult.rows[0]) === null || _a === void 0 ? void 0 : _a.unique_wallets) || "0", 10);
                return uniqueWallets > 10;
            }
            catch (_b) {
                return false;
            }
        });
    }
    /**
     * Calculate risk score (0-100)
     */
    calculateRiskScore(factors) {
        let score = 0;
        // Known malicious = immediate high risk
        if (factors.isKnownMalicious) {
            score += 50;
        }
        // Unlimited approval = significant risk
        if (factors.isUnlimited) {
            score += 25;
        }
        // New delegate = moderate risk
        if (factors.isNewDelegate) {
            score += 10;
        }
        // High volume delegate = potential risk
        if (factors.hasHighVolume) {
            score += 10;
        }
        // Additional risk from victim count
        if (factors.victimCount && factors.victimCount > 0) {
            score += Math.min(factors.victimCount * 2, 20);
        }
        return Math.min(score, 100);
    }
    /**
     * Check if delegate is in known malicious database
     */
    checkKnownMalicious(delegateAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT victim_count, reported_losses
         FROM known_malicious_delegates
         WHERE address = $1`, [delegateAddress]);
                if (result.rows.length > 0) {
                    return {
                        isKnown: true,
                        victimCount: result.rows[0].victim_count,
                        reportedLosses: result.rows[0].reported_losses,
                    };
                }
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error checking malicious delegate');
            }
            return { isKnown: false };
        });
    }
    /**
     * Get label for delegate address (if known)
     */
    getDelegateLabel(delegateAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check malicious database
                const malicious = yield config_1.default.executeQuery(`SELECT label FROM known_malicious_delegates WHERE address = $1`, [delegateAddress]);
                if (malicious.rows.length > 0) {
                    return malicious.rows[0].label;
                }
                // Check known exchanges
                const exchange = yield config_1.default.executeQuery(`SELECT exchange_name FROM known_exchanges WHERE address = $1`, [delegateAddress]);
                if (exchange.rows.length > 0) {
                    return exchange.rows[0].exchange_name;
                }
                return undefined;
            }
            catch (error) {
                return undefined;
            }
        });
    }
    /**
     * Calculate overall security profile for wallet
     */
    calculateSecurityProfile(walletAddress, approvals) {
        const totalApprovals = approvals.length;
        const highRiskApprovals = approvals.filter((a) => a.riskScore >= 50).length;
        const unlimitedApprovals = approvals.filter((a) => a.isUnlimited).length;
        // Calculate security score (100 = most secure, 0 = least secure)
        let securityScore = 100;
        // Deduct for high risk approvals
        securityScore -= highRiskApprovals * 15;
        // Deduct for unlimited approvals
        securityScore -= unlimitedApprovals * 10;
        // Deduct for total number of approvals
        securityScore -= Math.min(totalApprovals * 2, 20);
        securityScore = Math.max(0, securityScore);
        // Determine risk level
        let riskLevel;
        if (highRiskApprovals > 0 || securityScore < 30) {
            riskLevel = "critical";
        }
        else if (unlimitedApprovals > 2 || securityScore < 50) {
            riskLevel = "high";
        }
        else if (totalApprovals > 5 || securityScore < 70) {
            riskLevel = "medium";
        }
        else {
            riskLevel = "low";
        }
        return {
            walletAddress,
            totalApprovals,
            highRiskApprovals,
            unlimitedApprovals,
            securityScore,
            riskLevel,
            approvals,
        };
    }
    /**
     * Store approval in database
     */
    storeApproval(approval) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`INSERT INTO token_approvals (
          wallet_address, token_mint, token_account, delegate_address,
          delegated_amount, is_unlimited, risk_score, risk_factors,
          delegate_label, status, last_seen_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_address, token_account, delegate_address)
        DO UPDATE SET
          delegated_amount = EXCLUDED.delegated_amount,
          is_unlimited = EXCLUDED.is_unlimited,
          risk_score = EXCLUDED.risk_score,
          risk_factors = EXCLUDED.risk_factors,
          delegate_label = EXCLUDED.delegate_label,
          status = EXCLUDED.status,
          last_seen_at = CURRENT_TIMESTAMP`, [
                    approval.walletAddress,
                    approval.tokenMint,
                    approval.tokenAccount,
                    approval.delegateAddress,
                    approval.delegatedAmount,
                    approval.isUnlimited,
                    approval.riskScore,
                    JSON.stringify(approval.riskFactors),
                    approval.delegateLabel,
                    approval.status,
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error storing approval');
            }
        });
    }
    /**
     * Store security profile in database
     */
    storeSecurityProfile(profile) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`INSERT INTO wallet_security_profiles (
          wallet_address, total_approvals, high_risk_approvals,
          unlimited_approvals, security_score, risk_level,
          last_scanned_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (wallet_address) DO UPDATE SET
          total_approvals = EXCLUDED.total_approvals,
          high_risk_approvals = EXCLUDED.high_risk_approvals,
          unlimited_approvals = EXCLUDED.unlimited_approvals,
          security_score = EXCLUDED.security_score,
          risk_level = EXCLUDED.risk_level,
          last_scanned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP`, [
                    profile.walletAddress,
                    profile.totalApprovals,
                    profile.highRiskApprovals,
                    profile.unlimitedApprovals,
                    profile.securityScore,
                    profile.riskLevel,
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error storing security profile');
            }
        });
    }
    /**
     * Get approvals for a wallet from database
     */
    getApprovals(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM token_approvals
         WHERE wallet_address = $1 AND status = 'active'
         ORDER BY risk_score DESC`, [walletAddress]);
                return result.rows.map((row) => ({
                    walletAddress: row.wallet_address,
                    tokenMint: row.token_mint,
                    tokenAccount: row.token_account,
                    delegateAddress: row.delegate_address,
                    delegatedAmount: parseFloat(row.delegated_amount),
                    isUnlimited: row.is_unlimited,
                    riskScore: row.risk_score,
                    riskFactors: row.risk_factors,
                    delegateLabel: row.delegate_label,
                    status: row.status,
                }));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error fetching approvals');
                return [];
            }
        });
    }
    /**
     * Get security profile for a wallet
     */
    getSecurityProfile(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profileResult = yield config_1.default.executeQuery(`SELECT * FROM wallet_security_profiles WHERE wallet_address = $1`, [walletAddress]);
                if (profileResult.rows.length === 0) {
                    return null;
                }
                const row = profileResult.rows[0];
                const approvals = yield this.getApprovals(walletAddress);
                return {
                    walletAddress: row.wallet_address,
                    totalApprovals: row.total_approvals,
                    highRiskApprovals: row.high_risk_approvals,
                    unlimitedApprovals: row.unlimited_approvals,
                    securityScore: row.security_score,
                    riskLevel: row.risk_level,
                    approvals,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error fetching security profile');
                return null;
            }
        });
    }
    /**
     * Add a known malicious delegate to the database
     */
    reportMaliciousDelegate(address_1, label_1, category_1) {
        return __awaiter(this, arguments, void 0, function* (address, label, category, reportedLosses = 0) {
            try {
                yield config_1.default.executeQuery(`INSERT INTO known_malicious_delegates (
          address, label, category, reported_losses, victim_count, source
        ) VALUES ($1, $2, $3, $4, 1, 'user_report')
        ON CONFLICT (address) DO UPDATE SET
          victim_count = known_malicious_delegates.victim_count + 1,
          reported_losses = known_malicious_delegates.reported_losses + EXCLUDED.reported_losses,
          last_active_at = CURRENT_TIMESTAMP`, [address, label, category, reportedLosses]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error reporting malicious delegate');
            }
        });
    }
    /**
     * Mark an approval as revoked
     */
    markApprovalRevoked(walletAddress, tokenAccount, delegateAddress, revokeSignature) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`UPDATE token_approvals
         SET status = 'revoked',
             revoked_at = CURRENT_TIMESTAMP,
             revoke_signature = $4
         WHERE wallet_address = $1
           AND token_account = $2
           AND delegate_address = $3`, [walletAddress, tokenAccount, delegateAddress, revokeSignature]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ApprovalScanner' }, 'Error marking approval as revoked');
            }
        });
    }
}
exports.ApprovalScanner = ApprovalScanner;
// Export singleton instance
exports.approvalScanner = new ApprovalScanner();
exports.default = exports.approvalScanner;
