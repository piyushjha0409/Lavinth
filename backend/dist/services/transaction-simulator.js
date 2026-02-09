"use strict";
/**
 * Transaction Simulator Service
 * Simulates Solana transactions to detect hidden malicious effects before signing
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
exports.transactionSimulator = exports.TransactionSimulator = void 0;
const web3_js_1 = require("@solana/web3.js");
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Known program IDs
const KNOWN_PROGRAMS = {
    TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    TOKEN_2022_PROGRAM: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    SYSTEM_PROGRAM: '11111111111111111111111111111111',
    MEMO_PROGRAM: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    COMPUTE_BUDGET: 'ComputeBudget111111111111111111111111111111',
    METAPLEX_TOKEN_METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
};
// Known malicious patterns
const MALICIOUS_PATTERNS = {
    UNLIMITED_APPROVAL: 'unlimited_token_approval',
    UNKNOWN_PROGRAM: 'unknown_program_interaction',
    SUSPICIOUS_TRANSFER: 'suspicious_transfer_pattern',
    DRAINER_SIGNATURE: 'known_drainer_signature',
    HIDDEN_APPROVAL: 'hidden_approval_in_batch',
    AUTHORITY_CHANGE: 'token_authority_change',
    CLOSE_ACCOUNT: 'close_account_to_unknown',
};
class TransactionSimulator {
    constructor(connection, pool) {
        this.maliciousAddresses = new Set();
        this.verifiedPrograms = new Map();
        this.connection = connection;
        this.pool = pool;
        this.initializeKnownData();
    }
    initializeKnownData() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load malicious addresses from database
            try {
                const result = yield this.pool.query('SELECT address FROM known_malicious_delegates');
                result.rows.forEach(row => this.maliciousAddresses.add(row.address));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'TransactionSimulator' }, 'Failed to load malicious addresses');
            }
            // Initialize verified programs
            Object.entries(KNOWN_PROGRAMS).forEach(([name, id]) => {
                this.verifiedPrograms.set(id, name);
            });
        });
    }
    /**
     * Simulate a transaction and analyze its effects
     */
    simulateTransaction(serializedTransaction, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const warnings = [];
            const effects = [];
            const balanceChanges = [];
            const approvalChanges = [];
            const programsInvoked = [];
            try {
                // Decode the transaction
                const txBuffer = Buffer.from(serializedTransaction, 'base64');
                let transaction;
                let instructions = [];
                try {
                    // Try to decode as versioned transaction first
                    transaction = web3_js_1.VersionedTransaction.deserialize(txBuffer);
                    const message = transaction.message;
                    // Extract instructions from versioned transaction
                    const accountKeys = message.staticAccountKeys;
                    instructions = message.compiledInstructions.map(ix => ({
                        programId: accountKeys[ix.programIdIndex],
                        keys: ix.accountKeyIndexes.map(idx => ({
                            pubkey: accountKeys[idx],
                            isSigner: message.isAccountSigner(idx),
                            isWritable: message.isAccountWritable(idx),
                        })),
                        data: Buffer.from(ix.data),
                    }));
                }
                catch (_a) {
                    // Fall back to legacy transaction
                    transaction = web3_js_1.Transaction.from(txBuffer);
                    instructions = transaction.instructions;
                }
                // Analyze each instruction
                for (const instruction of instructions) {
                    const programId = instruction.programId.toBase58();
                    const programInfo = yield this.analyzeProgramCall(programId, instruction);
                    programsInvoked.push(programInfo);
                    // Check for specific instruction types
                    if (programId === KNOWN_PROGRAMS.TOKEN_PROGRAM || programId === KNOWN_PROGRAMS.TOKEN_2022_PROGRAM) {
                        yield this.analyzeTokenInstruction(instruction, warnings, effects, approvalChanges, walletAddress);
                    }
                    else if (programId === KNOWN_PROGRAMS.SYSTEM_PROGRAM) {
                        yield this.analyzeSystemInstruction(instruction, warnings, effects, walletAddress);
                    }
                    else if (!this.verifiedPrograms.has(programId)) {
                        // Unknown program - add warning
                        warnings.push({
                            type: MALICIOUS_PATTERNS.UNKNOWN_PROGRAM,
                            severity: 'medium',
                            message: `Transaction interacts with unverified program: ${programId.slice(0, 8)}...`,
                            details: { programId },
                        });
                    }
                }
                // Simulate on chain
                const simulationResponse = yield this.simulateOnChain(serializedTransaction);
                if (simulationResponse) {
                    // Extract balance changes from simulation
                    yield this.extractBalanceChanges(simulationResponse, walletAddress, balanceChanges);
                    // Check logs for suspicious patterns
                    if (simulationResponse.logs) {
                        this.analyzeLogs(simulationResponse.logs, warnings);
                    }
                }
                // Check for hidden approvals in batch transactions
                if (approvalChanges.length > 0 && instructions.length > 1) {
                    const hasNonApprovalInstructions = instructions.some(ix => {
                        const pid = ix.programId.toBase58();
                        return pid !== KNOWN_PROGRAMS.TOKEN_PROGRAM && pid !== KNOWN_PROGRAMS.TOKEN_2022_PROGRAM;
                    });
                    if (hasNonApprovalInstructions) {
                        warnings.push({
                            type: MALICIOUS_PATTERNS.HIDDEN_APPROVAL,
                            severity: 'high',
                            message: 'Token approval hidden within batch transaction',
                            details: { approvalCount: approvalChanges.length },
                        });
                    }
                }
                // Calculate risk score
                const { riskLevel, riskScore } = this.calculateRiskScore(warnings, programsInvoked, approvalChanges);
                // Store simulation result
                yield this.storeSimulationResult(simulationId, walletAddress, {
                    success: true,
                    riskLevel,
                    riskScore,
                    warnings,
                    effects,
                    balanceChanges,
                    approvalChanges,
                    programsInvoked,
                });
                return {
                    simulationId,
                    success: true,
                    riskLevel,
                    riskScore,
                    warnings,
                    effects,
                    balanceChanges,
                    approvalChanges,
                    programsInvoked,
                    estimatedFee: 5000, // Base fee in lamports
                    computeUnits: (simulationResponse === null || simulationResponse === void 0 ? void 0 : simulationResponse.unitsConsumed) || 200000,
                    simulatedAt: new Date().toISOString(),
                    rawLogs: (simulationResponse === null || simulationResponse === void 0 ? void 0 : simulationResponse.logs) || undefined,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'TransactionSimulator' }, 'Simulation failed');
                warnings.push({
                    type: 'simulation_error',
                    severity: 'high',
                    message: `Transaction simulation failed: ${error.message}`,
                });
                return {
                    simulationId,
                    success: false,
                    riskLevel: 'high',
                    riskScore: 75,
                    warnings,
                    effects,
                    balanceChanges,
                    approvalChanges,
                    programsInvoked,
                    estimatedFee: 0,
                    computeUnits: 0,
                    simulatedAt: new Date().toISOString(),
                };
            }
        });
    }
    /**
     * Analyze a program call
     */
    analyzeProgramCall(programId, instruction) {
        return __awaiter(this, void 0, void 0, function* () {
            const isKnown = this.verifiedPrograms.has(programId);
            const programName = this.verifiedPrograms.get(programId);
            // Check if program is in malicious list
            const isMalicious = this.maliciousAddresses.has(programId);
            let riskLevel = 'safe';
            if (isMalicious) {
                riskLevel = 'critical';
            }
            else if (!isKnown) {
                riskLevel = 'medium';
            }
            return {
                programId,
                programName,
                isKnown,
                isVerified: isKnown && !isMalicious,
                riskLevel,
                instructionCount: 1,
            };
        });
    }
    /**
     * Analyze SPL Token instructions
     */
    analyzeTokenInstruction(instruction, warnings, effects, approvalChanges, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = instruction.data;
            if (data.length === 0)
                return;
            const instructionType = data[0];
            // Token instruction types (from spl-token)
            // 0: InitializeMint, 1: InitializeAccount, 2: InitializeMultisig
            // 3: Transfer, 4: Approve, 5: Revoke, 6: SetAuthority
            // 7: MintTo, 8: Burn, 9: CloseAccount, etc.
            switch (instructionType) {
                case 3: // Transfer
                    yield this.analyzeTransfer(instruction, warnings, effects, walletAddress);
                    break;
                case 4: // Approve
                    yield this.analyzeApproval(instruction, warnings, effects, approvalChanges, walletAddress);
                    break;
                case 5: // Revoke
                    effects.push({
                        type: 'approval',
                        description: 'Revoking token approval',
                        riskLevel: 'safe',
                        data: { action: 'revoke' },
                    });
                    break;
                case 6: // SetAuthority
                    yield this.analyzeAuthorityChange(instruction, warnings, effects, walletAddress);
                    break;
                case 9: // CloseAccount
                    yield this.analyzeAccountClose(instruction, warnings, effects, walletAddress);
                    break;
            }
        });
    }
    /**
     * Analyze token transfer
     */
    analyzeTransfer(instruction, warnings, effects, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = instruction.keys;
            if (keys.length < 3)
                return;
            const source = keys[0].pubkey.toBase58();
            const destination = keys[1].pubkey.toBase58();
            // Check if destination is malicious
            if (this.maliciousAddresses.has(destination)) {
                warnings.push({
                    type: MALICIOUS_PATTERNS.SUSPICIOUS_TRANSFER,
                    severity: 'critical',
                    message: 'Transfer to known malicious address detected',
                    details: { destination },
                });
            }
            effects.push({
                type: 'transfer',
                description: `Token transfer from ${source.slice(0, 8)}... to ${destination.slice(0, 8)}...`,
                riskLevel: this.maliciousAddresses.has(destination) ? 'critical' : 'safe',
                data: { source, destination },
            });
        });
    }
    /**
     * Analyze token approval
     */
    analyzeApproval(instruction, warnings, effects, approvalChanges, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = instruction.keys;
            if (keys.length < 3)
                return;
            const tokenAccount = keys[0].pubkey.toBase58();
            const delegate = keys[1].pubkey.toBase58();
            const data = instruction.data;
            // Parse approval amount (u64 at offset 1)
            let amount = 0;
            if (data.length >= 9) {
                const amountBuffer = data.slice(1, 9);
                const amountBigInt = amountBuffer.readBigUInt64LE(0);
                // Check for max u64 (unlimited)
                if (amountBigInt === BigInt('18446744073709551615')) {
                    amount = 'unlimited';
                }
                else {
                    amount = Number(amountBigInt);
                }
            }
            // Check if delegate is malicious
            const isMalicious = this.maliciousAddresses.has(delegate);
            let riskLevel = 'low';
            if (isMalicious) {
                riskLevel = 'critical';
                warnings.push({
                    type: MALICIOUS_PATTERNS.DRAINER_SIGNATURE,
                    severity: 'critical',
                    message: 'Approval to known drainer address detected!',
                    details: { delegate },
                });
            }
            else if (amount === 'unlimited') {
                riskLevel = 'high';
                warnings.push({
                    type: MALICIOUS_PATTERNS.UNLIMITED_APPROVAL,
                    severity: 'high',
                    message: 'Unlimited token approval detected - allows spender to transfer all tokens',
                    details: { delegate },
                });
            }
            effects.push({
                type: 'approval',
                description: `Token approval to ${delegate.slice(0, 8)}... for ${amount === 'unlimited' ? 'unlimited' : amount} tokens`,
                riskLevel,
                data: { delegate, amount },
            });
            approvalChanges.push({
                tokenAddress: tokenAccount,
                spenderAddress: delegate,
                previousAmount: null,
                newAmount: amount,
                isNewApproval: true,
                isRevocation: false,
                riskLevel,
            });
        });
    }
    /**
     * Analyze authority change
     */
    analyzeAuthorityChange(instruction, warnings, effects, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const keys = instruction.keys;
            if (keys.length < 2)
                return;
            const account = keys[0].pubkey.toBase58();
            const newAuthority = keys.length > 2 ? (_a = keys[2]) === null || _a === void 0 ? void 0 : _a.pubkey.toBase58() : null;
            warnings.push({
                type: MALICIOUS_PATTERNS.AUTHORITY_CHANGE,
                severity: 'high',
                message: 'Token account authority is being changed',
                details: { account, newAuthority },
            });
            effects.push({
                type: 'authority_change',
                description: `Changing authority of ${account.slice(0, 8)}...`,
                riskLevel: 'high',
                data: { account, newAuthority },
            });
        });
    }
    /**
     * Analyze account close
     */
    analyzeAccountClose(instruction, warnings, effects, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = instruction.keys;
            if (keys.length < 3)
                return;
            const account = keys[0].pubkey.toBase58();
            const destination = keys[1].pubkey.toBase58();
            // Check if rent is being sent to wallet owner
            if (destination !== walletAddress) {
                warnings.push({
                    type: MALICIOUS_PATTERNS.CLOSE_ACCOUNT,
                    severity: 'medium',
                    message: 'Account being closed with rent sent to different address',
                    details: { account, destination },
                });
            }
            effects.push({
                type: 'account_close',
                description: `Closing account ${account.slice(0, 8)}..., rent to ${destination.slice(0, 8)}...`,
                riskLevel: destination !== walletAddress ? 'medium' : 'safe',
                data: { account, destination },
            });
        });
    }
    /**
     * Analyze system program instructions
     */
    analyzeSystemInstruction(instruction, warnings, effects, walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = instruction.data;
            if (data.length < 4)
                return;
            const instructionType = data.readUInt32LE(0);
            // System instruction types
            // 0: CreateAccount, 1: Assign, 2: Transfer, 3: CreateAccountWithSeed
            // 4: AdvanceNonceAccount, 5: WithdrawNonceAccount, etc.
            if (instructionType === 2) {
                // Transfer SOL
                const keys = instruction.keys;
                if (keys.length >= 2) {
                    const destination = keys[1].pubkey.toBase58();
                    if (this.maliciousAddresses.has(destination)) {
                        warnings.push({
                            type: MALICIOUS_PATTERNS.SUSPICIOUS_TRANSFER,
                            severity: 'critical',
                            message: 'SOL transfer to known malicious address',
                            details: { destination },
                        });
                    }
                    effects.push({
                        type: 'transfer',
                        description: `SOL transfer to ${destination.slice(0, 8)}...`,
                        riskLevel: this.maliciousAddresses.has(destination) ? 'critical' : 'safe',
                        data: { destination, isNative: true },
                    });
                }
            }
        });
    }
    /**
     * Simulate transaction on chain
     */
    simulateOnChain(serializedTransaction) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const txBuffer = Buffer.from(serializedTransaction, 'base64');
                let transaction;
                try {
                    transaction = web3_js_1.VersionedTransaction.deserialize(txBuffer);
                }
                catch (_a) {
                    transaction = web3_js_1.Transaction.from(txBuffer);
                }
                const result = yield this.connection.simulateTransaction(transaction, {
                    sigVerify: false,
                    replaceRecentBlockhash: true,
                });
                return result.value;
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'TransactionSimulator' }, 'On-chain simulation failed');
                return null;
            }
        });
    }
    /**
     * Extract balance changes from simulation response
     */
    extractBalanceChanges(simulation, walletAddress, balanceChanges) {
        return __awaiter(this, void 0, void 0, function* () {
            // Note: Full balance change extraction would require pre/post account data
            // This is a simplified version that extracts from logs
            if (simulation.logs) {
                for (const log of simulation.logs) {
                    // Look for transfer-related logs
                    if (log.includes('Transfer')) {
                        // Parse transfer amount from log if possible
                        const match = log.match(/Transfer (\d+)/);
                        if (match) {
                            balanceChanges.push({
                                tokenAddress: 'unknown',
                                beforeBalance: 0,
                                afterBalance: 0,
                                change: -parseInt(match[1]),
                                isNative: log.includes('lamports'),
                            });
                        }
                    }
                }
            }
        });
    }
    /**
     * Analyze transaction logs for suspicious patterns
     */
    analyzeLogs(logs, warnings) {
        for (const log of logs) {
            // Check for common error patterns that might indicate issues
            if (log.includes('insufficient funds')) {
                warnings.push({
                    type: 'insufficient_funds',
                    severity: 'medium',
                    message: 'Transaction may fail due to insufficient funds',
                });
            }
            if (log.includes('Error') || log.includes('failed')) {
                warnings.push({
                    type: 'potential_failure',
                    severity: 'medium',
                    message: `Potential issue detected: ${log.slice(0, 100)}`,
                });
            }
        }
    }
    /**
     * Calculate overall risk score
     */
    calculateRiskScore(warnings, programs, approvals) {
        let score = 0;
        // Score based on warnings
        for (const warning of warnings) {
            switch (warning.severity) {
                case 'critical':
                    score += 40;
                    break;
                case 'high':
                    score += 25;
                    break;
                case 'medium':
                    score += 10;
                    break;
                case 'low':
                    score += 5;
                    break;
            }
        }
        // Score based on unverified programs
        for (const program of programs) {
            if (!program.isVerified) {
                score += 15;
            }
            if (program.riskLevel === 'critical') {
                score += 50;
            }
        }
        // Score based on approvals
        for (const approval of approvals) {
            if (approval.newAmount === 'unlimited') {
                score += 20;
            }
            if (approval.riskLevel === 'critical') {
                score += 40;
            }
        }
        // Cap at 100
        score = Math.min(score, 100);
        // Determine risk level
        let riskLevel;
        if (score >= 80) {
            riskLevel = 'critical';
        }
        else if (score >= 50) {
            riskLevel = 'high';
        }
        else if (score >= 25) {
            riskLevel = 'medium';
        }
        else if (score > 0) {
            riskLevel = 'low';
        }
        else {
            riskLevel = 'safe';
        }
        return { riskLevel, riskScore: score };
    }
    /**
     * Store simulation result in database
     */
    storeSimulationResult(simulationId, walletAddress, result) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.pool.query(`INSERT INTO transaction_simulations
         (simulation_id, wallet_address, success, risk_level, risk_score, warnings, effects, simulated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
                    simulationId,
                    walletAddress,
                    result.success,
                    result.riskLevel,
                    result.riskScore,
                    JSON.stringify(result.warnings),
                    JSON.stringify(result.effects),
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'TransactionSimulator' }, 'Failed to store simulation result');
            }
        });
    }
    /**
     * Get simulation history for a wallet
     */
    getSimulationHistory(walletAddress_1) {
        return __awaiter(this, arguments, void 0, function* (walletAddress, limit = 20) {
            try {
                const result = yield this.pool.query(`SELECT * FROM transaction_simulations
         WHERE wallet_address = $1
         ORDER BY simulated_at DESC
         LIMIT $2`, [walletAddress, limit]);
                return result.rows.map(row => ({
                    simulationId: row.simulation_id,
                    success: row.success,
                    riskLevel: row.risk_level,
                    riskScore: row.risk_score,
                    warnings: row.warnings || [],
                    effects: row.effects || [],
                    balanceChanges: [],
                    approvalChanges: [],
                    programsInvoked: [],
                    estimatedFee: 0,
                    computeUnits: 0,
                    simulatedAt: row.simulated_at,
                }));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'TransactionSimulator' }, 'Failed to get simulation history');
                return [];
            }
        });
    }
    /**
     * Quick risk check for a transaction without full simulation
     */
    quickRiskCheck(serializedTransaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const warnings = [];
            let highestRisk = 'safe';
            try {
                const txBuffer = Buffer.from(serializedTransaction, 'base64');
                let instructions = [];
                try {
                    const transaction = web3_js_1.VersionedTransaction.deserialize(txBuffer);
                    const message = transaction.message;
                    const accountKeys = message.staticAccountKeys;
                    instructions = message.compiledInstructions.map(ix => ({
                        programId: accountKeys[ix.programIdIndex],
                        keys: ix.accountKeyIndexes.map(idx => ({
                            pubkey: accountKeys[idx],
                            isSigner: message.isAccountSigner(idx),
                            isWritable: message.isAccountWritable(idx),
                        })),
                        data: Buffer.from(ix.data),
                    }));
                }
                catch (_a) {
                    const transaction = web3_js_1.Transaction.from(txBuffer);
                    instructions = transaction.instructions;
                }
                for (const ix of instructions) {
                    const programId = ix.programId.toBase58();
                    // Check for malicious program
                    if (this.maliciousAddresses.has(programId)) {
                        warnings.push('Interacts with known malicious program');
                        highestRisk = 'critical';
                    }
                    // Check for unknown program
                    if (!this.verifiedPrograms.has(programId)) {
                        warnings.push('Interacts with unverified program');
                        if (['safe', 'low'].includes(highestRisk)) {
                            highestRisk = 'medium';
                        }
                    }
                    // Check for approval instruction in token program
                    if ((programId === KNOWN_PROGRAMS.TOKEN_PROGRAM || programId === KNOWN_PROGRAMS.TOKEN_2022_PROGRAM) &&
                        ix.data.length > 0 &&
                        ix.data[0] === 4) {
                        warnings.push('Contains token approval');
                        if (highestRisk !== 'critical') {
                            highestRisk = 'high';
                        }
                    }
                }
                return { riskLevel: highestRisk, warnings };
            }
            catch (error) {
                return { riskLevel: 'high', warnings: ['Failed to parse transaction'] };
            }
        });
    }
}
exports.TransactionSimulator = TransactionSimulator;
// Create singleton instance
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || '').split(',').filter(Boolean);
const rpcEndpoint = HELIUS_API_KEYS.length > 0
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEYS[0]}`
    : 'https://api.mainnet-beta.solana.com';
const connection = new web3_js_1.Connection(rpcEndpoint, 'confirmed');
exports.transactionSimulator = new TransactionSimulator(connection, config_1.default);
exports.default = exports.transactionSimulator;
