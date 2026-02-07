/**
 * Approval Scanner Service
 *
 * Scans Solana wallets for SPL token delegate approvals and assesses risk.
 * Part of WalletShield Recovery - Phase 1
 */

import {
  Connection,
  PublicKey,
  ParsedAccountData,
  AccountInfo,
} from "@solana/web3.js";
import * as dotenv from "dotenv";
import pool from "../db/config";

dotenv.config();

// SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Helius RPC configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
  .split(",")
  .map((key) => key.trim())
  .filter((key) => key.length > 0);

const RPC_ENDPOINTS = HELIUS_API_KEYS.map(
  (apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
);

// Interfaces
export interface TokenApproval {
  walletAddress: string;
  tokenMint: string;
  tokenAccount: string;
  delegateAddress: string;
  delegatedAmount: number;
  isUnlimited: boolean;
  riskScore: number;
  riskFactors: RiskFactors;
  delegateLabel?: string;
  status: "active" | "revoked";
}

export interface RiskFactors {
  isKnownMalicious: boolean;
  isUnlimited: boolean;
  isNewDelegate: boolean;
  hasHighVolume: boolean;
  delegateAge?: number;
  victimCount?: number;
  reportedLosses?: number;
}

export interface WalletSecurityProfile {
  walletAddress: string;
  totalApprovals: number;
  highRiskApprovals: number;
  unlimitedApprovals: number;
  securityScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  approvals: TokenApproval[];
}

export interface ScanResult {
  success: boolean;
  walletAddress: string;
  profile: WalletSecurityProfile | null;
  error?: string;
}

/**
 * ApprovalScanner class
 * Scans Solana wallets for token approvals and assesses risk
 */
export class ApprovalScanner {
  private connections: Connection[];
  private currentConnectionIndex: number = 0;
  private isConfigured: boolean = false;

  constructor() {
    if (RPC_ENDPOINTS.length === 0) {
      console.warn("Warning: No Helius API keys configured. Approval scanning will use public RPC.");
      // Use public Solana RPC as fallback for development
      this.connections = [new Connection("https://api.mainnet-beta.solana.com", "confirmed")];
    } else {
      this.connections = RPC_ENDPOINTS.map(
        (endpoint) => new Connection(endpoint, "confirmed")
      );
      this.isConfigured = true;
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
   * Scan a wallet for all token approvals
   */
  async scanWallet(walletAddress: string): Promise<ScanResult> {
    try {
      const pubkey = new PublicKey(walletAddress);
      const connection = this.getConnection();

      // Get all token accounts for this wallet
      const tokenAccounts = await this.getTokenAccountsWithDelegates(connection, pubkey);

      // Process each approval
      const approvals: TokenApproval[] = [];
      for (const account of tokenAccounts) {
        if (account.delegateAddress) {
          const approval = await this.processApproval(walletAddress, account);
          approvals.push(approval);

          // Store in database
          await this.storeApproval(approval);
        }
      }

      // Calculate security profile
      const profile = this.calculateSecurityProfile(walletAddress, approvals);

      // Store profile
      await this.storeSecurityProfile(profile);

      return {
        success: true,
        walletAddress,
        profile,
      };
    } catch (error: any) {
      console.error(`Error scanning wallet ${walletAddress}:`, error.message);
      return {
        success: false,
        walletAddress,
        profile: null,
        error: error.message,
      };
    }
  }

  /**
   * Get all token accounts with delegate authorities
   */
  private async getTokenAccountsWithDelegates(
    connection: Connection,
    owner: PublicKey
  ): Promise<TokenAccountWithDelegate[]> {
    const results: TokenAccountWithDelegate[] = [];

    // Fetch from both Token Program and Token-2022
    for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
          programId,
        });

        for (const { pubkey, account } of accounts.value) {
          const parsed = account.data as ParsedAccountData;
          const info = parsed.parsed?.info;

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
              decimals: info.tokenAmount?.decimals || 0,
            });
          }
        }
      } catch (error: any) {
        console.error(`Error fetching token accounts for program ${programId.toBase58()}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Process a single approval and calculate risk
   */
  private async processApproval(
    walletAddress: string,
    account: TokenAccountWithDelegate
  ): Promise<TokenApproval> {
    const riskFactors = await this.calculateRiskFactors(account);
    const riskScore = this.calculateRiskScore(riskFactors);
    const delegateLabel = await this.getDelegateLabel(account.delegateAddress!);

    // Check if unlimited (delegated amount >= token amount or very large number)
    const isUnlimited = account.delegatedAmount >= account.tokenAmount ||
                        account.delegatedAmount > 1000000000;

    return {
      walletAddress,
      tokenMint: account.mint,
      tokenAccount: account.tokenAccount,
      delegateAddress: account.delegateAddress!,
      delegatedAmount: account.delegatedAmount,
      isUnlimited,
      riskScore,
      riskFactors,
      delegateLabel,
      status: "active",
    };
  }

  /**
   * Calculate risk factors for an approval
   */
  private async calculateRiskFactors(account: TokenAccountWithDelegate): Promise<RiskFactors> {
    const delegateAddress = account.delegateAddress!;

    // Check if known malicious
    const maliciousInfo = await this.checkKnownMalicious(delegateAddress);

    // Check if unlimited approval
    const isUnlimited = account.delegatedAmount >= account.tokenAmount ||
                        account.delegatedAmount > 1000000000;

    return {
      isKnownMalicious: maliciousInfo.isKnown,
      isUnlimited,
      isNewDelegate: true, // TODO: Check delegate age
      hasHighVolume: false, // TODO: Check transaction volume
      victimCount: maliciousInfo.victimCount,
      reportedLosses: maliciousInfo.reportedLosses,
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(factors: RiskFactors): number {
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
  private async checkKnownMalicious(delegateAddress: string): Promise<{
    isKnown: boolean;
    victimCount?: number;
    reportedLosses?: number;
  }> {
    try {
      const result = await pool.executeQuery(
        `SELECT victim_count, reported_losses
         FROM known_malicious_delegates
         WHERE address = $1`,
        [delegateAddress]
      );

      if (result.rows.length > 0) {
        return {
          isKnown: true,
          victimCount: result.rows[0].victim_count,
          reportedLosses: result.rows[0].reported_losses,
        };
      }
    } catch (error) {
      console.error("Error checking malicious delegate:", error);
    }

    return { isKnown: false };
  }

  /**
   * Get label for delegate address (if known)
   */
  private async getDelegateLabel(delegateAddress: string): Promise<string | undefined> {
    try {
      // Check malicious database
      const malicious = await pool.executeQuery(
        `SELECT label FROM known_malicious_delegates WHERE address = $1`,
        [delegateAddress]
      );
      if (malicious.rows.length > 0) {
        return malicious.rows[0].label;
      }

      // TODO: Check against known protocol addresses (Raydium, Jupiter, etc.)
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Calculate overall security profile for wallet
   */
  private calculateSecurityProfile(
    walletAddress: string,
    approvals: TokenApproval[]
  ): WalletSecurityProfile {
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
    let riskLevel: "low" | "medium" | "high" | "critical";
    if (highRiskApprovals > 0 || securityScore < 30) {
      riskLevel = "critical";
    } else if (unlimitedApprovals > 2 || securityScore < 50) {
      riskLevel = "high";
    } else if (totalApprovals > 5 || securityScore < 70) {
      riskLevel = "medium";
    } else {
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
  private async storeApproval(approval: TokenApproval): Promise<void> {
    try {
      await pool.executeQuery(
        `INSERT INTO token_approvals (
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
          last_seen_at = CURRENT_TIMESTAMP`,
        [
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
        ]
      );
    } catch (error) {
      console.error("Error storing approval:", error);
    }
  }

  /**
   * Store security profile in database
   */
  private async storeSecurityProfile(profile: WalletSecurityProfile): Promise<void> {
    try {
      await pool.executeQuery(
        `INSERT INTO wallet_security_profiles (
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
          updated_at = CURRENT_TIMESTAMP`,
        [
          profile.walletAddress,
          profile.totalApprovals,
          profile.highRiskApprovals,
          profile.unlimitedApprovals,
          profile.securityScore,
          profile.riskLevel,
        ]
      );
    } catch (error) {
      console.error("Error storing security profile:", error);
    }
  }

  /**
   * Get approvals for a wallet from database
   */
  async getApprovals(walletAddress: string): Promise<TokenApproval[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM token_approvals
         WHERE wallet_address = $1 AND status = 'active'
         ORDER BY risk_score DESC`,
        [walletAddress]
      );

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
    } catch (error) {
      console.error("Error fetching approvals:", error);
      return [];
    }
  }

  /**
   * Get security profile for a wallet
   */
  async getSecurityProfile(walletAddress: string): Promise<WalletSecurityProfile | null> {
    try {
      const profileResult = await pool.executeQuery(
        `SELECT * FROM wallet_security_profiles WHERE wallet_address = $1`,
        [walletAddress]
      );

      if (profileResult.rows.length === 0) {
        return null;
      }

      const row = profileResult.rows[0];
      const approvals = await this.getApprovals(walletAddress);

      return {
        walletAddress: row.wallet_address,
        totalApprovals: row.total_approvals,
        highRiskApprovals: row.high_risk_approvals,
        unlimitedApprovals: row.unlimited_approvals,
        securityScore: row.security_score,
        riskLevel: row.risk_level,
        approvals,
      };
    } catch (error) {
      console.error("Error fetching security profile:", error);
      return null;
    }
  }

  /**
   * Add a known malicious delegate to the database
   */
  async reportMaliciousDelegate(
    address: string,
    label: string,
    category: string,
    reportedLosses: number = 0
  ): Promise<void> {
    try {
      await pool.executeQuery(
        `INSERT INTO known_malicious_delegates (
          address, label, category, reported_losses, victim_count, source
        ) VALUES ($1, $2, $3, $4, 1, 'user_report')
        ON CONFLICT (address) DO UPDATE SET
          victim_count = known_malicious_delegates.victim_count + 1,
          reported_losses = known_malicious_delegates.reported_losses + EXCLUDED.reported_losses,
          last_active_at = CURRENT_TIMESTAMP`,
        [address, label, category, reportedLosses]
      );
    } catch (error) {
      console.error("Error reporting malicious delegate:", error);
    }
  }

  /**
   * Mark an approval as revoked
   */
  async markApprovalRevoked(
    walletAddress: string,
    tokenAccount: string,
    delegateAddress: string,
    revokeSignature: string
  ): Promise<void> {
    try {
      await pool.executeQuery(
        `UPDATE token_approvals
         SET status = 'revoked',
             revoked_at = CURRENT_TIMESTAMP,
             revoke_signature = $4
         WHERE wallet_address = $1
           AND token_account = $2
           AND delegate_address = $3`,
        [walletAddress, tokenAccount, delegateAddress, revokeSignature]
      );
    } catch (error) {
      console.error("Error marking approval as revoked:", error);
    }
  }
}

// Helper interface
interface TokenAccountWithDelegate {
  tokenAccount: string;
  mint: string;
  owner: string;
  delegateAddress: string | null;
  delegatedAmount: number;
  tokenAmount: number;
  decimals: number;
}

// Export singleton instance
export const approvalScanner = new ApprovalScanner();
export default approvalScanner;
