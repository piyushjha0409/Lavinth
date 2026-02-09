/**
 * Approval Scanner Service
 *
 * Scans Solana wallets for SPL token delegate approvals and assesses risk.
 * Part of WalletShield Recovery - Phase 1
 */
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
export declare class ApprovalScanner {
    private connections;
    private currentConnectionIndex;
    private isConfigured;
    constructor();
    /**
     * Get next connection (round-robin)
     */
    private getConnection;
    /**
     * Scan a wallet for all token approvals
     */
    scanWallet(walletAddress: string): Promise<ScanResult>;
    /**
     * Get all token accounts with delegate authorities
     */
    private getTokenAccountsWithDelegates;
    /**
     * Process a single approval and calculate risk
     */
    private processApproval;
    /**
     * Calculate risk factors for an approval
     */
    private calculateRiskFactors;
    /**
     * Check if delegate is new (few transactions and not a known exchange)
     */
    private checkIsNewDelegate;
    /**
     * Check if delegate has high volume (approvals from many distinct wallets)
     */
    private checkHasHighVolume;
    /**
     * Calculate risk score (0-100)
     */
    private calculateRiskScore;
    /**
     * Check if delegate is in known malicious database
     */
    private checkKnownMalicious;
    /**
     * Get label for delegate address (if known)
     */
    private getDelegateLabel;
    /**
     * Calculate overall security profile for wallet
     */
    private calculateSecurityProfile;
    /**
     * Store approval in database
     */
    private storeApproval;
    /**
     * Store security profile in database
     */
    private storeSecurityProfile;
    /**
     * Get approvals for a wallet from database
     */
    getApprovals(walletAddress: string): Promise<TokenApproval[]>;
    /**
     * Get security profile for a wallet
     */
    getSecurityProfile(walletAddress: string): Promise<WalletSecurityProfile | null>;
    /**
     * Add a known malicious delegate to the database
     */
    reportMaliciousDelegate(address: string, label: string, category: string, reportedLosses?: number): Promise<void>;
    /**
     * Mark an approval as revoked
     */
    markApprovalRevoked(walletAddress: string, tokenAccount: string, delegateAddress: string, revokeSignature: string): Promise<void>;
}
export declare const approvalScanner: ApprovalScanner;
export default approvalScanner;
