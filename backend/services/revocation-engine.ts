/**
 * Revocation Engine Service
 *
 * Generates and manages token approval revocations for Solana wallets.
 * Part of WalletShield Recovery - Phase 1
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createRevokeInstruction,
  getAccount,
} from "@solana/spl-token";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/config";
import { TokenApproval, approvalScanner } from "./approval-scanner";

dotenv.config();

// Helius RPC configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
  .split(",")
  .map((key) => key.trim())
  .filter((key) => key.length > 0);

const RPC_ENDPOINTS = HELIUS_API_KEYS.map(
  (apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
);

// Token Program IDs
const SPL_TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Interfaces
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
export class RevocationEngine {
  private connections: Connection[];
  private currentConnectionIndex: number = 0;

  constructor() {
    if (RPC_ENDPOINTS.length === 0) {
      console.warn("Warning: No Helius API keys configured. Revocation engine will use public RPC.");
      // Use public Solana RPC as fallback for development
      this.connections = [new Connection("https://api.mainnet-beta.solana.com", "confirmed")];
    } else {
      this.connections = RPC_ENDPOINTS.map(
        (endpoint) => new Connection(endpoint, "confirmed")
      );
    }
  }

  /**
   * Get next connection (round-robin)
   */
  private getConnection(): Connection {
    const connection = this.connections[this.currentConnectionIndex];
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
    return connection;
  }

  /**
   * Create a revocation plan for a wallet
   * This generates all the instructions needed but doesn't execute them
   */
  async createRevocationPlan(
    walletAddress: string,
    approvals?: TokenApproval[]
  ): Promise<RevocationPlan> {
    const sessionId = uuidv4();
    const connection = this.getConnection();

    // Get approvals if not provided
    if (!approvals) {
      const scanResult = await approvalScanner.scanWallet(walletAddress);
      approvals = scanResult.profile?.approvals || [];
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
    const instructions: RevocationInstruction[] = [];
    const ownerPubkey = new PublicKey(walletAddress);

    for (const approval of activeApprovals) {
      try {
        const tokenAccountPubkey = new PublicKey(approval.tokenAccount);

        // Create revoke instruction
        const revokeIx = createRevokeInstruction(
          tokenAccountPubkey,
          ownerPubkey,
          [], // No multi-sig signers
          SPL_TOKEN_PROGRAM_ID
        );

        instructions.push({
          tokenAccount: approval.tokenAccount,
          delegateAddress: approval.delegateAddress,
          instruction: revokeIx,
          estimatedFee: 5000, // ~0.000005 SOL per instruction
        });
      } catch (error: any) {
        console.error(`Error creating revoke instruction for ${approval.tokenAccount}:`, error.message);
      }
    }

    // Group instructions into transactions (max ~20 instructions per tx for safety)
    const maxInstructionsPerTx = 20;
    const transactions: RevocationTransaction[] = [];
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
    await this.createRecoverySession(sessionId, walletAddress, activeApprovals.length);

    return {
      sessionId,
      walletAddress,
      totalApprovals: activeApprovals.length,
      totalTransactions: transactions.length,
      estimatedTotalFee: totalFee,
      transactions,
      createdAt: new Date(),
    };
  }

  /**
   * Build unsigned transactions from a revocation plan
   * Returns base64-encoded serialized transactions for client-side signing
   */
  async buildUnsignedTransactions(plan: RevocationPlan): Promise<string[]> {
    const connection = this.getConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const feePayer = new PublicKey(plan.walletAddress);

    const serializedTransactions: string[] = [];

    for (const txPlan of plan.transactions) {
      const transaction = new Transaction();

      // Add compute budget for priority (optional)
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 })
      );

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
  }

  /**
   * Process signed transactions and submit to network
   * Called after client signs the transactions
   */
  async submitSignedTransactions(
    sessionId: string,
    signedTransactions: string[]
  ): Promise<RevocationResult> {
    const session = await this.getRecoverySession(sessionId);
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
    const signatures: string[] = [];
    const errors: string[] = [];
    let totalRevoked = 0;
    let totalFailed = 0;

    // Update session status
    await this.updateRecoverySessionStatus(sessionId, "in_progress");

    for (const signedTxBase64 of signedTransactions) {
      try {
        const signedTxBuffer = Buffer.from(signedTxBase64, "base64");

        // Send transaction
        const signature = await connection.sendRawTransaction(signedTxBuffer, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });

        // Confirm transaction
        const confirmation = await connection.confirmTransaction(signature, "confirmed");

        if (confirmation.value.err) {
          errors.push(`Transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`);
          totalFailed++;
        } else {
          signatures.push(signature);
          // Count instructions as revoked (approximate, could parse tx for exact count)
          totalRevoked++;
        }
      } catch (error: any) {
        errors.push(`Transaction submission failed: ${error.message}`);
        totalFailed++;
      }
    }

    // Update session with results
    await this.completeRecoverySession(sessionId, totalRevoked, signatures, errors);

    return {
      success: errors.length === 0,
      sessionId,
      walletAddress: session.walletAddress,
      totalRevoked,
      totalFailed,
      signatures,
      errors,
    };
  }

  /**
   * Create a recovery session in database
   */
  private async createRecoverySession(
    sessionId: string,
    walletAddress: string,
    totalApprovals: number
  ): Promise<void> {
    try {
      await pool.executeQuery(
        `INSERT INTO recovery_sessions (
          session_id, wallet_address, status, total_approvals_found
        ) VALUES ($1, $2, 'initiated', $3)`,
        [sessionId, walletAddress, totalApprovals]
      );
    } catch (error) {
      console.error("Error creating recovery session:", error);
    }
  }

  /**
   * Update recovery session status
   */
  private async updateRecoverySessionStatus(
    sessionId: string,
    status: string
  ): Promise<void> {
    try {
      await pool.executeQuery(
        `UPDATE recovery_sessions SET status = $2 WHERE session_id = $1`,
        [sessionId, status]
      );
    } catch (error) {
      console.error("Error updating recovery session:", error);
    }
  }

  /**
   * Complete a recovery session
   */
  private async completeRecoverySession(
    sessionId: string,
    approvalsRevoked: number,
    signatures: string[],
    errors: string[]
  ): Promise<void> {
    try {
      const status = errors.length === 0 ? "completed" : "failed";
      await pool.executeQuery(
        `UPDATE recovery_sessions SET
          status = $2,
          approvals_revoked = $3,
          revoke_signatures = $4,
          error_log = $5,
          completed_at = CURRENT_TIMESTAMP
        WHERE session_id = $1`,
        [
          sessionId,
          status,
          approvalsRevoked,
          signatures,
          JSON.stringify({ errors }),
        ]
      );
    } catch (error) {
      console.error("Error completing recovery session:", error);
    }
  }

  /**
   * Get recovery session from database
   */
  async getRecoverySession(sessionId: string): Promise<RecoverySession | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM recovery_sessions WHERE session_id = $1`,
        [sessionId]
      );

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
    } catch (error) {
      console.error("Error fetching recovery session:", error);
      return null;
    }
  }

  /**
   * Get all recovery sessions for a wallet
   */
  async getRecoverySessionsForWallet(walletAddress: string): Promise<RecoverySession[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM recovery_sessions
         WHERE wallet_address = $1
         ORDER BY initiated_at DESC`,
        [walletAddress]
      );

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
    } catch (error) {
      console.error("Error fetching recovery sessions:", error);
      return [];
    }
  }

  /**
   * Quick revoke - Generate a single revoke instruction for one approval
   */
  async createSingleRevokeInstruction(
    walletAddress: string,
    tokenAccount: string
  ): Promise<{ instruction: TransactionInstruction; serialized: string } | null> {
    try {
      const connection = this.getConnection();
      const ownerPubkey = new PublicKey(walletAddress);
      const tokenAccountPubkey = new PublicKey(tokenAccount);

      // Verify the token account exists and has a delegate
      const accountInfo = await getAccount(connection, tokenAccountPubkey);
      if (!accountInfo.delegate) {
        return null;
      }

      // Create revoke instruction
      const revokeIx = createRevokeInstruction(
        tokenAccountPubkey,
        ownerPubkey,
        [],
        SPL_TOKEN_PROGRAM_ID
      );

      // Build transaction
      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction();
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
    } catch (error: any) {
      console.error("Error creating single revoke instruction:", error.message);
      return null;
    }
  }

  /**
   * Emergency revoke all - Create transactions to revoke all high-risk approvals
   */
  async createEmergencyRevokePlan(walletAddress: string): Promise<RevocationPlan> {
    // Scan wallet for current approvals
    const scanResult = await approvalScanner.scanWallet(walletAddress);
    const approvals = scanResult.profile?.approvals || [];

    // Filter to high-risk approvals only (risk score >= 50 or unlimited)
    const highRiskApprovals = approvals.filter(
      (a) => a.riskScore >= 50 || a.isUnlimited
    );

    // Create revocation plan for high-risk approvals
    return this.createRevocationPlan(walletAddress, highRiskApprovals);
  }
}

// Export singleton instance
export const revocationEngine = new RevocationEngine();
export default revocationEngine;
