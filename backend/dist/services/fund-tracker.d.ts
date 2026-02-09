/**
 * Fund Tracker Service
 *
 * Tracks stolen funds across the Solana blockchain, builds transaction graphs,
 * and calculates recovery probability.
 * Part of WalletShield Recovery - Phase 2
 */
import type { ThreatIntelligenceService } from "./threat-intelligence";
export interface FundTrace {
    traceId: string;
    sourceWallet: string;
    initialAmount: number;
    tokenMint?: string;
    status: TraceStatus;
    currentDepth: number;
    startedAt: Date;
    completedAt?: Date;
    recoveryProbability: number;
    totalTracked: number;
    totalRecoverable: number;
}
export type TraceStatus = "pending" | "in_progress" | "completed" | "partial" | "funds_recovered" | "funds_lost";
export interface FundNode {
    address: string;
    nodeType: NodeType;
    label?: string;
    totalReceived: number;
    totalSent: number;
    currentBalance: number;
    firstSeen: Date;
    lastSeen: Date;
    riskLevel: "low" | "medium" | "high" | "critical";
}
export type NodeType = "source" | "intermediate" | "exchange" | "bridge" | "mixer" | "drainer" | "unknown";
export interface FundEdge {
    fromAddress: string;
    toAddress: string;
    signature: string;
    amount: number;
    tokenMint?: string;
    timestamp: Date;
    hopNumber: number;
}
export interface FundGraph {
    traceId: string;
    nodes: Map<string, FundNode>;
    edges: FundEdge[];
    exchangeDeposits: ExchangeDeposit[];
    bridgeTransfers: BridgeTransfer[];
    totalAmount: number;
    recoverableAmount: number;
    lostAmount: number;
}
export interface ExchangeDeposit {
    exchangeName: string;
    exchangeAddress: string;
    amount: number;
    tokenMint?: string;
    signature: string;
    timestamp: Date;
    freezeRequestSent: boolean;
    freezeRequestId?: string;
}
export interface BridgeTransfer {
    bridgeName: string;
    bridgeAddress: string;
    amount: number;
    tokenMint?: string;
    signature: string;
    timestamp: Date;
    destinationChain?: string;
    destinationAddress?: string;
}
export interface FreezeRequest {
    requestId: string;
    traceId: string;
    exchangeName: string;
    exchangeAddress: string;
    depositAddress: string;
    amount: number;
    tokenMint?: string;
    status: FreezeStatus;
    createdAt: Date;
    submittedAt?: Date;
    responseAt?: Date;
    responseNotes?: string;
}
export type FreezeStatus = "draft" | "ready" | "submitted" | "acknowledged" | "frozen" | "rejected" | "expired";
export interface RecoveryReport {
    traceId: string;
    sourceWallet: string;
    totalStolen: number;
    tokenMint?: string;
    tracingDepth: number;
    uniqueAddresses: number;
    totalTransactions: number;
    fundDistribution: {
        inExchanges: number;
        inBridges: number;
        inUnknown: number;
        remaining: number;
    };
    exchangeDeposits: ExchangeDeposit[];
    bridgeTransfers: BridgeTransfer[];
    recoveryProbability: number;
    recommendedActions: string[];
    generatedAt: Date;
}
/**
 * FundTracker class
 * Tracks stolen funds and builds transaction graphs
 */
export declare class FundTracker {
    private connections;
    private currentConnectionIndex;
    private knownExchanges;
    private knownBridges;
    private knownMixers;
    private knownDrainers;
    private threatIntel;
    constructor();
    /**
     * Set the threat intelligence service for enhanced classification
     */
    setThreatIntel(service: ThreatIntelligenceService): void;
    /**
     * Refresh known addresses from database (public wrapper)
     */
    refreshKnownAddresses(): Promise<void>;
    /**
     * Enhanced address classification using Arkham entity lookup as fallback
     */
    classifyAddressEnhanced(address: string): Promise<NodeType>;
    /**
     * Enhanced address label using Arkham entity name as fallback
     */
    getAddressLabelEnhanced(address: string): Promise<string | undefined>;
    /**
     * Get next connection (round-robin)
     */
    private getConnection;
    /**
     * Load known addresses from database
     */
    private loadKnownAddresses;
    /**
     * Start tracing funds from a compromised wallet
     */
    startTrace(sourceWallet: string, initialAmount: number, tokenMint?: string): Promise<FundTrace>;
    /**
     * Perform the fund tracing
     */
    private performTrace;
    /**
     * Get outgoing transactions from an address
     */
    private getOutgoingTransactions;
    /**
     * Extract destination address from transaction
     */
    private extractDestination;
    /**
     * Classify an address based on known lists
     */
    private classifyAddress;
    /**
     * Get human-readable label for address
     */
    private getAddressLabel;
    /**
     * Calculate risk level based on node type
     */
    private calculateNodeRisk;
    /**
     * Calculate overall recovery probability
     */
    private calculateRecoveryProbability;
    /**
     * Store fund graph in database
     */
    private storeGraph;
    /**
     * Create a freeze request for an exchange
     */
    createFreezeRequest(traceId: string, exchangeDeposit: ExchangeDeposit): Promise<FreezeRequest>;
    /**
     * Generate freeze request template for an exchange
     */
    generateFreezeRequestTemplate(request: FreezeRequest, victimInfo: {
        name?: string;
        email?: string;
        walletAddress: string;
    }): string;
    /**
     * Generate recovery report
     */
    generateRecoveryReport(traceId: string): Promise<RecoveryReport | null>;
    /**
     * Calculate recovery probability from fund distribution
     */
    private calculateRecoveryProbabilityFromAmounts;
    /**
     * Get trace by ID
     */
    getTrace(traceId: string): Promise<FundTrace | null>;
    /**
     * Get all traces for a wallet
     */
    getTracesForWallet(walletAddress: string): Promise<FundTrace[]>;
    /**
     * Update trace depth
     */
    private updateTraceDepth;
    /**
     * Update trace status
     */
    private updateTraceStatus;
    /**
     * Update trace completion
     */
    private updateTraceCompletion;
    /**
     * Sleep utility
     */
    private sleep;
}
export declare const fundTracker: FundTracker;
export default fundTracker;
