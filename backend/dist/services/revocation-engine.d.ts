/**
 * Revocation Engine Service
 *
 * Generates and manages token approval revocations for Solana wallets.
 * Part of WalletShield Recovery - Phase 1
 */
import { TransactionInstruction } from "@solana/web3.js";
import { TokenApproval } from "./approval-scanner";
export interface RevocationInstruction {
    tokenAccount: string;
    delegateAddress: string;
    instruction: TransactionInstruction;
    estimatedFee: number;
}
export interface RevocationPlan {
    sessionId: string;
    walletAddress: string;
    totalApprovals: number;
    totalTransactions: number;
    estimatedTotalFee: number;
    transactions: RevocationTransaction[];
    createdAt: Date;
}
export interface RevocationTransaction {
    transactionIndex: number;
    instructions: RevocationInstruction[];
    serializedTransaction?: string;
    estimatedFee: number;
}
export interface RevocationResult {
    success: boolean;
    sessionId: string;
    walletAddress: string;
    totalRevoked: number;
    totalFailed: number;
    signatures: string[];
    errors: string[];
}
export interface RecoverySession {
    sessionId: string;
    walletAddress: string;
    status: "initiated" | "in_progress" | "completed" | "failed";
    totalApprovalsFound: number;
    approvalsRevoked: number;
    revokeSignatures: string[];
    assetsAtRisk: number;
    assetsSaved: number;
    assetsLost: number;
    initiatedAt: Date;
    completedAt?: Date;
}
/**
 * RevocationEngine class
 * Handles generation of revocation transactions and tracking recovery sessions
 */
export declare class RevocationEngine {
    private connections;
    private currentConnectionIndex;
    constructor();
    /**
     * Get next connection (round-robin)
     */
    private getConnection;
    /**
     * Create a revocation plan for a wallet
     * This generates all the instructions needed but doesn't execute them
     */
    createRevocationPlan(walletAddress: string, approvals?: TokenApproval[]): Promise<RevocationPlan>;
    /**
     * Build unsigned transactions from a revocation plan
     * Returns base64-encoded serialized transactions for client-side signing
     */
    buildUnsignedTransactions(plan: RevocationPlan): Promise<string[]>;
    /**
     * Process signed transactions and submit to network
     * Called after client signs the transactions
     */
    submitSignedTransactions(sessionId: string, signedTransactions: string[]): Promise<RevocationResult>;
    /**
     * Create a recovery session in database
     */
    private createRecoverySession;
    /**
     * Update recovery session status
     */
    private updateRecoverySessionStatus;
    /**
     * Complete a recovery session
     */
    private completeRecoverySession;
    /**
     * Get recovery session from database
     */
    getRecoverySession(sessionId: string): Promise<RecoverySession | null>;
    /**
     * Get all recovery sessions for a wallet
     */
    getRecoverySessionsForWallet(walletAddress: string): Promise<RecoverySession[]>;
    /**
     * Quick revoke - Generate a single revoke instruction for one approval
     */
    createSingleRevokeInstruction(walletAddress: string, tokenAccount: string): Promise<{
        instruction: TransactionInstruction;
        serialized: string;
    } | null>;
    /**
     * Emergency revoke all - Create transactions to revoke all high-risk approvals
     */
    createEmergencyRevokePlan(walletAddress: string): Promise<RevocationPlan>;
}
export declare const revocationEngine: RevocationEngine;
export default revocationEngine;
