"use strict";
/**
 * Revocation Engine Service
 *
 * Generates and manages token approval revocations for Solana wallets.
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
exports.revocationEngine = exports.RevocationEngine = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
const approval_scanner_1 = require("./approval-scanner");
dotenv.config();
// Helius RPC configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
const RPC_ENDPOINTS = HELIUS_API_KEYS.map((apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`);
// Token Program IDs
const SPL_TOKEN_PROGRAM_ID = new web3_js_1.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
/**
 * RevocationEngine class
 * Handles generation of revocation transactions and tracking recovery sessions
 */
class RevocationEngine {
    constructor() {
        this.currentConnectionIndex = 0;
        if (RPC_ENDPOINTS.length === 0) {
            logger_1.default.warn({ source: 'RevocationEngine' }, 'No Helius API keys configured. Revocation engine will use public RPC.');
            // Use public Solana RPC as fallback for development
            this.connections = [new web3_js_1.Connection("https://api.mainnet-beta.solana.com", "confirmed")];
        }
        else {
            this.connections = RPC_ENDPOINTS.map((endpoint) => new web3_js_1.Connection(endpoint, "confirmed"));
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
     * Create a revocation plan for a wallet
     * This generates all the instructions needed but doesn't execute them
     */
    createRevocationPlan(walletAddress, approvals) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const sessionId = (0, uuid_1.v4)();
            const connection = this.getConnection();
            // Get approvals if not provided
            if (!approvals) {
                const scanResult = yield approval_scanner_1.approvalScanner.scanWallet(walletAddress);
                approvals = ((_a = scanResult.profile) === null || _a === void 0 ? void 0 : _a.approvals) || [];
            }
            // Filter to only active approvals
            const activeApprovals = approvals.filter((a) => a.status === "active");
            if (activeApprovals.length === 0) {
                return {
                    sessionId,
                    walletAddress,
                    totalApprovals: 0,
                    totalTransactions: 0,
                    estimatedTotalFee: 0,
                    transactions: [],
                    createdAt: new Date(),
                };
            }
            // Generate revocation instructions
            const instructions = [];
            const ownerPubkey = new web3_js_1.PublicKey(walletAddress);
            for (const approval of activeApprovals) {
                try {
                    const tokenAccountPubkey = new web3_js_1.PublicKey(approval.tokenAccount);
                    // Create revoke instruction
                    const revokeIx = (0, spl_token_1.createRevokeInstruction)(tokenAccountPubkey, ownerPubkey, [], // No multi-sig signers
                    SPL_TOKEN_PROGRAM_ID);
                    instructions.push({
                        tokenAccount: approval.tokenAccount,
                        delegateAddress: approval.delegateAddress,
                        instruction: revokeIx,
                        estimatedFee: 5000, // ~0.000005 SOL per instruction
                    });
                }
                catch (error) {
                    logger_1.default.error({ err: error, source: 'RevocationEngine', tokenAccount: approval.tokenAccount }, 'Error creating revoke instruction');
                }
            }
            // Group instructions into transactions (max ~20 instructions per tx for safety)
            const maxInstructionsPerTx = 20;
            const transactions = [];
            let txIndex = 0;
            for (let i = 0; i < instructions.length; i += maxInstructionsPerTx) {
                const txInstructions = instructions.slice(i, i + maxInstructionsPerTx);
                const estimatedFee = txInstructions.reduce((sum, ix) => sum + ix.estimatedFee, 0) + 5000; // Base fee
                transactions.push({
                    transactionIndex: txIndex++,
                    instructions: txInstructions,
                    estimatedFee,
                });
            }
            const totalFee = transactions.reduce((sum, tx) => sum + tx.estimatedFee, 0);
            // Create recovery session in database
            yield this.createRecoverySession(sessionId, walletAddress, activeApprovals.length);
            return {
                sessionId,
                walletAddress,
                totalApprovals: activeApprovals.length,
                totalTransactions: transactions.length,
                estimatedTotalFee: totalFee,
                transactions,
                createdAt: new Date(),
            };
        });
    }
    /**
     * Build unsigned transactions from a revocation plan
     * Returns base64-encoded serialized transactions for client-side signing
     */
    buildUnsignedTransactions(plan) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.getConnection();
            const { blockhash, lastValidBlockHeight } = yield connection.getLatestBlockhash();
            const feePayer = new web3_js_1.PublicKey(plan.walletAddress);
            const serializedTransactions = [];
            for (const txPlan of plan.transactions) {
                const transaction = new web3_js_1.Transaction();
                // Add compute budget for priority (optional)
                transaction.add(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }));
                // Add all revoke instructions
                for (const ix of txPlan.instructions) {
                    transaction.add(ix.instruction);
                }
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = feePayer;
                // Serialize (unsigned)
                const serialized = transaction.serialize({
                    requireAllSignatures: false,
                    verifySignatures: false,
                });
                serializedTransactions.push(serialized.toString("base64"));
            }
            return serializedTransactions;
        });
    }
    /**
     * Process signed transactions and submit to network
     * Called after client signs the transactions
     */
    submitSignedTransactions(sessionId, signedTransactions) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield this.getRecoverySession(sessionId);
            if (!session) {
                return {
                    success: false,
                    sessionId,
                    walletAddress: "",
                    totalRevoked: 0,
                    totalFailed: 0,
                    signatures: [],
                    errors: ["Session not found"],
                };
            }
            const connection = this.getConnection();
            const signatures = [];
            const errors = [];
            let totalRevoked = 0;
            let totalFailed = 0;
            // Update session status
            yield this.updateRecoverySessionStatus(sessionId, "in_progress");
            for (const signedTxBase64 of signedTransactions) {
                try {
                    const signedTxBuffer = Buffer.from(signedTxBase64, "base64");
                    // Send transaction
                    const signature = yield connection.sendRawTransaction(signedTxBuffer, {
                        skipPreflight: false,
                        preflightCommitment: "confirmed",
                    });
                    // Confirm transaction
                    const confirmation = yield connection.confirmTransaction(signature, "confirmed");
                    if (confirmation.value.err) {
                        errors.push(`Transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`);
                        totalFailed++;
                    }
                    else {
                        signatures.push(signature);
                        // Count instructions as revoked (approximate, could parse tx for exact count)
                        totalRevoked++;
                    }
                }
                catch (error) {
                    errors.push(`Transaction submission failed: ${error.message}`);
                    totalFailed++;
                }
            }
            // Update session with results
            yield this.completeRecoverySession(sessionId, totalRevoked, signatures, errors);
            return {
                success: errors.length === 0,
                sessionId,
                walletAddress: session.walletAddress,
                totalRevoked,
                totalFailed,
                signatures,
                errors,
            };
        });
    }
    /**
     * Create a recovery session in database
     */
    createRecoverySession(sessionId, walletAddress, totalApprovals) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`INSERT INTO recovery_sessions (
          session_id, wallet_address, status, total_approvals_found
        ) VALUES ($1, $2, 'initiated', $3)`, [sessionId, walletAddress, totalApprovals]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'RevocationEngine' }, 'Error creating recovery session');
            }
        });
    }
    /**
     * Update recovery session status
     */
    updateRecoverySessionStatus(sessionId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`UPDATE recovery_sessions SET status = $2 WHERE session_id = $1`, [sessionId, status]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'RevocationEngine' }, 'Error updating recovery session');
            }
        });
    }
    /**
     * Complete a recovery session
     */
    completeRecoverySession(sessionId, approvalsRevoked, signatures, errors) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = errors.length === 0 ? "completed" : "failed";
                yield config_1.default.executeQuery(`UPDATE recovery_sessions SET
          status = $2,
          approvals_revoked = $3,
          revoke_signatures = $4,
          error_log = $5,
          completed_at = CURRENT_TIMESTAMP
        WHERE session_id = $1`, [
                    sessionId,
                    status,
                    approvalsRevoked,
                    signatures,
                    JSON.stringify({ errors }),
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'RevocationEngine' }, 'Error completing recovery session');
            }
        });
    }
    /**
     * Get recovery session from database
     */
    getRecoverySession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM recovery_sessions WHERE session_id = $1`, [sessionId]);
                if (result.rows.length === 0) {
                    return null;
                }
                const row = result.rows[0];
                return {
                    sessionId: row.session_id,
                    walletAddress: row.wallet_address,
                    status: row.status,
                    totalApprovalsFound: row.total_approvals_found,
                    approvalsRevoked: row.approvals_revoked || 0,
                    revokeSignatures: row.revoke_signatures || [],
                    assetsAtRisk: parseFloat(row.assets_at_risk || "0"),
                    assetsSaved: parseFloat(row.assets_saved || "0"),
                    assetsLost: parseFloat(row.assets_lost || "0"),
                    initiatedAt: new Date(row.initiated_at),
                    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'RevocationEngine' }, 'Error fetching recovery session');
                return null;
            }
        });
    }
    /**
     * Get all recovery sessions for a wallet
     */
    getRecoverySessionsForWallet(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM recovery_sessions
         WHERE wallet_address = $1
         ORDER BY initiated_at DESC`, [walletAddress]);
                return result.rows.map((row) => ({
                    sessionId: row.session_id,
                    walletAddress: row.wallet_address,
                    status: row.status,
                    totalApprovalsFound: row.total_approvals_found,
                    approvalsRevoked: row.approvals_revoked || 0,
                    revokeSignatures: row.revoke_signatures || [],
                    assetsAtRisk: parseFloat(row.assets_at_risk || "0"),
                    assetsSaved: parseFloat(row.assets_saved || "0"),
                    assetsLost: parseFloat(row.assets_lost || "0"),
                    initiatedAt: new Date(row.initiated_at),
                    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
                }));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'RevocationEngine' }, 'Error fetching recovery sessions');
                return [];
            }
        });
    }
    /**
     * Quick revoke - Generate a single revoke instruction for one approval
     */
    createSingleRevokeInstruction(walletAddress, tokenAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connection = this.getConnection();
                const ownerPubkey = new web3_js_1.PublicKey(walletAddress);
                const tokenAccountPubkey = new web3_js_1.PublicKey(tokenAccount);
                // Verify the token account exists and has a delegate
                const accountInfo = yield (0, spl_token_1.getAccount)(connection, tokenAccountPubkey);
                if (!accountInfo.delegate) {
                    return null;
                }
                // Create revoke instruction
                const revokeIx = (0, spl_token_1.createRevokeInstruction)(tokenAccountPubkey, ownerPubkey, [], SPL_TOKEN_PROGRAM_ID);
                // Build transaction
                const { blockhash } = yield connection.getLatestBlockhash();
                const transaction = new web3_js_1.Transaction();
                transaction.add(revokeIx);
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = ownerPubkey;
                const serialized = transaction.serialize({
                    requireAllSignatures: false,
                    verifySignatures: false,
                });
                return {
                    instruction: revokeIx,
                    serialized: serialized.toString("base64"),
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'RevocationEngine' }, 'Error creating single revoke instruction');
                return null;
            }
        });
    }
    /**
     * Emergency revoke all - Create transactions to revoke all high-risk approvals
     */
    createEmergencyRevokePlan(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Scan wallet for current approvals
            const scanResult = yield approval_scanner_1.approvalScanner.scanWallet(walletAddress);
            const approvals = ((_a = scanResult.profile) === null || _a === void 0 ? void 0 : _a.approvals) || [];
            // Filter to high-risk approvals only (risk score >= 50 or unlimited)
            const highRiskApprovals = approvals.filter((a) => a.riskScore >= 50 || a.isUnlimited);
            // Create revocation plan for high-risk approvals
            return this.createRevocationPlan(walletAddress, highRiskApprovals);
        });
    }
}
exports.RevocationEngine = RevocationEngine;
// Export singleton instance
exports.revocationEngine = new RevocationEngine();
exports.default = exports.revocationEngine;
