/**
 * Compromise Detector Service
 *
 * Monitors wallets for signs of compromise and generates alerts.
 * Part of WalletShield Recovery - Phase 2
 */
import type { ThreatIntelligenceService } from "./threat-intelligence";
export interface MonitoredWallet {
    walletAddress: string;
    userId?: string;
    monitoringLevel: "standard" | "high" | "critical";
    alertChannels: AlertChannels;
    baselineBalance: number;
    lastKnownBalance: number;
    lastActivityAt?: Date;
    isCompromised: boolean;
    compromiseDetectedAt?: Date;
}
export interface AlertChannels {
    discord?: string;
    webhook?: string;
}
export interface CompromiseAlert {
    alertId: string;
    walletAddress: string;
    alertType: AlertType;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    metadata: any;
    createdAt: Date;
}
export type AlertType = "large_outflow" | "rapid_drain" | "suspicious_approval" | "known_drainer" | "unusual_activity" | "bridge_transfer" | "exchange_deposit";
export interface WalletTransaction {
    signature: string;
    walletAddress: string;
    transactionType: string;
    amount: number;
    tokenMint?: string;
    counterparty?: string;
    isSuspicious: boolean;
    suspicionReasons: string[];
    riskScore: number;
    timestamp: Date;
}
export interface DetectionResult {
    isCompromised: boolean;
    alerts: CompromiseAlert[];
    transactions: WalletTransaction[];
    riskScore: number;
}
/**
 * CompromiseDetector class
 * Monitors wallets and detects signs of compromise
 */
export declare class CompromiseDetector {
    private connections;
    private currentConnectionIndex;
    private monitoringInterval;
    private knownDrainers;
    private knownExchanges;
    private knownBridges;
    private threatIntel;
    constructor();
    /**
     * Set the threat intelligence service for enhanced detection
     */
    setThreatIntel(service: ThreatIntelligenceService): void;
    /**
     * Refresh known addresses from database (public wrapper)
     */
    refreshKnownAddresses(): Promise<void>;
    /**
     * Get next connection (round-robin)
     */
    private getConnection;
    /**
     * Load known drainer, exchange, and bridge addresses from database
     */
    private loadKnownAddresses;
    /**
     * Register a wallet for monitoring
     */
    registerWallet(walletAddress: string, userId?: string, alertChannels?: AlertChannels, monitoringLevel?: "standard" | "high" | "critical"): Promise<MonitoredWallet>;
    /**
     * Analyze a wallet for signs of compromise
     */
    analyzeWallet(walletAddress: string): Promise<DetectionResult>;
    /**
     * Analyze a single transaction
     */
    private analyzeTransaction;
    /**
     * Detect large outflow
     */
    private detectLargeOutflow;
    /**
     * Detect rapid drain pattern
     */
    private detectRapidDrain;
    /**
     * Detect interaction with known drainer
     */
    private detectKnownDrainer;
    /**
     * Detect deposits to exchanges
     */
    private detectExchangeDeposits;
    /**
     * Detect bridge transfers
     */
    private detectBridgeTransfers;
    /**
     * Store transaction in database
     */
    private storeTransaction;
    /**
     * Store alert in database
     */
    private storeAlert;
    /**
     * Get monitored wallet from database
     */
    getMonitoredWallet(walletAddress: string): Promise<MonitoredWallet | null>;
    /**
     * Mark wallet as compromised
     */
    private markWalletCompromised;
    /**
     * Update wallet balance
     */
    private updateWalletBalance;
    /**
     * Get alerts for a wallet
     */
    getAlerts(walletAddress: string, limit?: number): Promise<CompromiseAlert[]>;
    /**
     * Get recent transactions for a wallet
     */
    getTransactions(walletAddress: string, limit?: number): Promise<WalletTransaction[]>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): Promise<void>;
}
export declare const compromiseDetector: CompromiseDetector;
export default compromiseDetector;
