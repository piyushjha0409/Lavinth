/**
 * Transaction Simulator Service
 * Simulates Solana transactions to detect hidden malicious effects before signing
 */
import { Connection } from '@solana/web3.js';
import { Pool } from 'pg';
type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export interface SimulationResult {
    simulationId: string;
    success: boolean;
    riskLevel: RiskLevel;
    riskScore: number;
    warnings: SimulationWarning[];
    effects: TransactionEffect[];
    balanceChanges: BalanceChange[];
    approvalChanges: ApprovalChange[];
    programsInvoked: ProgramInfo[];
    estimatedFee: number;
    computeUnits: number;
    simulatedAt: string;
    rawLogs?: string[];
}
export interface SimulationWarning {
    type: string;
    severity: RiskLevel;
    message: string;
    details?: Record<string, any>;
}
export interface TransactionEffect {
    type: 'transfer' | 'approval' | 'authority_change' | 'account_create' | 'account_close' | 'program_call';
    description: string;
    riskLevel: RiskLevel;
    data: Record<string, any>;
}
export interface BalanceChange {
    tokenAddress: string;
    tokenSymbol?: string;
    tokenName?: string;
    beforeBalance: number;
    afterBalance: number;
    change: number;
    isNative: boolean;
}
export interface ApprovalChange {
    tokenAddress: string;
    tokenSymbol?: string;
    spenderAddress: string;
    spenderLabel?: string;
    previousAmount: number | null;
    newAmount: number | 'unlimited';
    isNewApproval: boolean;
    isRevocation: boolean;
    riskLevel: RiskLevel;
}
export interface ProgramInfo {
    programId: string;
    programName?: string;
    isKnown: boolean;
    isVerified: boolean;
    riskLevel: RiskLevel;
    instructionCount: number;
}
export declare class TransactionSimulator {
    private connection;
    private pool;
    private maliciousAddresses;
    private verifiedPrograms;
    constructor(connection: Connection, pool: Pool);
    private initializeKnownData;
    /**
     * Simulate a transaction and analyze its effects
     */
    simulateTransaction(serializedTransaction: string, walletAddress: string): Promise<SimulationResult>;
    /**
     * Analyze a program call
     */
    private analyzeProgramCall;
    /**
     * Analyze SPL Token instructions
     */
    private analyzeTokenInstruction;
    /**
     * Analyze token transfer
     */
    private analyzeTransfer;
    /**
     * Analyze token approval
     */
    private analyzeApproval;
    /**
     * Analyze authority change
     */
    private analyzeAuthorityChange;
    /**
     * Analyze account close
     */
    private analyzeAccountClose;
    /**
     * Analyze system program instructions
     */
    private analyzeSystemInstruction;
    /**
     * Simulate transaction on chain
     */
    private simulateOnChain;
    /**
     * Extract balance changes from simulation response
     */
    private extractBalanceChanges;
    /**
     * Analyze transaction logs for suspicious patterns
     */
    private analyzeLogs;
    /**
     * Calculate overall risk score
     */
    private calculateRiskScore;
    /**
     * Store simulation result in database
     */
    private storeSimulationResult;
    /**
     * Get simulation history for a wallet
     */
    getSimulationHistory(walletAddress: string, limit?: number): Promise<SimulationResult[]>;
    /**
     * Quick risk check for a transaction without full simulation
     */
    quickRiskCheck(serializedTransaction: string): Promise<{
        riskLevel: RiskLevel;
        warnings: string[];
    }>;
}
export declare const transactionSimulator: TransactionSimulator;
export default transactionSimulator;
