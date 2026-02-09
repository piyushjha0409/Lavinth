/**
 * Exchange Coordinator Service
 *
 * Manages communication with exchanges for fund freezing and recovery.
 * Part of WalletShield Recovery - Phase 3
 */
import type { ThreatIntelligenceService } from "./threat-intelligence";
export interface ExchangeContact {
    exchangeId: string;
    exchangeName: string;
    exchangeType: "cex" | "dex";
    complianceEmail?: string;
    compliancePhone?: string;
    emergencyEmail?: string;
    apiEndpoint?: string;
    responseTimeSla: number;
    freezeCapability: boolean;
    kycRequired: boolean;
    minFreezeAmount: number;
    supportedTokens: string[];
    documentationUrl?: string;
    notes?: string;
    isVerified: boolean;
    lastContactedAt?: Date;
    avgResponseTime?: number;
    successRate?: number;
}
export interface FreezeRequest {
    requestId: string;
    traceId: string;
    exchangeId: string;
    exchangeName: string;
    victimWallet: string;
    depositAddress: string;
    depositSignature: string;
    amount: number;
    tokenMint?: string;
    tokenSymbol?: string;
    status: FreezeRequestStatus;
    priority: "low" | "medium" | "high" | "critical";
    evidencePackageId?: string;
    submittedAt?: Date;
    acknowledgedAt?: Date;
    frozenAt?: Date;
    resolvedAt?: Date;
    exchangeTicketId?: string;
    exchangeResponse?: string;
    followUpCount: number;
    nextFollowUpAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type FreezeRequestStatus = "draft" | "pending_evidence" | "ready" | "submitted" | "acknowledged" | "under_review" | "frozen" | "partially_frozen" | "rejected" | "released" | "expired" | "closed";
export interface EvidencePackage {
    packageId: string;
    traceId: string;
    requestId: string;
    victimWallet: string;
    victimStatement?: string;
    incidentDate: Date;
    discoveryDate: Date;
    totalStolenAmount: number;
    tokenMint?: string;
    transactionSignatures: string[];
    fundFlowSummary: FundFlowStep[];
    exchangeDeposits: ExchangeDepositEvidence[];
    blockchainEvidence: BlockchainEvidence[];
    supportingDocuments: SupportingDocument[];
    generatedAt: Date;
    expiresAt: Date;
    hashSignature: string;
}
export interface FundFlowStep {
    stepNumber: number;
    fromAddress: string;
    toAddress: string;
    amount: number;
    signature: string;
    timestamp: Date;
    addressType: string;
    addressLabel?: string;
}
export interface ExchangeDepositEvidence {
    exchangeName: string;
    depositAddress: string;
    depositSignature: string;
    amount: number;
    timestamp: Date;
    blockHeight: number;
    confirmations: number;
}
export interface BlockchainEvidence {
    signature: string;
    blockHash: string;
    blockHeight: number;
    timestamp: Date;
    slot: number;
    confirmations: number;
    explorerUrl: string;
}
export interface SupportingDocument {
    documentId: string;
    documentType: "police_report" | "victim_statement" | "wallet_proof" | "other";
    fileName: string;
    fileHash: string;
    uploadedAt: Date;
}
export interface FreezeRequestTemplate {
    subject: string;
    body: string;
    attachments: string[];
}
/**
 * ExchangeCoordinator class
 * Manages exchange communications and freeze requests
 */
export declare class ExchangeCoordinator {
    private exchangeContacts;
    private threatIntel;
    constructor();
    /**
     * Set the threat intelligence service for Arkham entity fallback
     */
    setThreatIntel(service: ThreatIntelligenceService): void;
    /**
     * Load exchange contacts from database
     */
    private loadExchangeContacts;
    /**
     * Get exchange contact by ID
     */
    getExchangeContact(exchangeId: string): Promise<ExchangeContact | null>;
    /**
     * Get exchange contact by address
     */
    getExchangeByAddress(address: string): Promise<ExchangeContact | null>;
    /**
     * List all exchange contacts
     */
    listExchangeContacts(): Promise<ExchangeContact[]>;
    /**
     * Create a new freeze request
     */
    createFreezeRequest(traceId: string, exchangeName: string, depositAddress: string, depositSignature: string, amount: number, victimWallet: string, tokenMint?: string, tokenSymbol?: string): Promise<FreezeRequest>;
    /**
     * Calculate request priority based on amount
     */
    private calculatePriority;
    /**
     * Generate evidence package for a freeze request
     */
    generateEvidencePackage(requestId: string, traceId: string, victimWallet: string, victimStatement?: string): Promise<EvidencePackage>;
    /**
     * Generate formal freeze request email template
     */
    generateFreezeRequestEmail(request: FreezeRequest, evidencePackage: EvidencePackage, exchangeContact: ExchangeContact): FreezeRequestTemplate;
    /**
     * Update freeze request status
     */
    updateRequestStatus(requestId: string, status: FreezeRequestStatus, exchangeTicketId?: string, exchangeResponse?: string): Promise<void>;
    /**
     * Update exchange statistics based on request outcome
     */
    private updateExchangeStats;
    /**
     * Get freeze request by ID
     */
    getFreezeRequest(requestId: string): Promise<FreezeRequest | null>;
    /**
     * List freeze requests for a trace
     */
    listFreezeRequestsForTrace(traceId: string): Promise<FreezeRequest[]>;
    /**
     * List all pending freeze requests
     */
    listPendingRequests(): Promise<FreezeRequest[]>;
    /**
     * Get requests needing follow-up
     */
    getRequestsNeedingFollowUp(): Promise<FreezeRequest[]>;
    /**
     * Record follow-up action
     */
    recordFollowUp(requestId: string, nextFollowUpHours?: number): Promise<void>;
    /**
     * Get evidence package
     */
    getEvidencePackage(packageId: string): Promise<EvidencePackage | null>;
    /**
     * Get freeze request statistics
     */
    getStatistics(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        successRate: number;
        avgResponseTime: number;
    }>;
    /**
     * Map database row to FreezeRequest
     */
    private mapRowToFreezeRequest;
}
export declare const exchangeCoordinator: ExchangeCoordinator;
export default exchangeCoordinator;
