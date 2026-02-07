/**
 * Lavinth SDK Types
 * Core type definitions for the Lavinth security SDK
 */
interface LavinthConfig {
    apiKey: string;
    apiUrl?: string;
    environment?: 'production' | 'staging' | 'development';
    timeout?: number;
    retryAttempts?: number;
    onError?: (error: LavinthError) => void;
    onAlert?: (alert: SecurityAlert) => void;
}
declare class LavinthError extends Error {
    code: string;
    statusCode?: number;
    details?: any;
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
interface SecurityProfile {
    walletAddress: string;
    totalApprovals: number;
    activeApprovals: number;
    revokedApprovals: number;
    highRiskApprovals: number;
    mediumRiskApprovals: number;
    lowRiskApprovals: number;
    overallRiskScore: number;
    lastScannedAt: string;
    recommendations: SecurityRecommendation[];
}
interface SecurityRecommendation {
    type: 'revoke' | 'review' | 'monitor';
    priority: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    approvalId?: string;
}
interface RecoveryRecommendation {
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description?: string;
    estimatedRecovery?: number;
}
interface ThreatMetrics {
    dustAttacks: number;
    poisoningAttempts: number;
    riskyApprovals: number;
    suspiciousTransactions: number;
    totalThreats: number;
}
interface CompromiseIndicator {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    evidence: string[];
    timestamp: string;
}
interface TokenApproval {
    id: string;
    walletAddress: string;
    tokenAddress: string;
    tokenSymbol?: string;
    tokenName?: string;
    spenderAddress: string;
    spenderLabel?: string;
    isVerifiedSpender?: boolean;
    amount: number | 'unlimited';
    isUnlimited: boolean;
    riskScore: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    riskFactors: string[];
    createdAt: string;
    lastUsedAt?: string;
    revokedAt?: string;
    isActive: boolean;
}
interface CompromiseAnalysis {
    walletAddress: string;
    isCompromised: boolean;
    riskScore: number;
    confidence: number;
    indicators: CompromiseIndicator[];
    alerts: SecurityAlert[];
    recentTransactions: SuspiciousTransaction[];
    analyzedAt: string;
}
interface SecurityAlert {
    alertId: string;
    walletAddress: string;
    type: AlertType;
    alertType?: AlertType;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    suggestedAction?: string;
    metadata: Record<string, any>;
    createdAt: string;
    isAcknowledged: boolean;
    acknowledgedAt?: string;
}
type AlertType = 'large_outflow' | 'rapid_drain' | 'known_drainer' | 'suspicious_approval' | 'unusual_pattern' | 'bridge_exit' | 'exchange_deposit' | 'mixer_interaction';
interface SuspiciousTransaction {
    signature: string;
    walletAddress: string;
    transactionType: string;
    amount: number;
    tokenMint?: string;
    tokenSymbol?: string;
    counterparty?: string;
    counterpartyLabel?: string;
    isSuspicious: boolean;
    suspicionReasons: string[];
    riskScore: number;
    timestamp: string;
}
interface FundTrace {
    traceId: string;
    sourceWallet: string;
    initialAmount: number;
    totalAmount: number;
    recoveredAmount?: number;
    tokenMint?: string;
    tokenSymbol?: string;
    status: TraceStatus;
    currentDepth: number;
    maxDepth: number;
    totalTracked: number;
    totalRecoverable: number;
    recoveryProbability: number;
    hops: TraceHop[];
    fundDistribution: FundDistribution;
    exchangeDeposits: ExchangeDeposit[];
    bridgeTransfers: BridgeTransfer[];
    startedAt: string;
    completedAt?: string;
    lastUpdatedAt: string;
}
type TraceStatus = 'pending' | 'in_progress' | 'completed' | 'partial' | 'funds_recovered' | 'funds_lost';
interface TraceHop {
    address: string;
    amount: number;
    timestamp: string;
    transactionSignature?: string;
    entityType: 'wallet' | 'exchange' | 'dex' | 'bridge' | 'mixer' | 'contract' | 'unknown';
    entityLabel?: string;
    isKnown: boolean;
}
interface FundDistribution {
    inExchanges: number;
    inBridges: number;
    inMixers: number;
    inUnknown: number;
    remaining: number;
}
interface ExchangeDeposit {
    exchangeName: string;
    exchangeAddress: string;
    amount: number;
    signature: string;
    timestamp: string;
    isRecoverable: boolean;
}
interface BridgeTransfer {
    bridgeName: string;
    bridgeAddress: string;
    destinationChain: string;
    amount: number;
    signature: string;
    timestamp: string;
}
interface RecoveryReport {
    traceId: string;
    sourceWallet: string;
    totalStolen: number;
    tracingDepth: number;
    uniqueAddresses: number;
    totalTransactions: number;
    fundDistribution: FundDistribution;
    exchangeDeposits: ExchangeDeposit[];
    bridgeTransfers: BridgeTransfer[];
    recoveryProbability: number;
    recommendations: RecoveryRecommendation[];
    recommendedActions?: string[];
    generatedAt: string;
}
interface FreezeRequest {
    requestId: string;
    traceId: string;
    exchangeId: string;
    exchangeName: string;
    victimWallet: string;
    depositAddress: string;
    depositSignature: string;
    amount: number;
    tokenSymbol?: string;
    status: FreezeRequestStatus;
    priority: 'critical' | 'high' | 'medium' | 'low';
    evidencePackageId?: string;
    submittedAt?: string;
    acknowledgedAt?: string;
    frozenAt?: string;
    resolvedAt?: string;
    exchangeTicketId?: string;
    exchangeResponse?: string;
    createdAt: string;
    updatedAt: string;
}
type FreezeRequestStatus = 'draft' | 'pending_evidence' | 'ready' | 'submitted' | 'acknowledged' | 'under_review' | 'frozen' | 'partially_frozen' | 'rejected' | 'released' | 'expired' | 'closed';
interface ExchangeContact {
    exchangeId: string;
    exchangeName: string;
    exchangeType: 'cex' | 'dex';
    complianceEmail?: string;
    emergencyEmail?: string;
    responseTimeSla: number;
    freezeCapability: boolean;
    isVerified: boolean;
    successRate?: number;
}
interface EvidencePackage {
    packageId: string;
    evidenceId: string;
    traceId: string;
    requestId: string;
    victimWallet: string;
    victimStatement?: string;
    incidentDate: string;
    discoveryDate: string;
    totalStolenAmount: number;
    tokenMint?: string;
    transactionSignatures: string[];
    blockchainEvidence: BlockchainEvidence[];
    chainOfCustody: FundFlowStep[];
    fundFlowSummary: FundFlowStep[];
    exchangeDeposits: ExchangeDepositEvidence[];
    verificationHash: string;
    hashSignature: string;
    generatedAt: string;
    expiresAt: string;
}
interface BlockchainEvidence {
    type: 'transaction' | 'approval' | 'token_transfer' | 'program_call';
    signature: string;
    timestamp: string;
    description: string;
    data: Record<string, any>;
}
interface FundFlowStep {
    stepNumber: number;
    fromAddress: string;
    toAddress: string;
    amount: number;
    signature: string;
    timestamp: string;
    addressType: string;
    addressLabel?: string;
}
interface ExchangeDepositEvidence {
    exchangeName: string;
    depositAddress: string;
    depositSignature: string;
    amount: number;
    timestamp: string;
    blockHeight: number;
    confirmations: number;
}
interface RevocationPlan {
    sessionId: string;
    walletAddress: string;
    totalApprovals: number;
    totalTransactions: number;
    estimatedTotalFee: number;
    approvals: TokenApproval[];
    createdAt: string;
}
interface RevocationTransaction {
    transactionIndex: number;
    approvalId: string;
    spenderAddress: string;
    tokenAddress: string;
    tokenSymbol?: string;
    serializedTransaction: string;
    estimatedFee: number;
}
interface RevocationResult {
    sessionId: string;
    totalRevoked: number;
    totalFailed: number;
    results: RevocationItemResult[];
    completedAt: string;
}
interface RevocationItemResult {
    approvalId: string;
    success: boolean;
    signature?: string;
    error?: string;
}
interface MonitoringConfig {
    walletAddress: string;
    alertChannels: AlertChannels;
    monitoringLevel: 'basic' | 'standard' | 'enhanced';
    alertThresholds?: AlertThresholds;
}
interface AlertChannels {
    webhook?: string;
    discord?: string;
    email?: string;
}
interface AlertThresholds {
    minAlertAmount?: number;
    maxDailyAlerts?: number;
    severityFilter?: ('critical' | 'high' | 'medium' | 'low')[];
}
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
}
type LavinthEvent = {
    type: 'alert';
    data: SecurityAlert;
} | {
    type: 'compromise_detected';
    data: CompromiseAnalysis;
} | {
    type: 'approval_revoked';
    data: TokenApproval;
} | {
    type: 'trace_updated';
    data: FundTrace;
} | {
    type: 'freeze_status_changed';
    data: FreezeRequest;
} | {
    type: 'error';
    data: LavinthError;
};
type EventHandler = (event: LavinthEvent) => void;
type SimulationRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
interface SimulationResult {
    simulationId: string;
    success: boolean;
    riskLevel: SimulationRiskLevel;
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
interface SimulationWarning {
    type: WarningType;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    message: string;
    details?: Record<string, any>;
}
type WarningType = 'unlimited_approval' | 'high_value_transfer' | 'unknown_program' | 'suspicious_recipient' | 'drainer_signature' | 'authority_change' | 'account_closure' | 'multiple_approvals' | 'unusual_instruction_order' | 'known_exploit_pattern' | 'unverified_program' | 'low_balance_warning';
interface TransactionEffect {
    type: EffectType;
    description: string;
    riskContribution: number;
    details: Record<string, any>;
}
type EffectType = 'sol_transfer' | 'token_transfer' | 'token_approval' | 'token_revoke' | 'account_creation' | 'account_closure' | 'authority_change' | 'program_call' | 'nft_transfer' | 'swap';
interface BalanceChange {
    tokenAddress: string;
    tokenSymbol?: string;
    tokenName?: string;
    before: number;
    after: number;
    change: number;
    isNative: boolean;
    usdValue?: number;
}
interface ApprovalChange {
    tokenAddress: string;
    tokenSymbol?: string;
    spenderAddress: string;
    spenderLabel?: string;
    isKnownSpender: boolean;
    previousAmount: number | null;
    newAmount: number | 'unlimited';
    isRevoke: boolean;
    riskLevel: SimulationRiskLevel;
}
interface ProgramInfo {
    programId: string;
    programName?: string;
    category?: string;
    isVerified: boolean;
    isAudited: boolean;
    riskLevel: SimulationRiskLevel;
    instructionCount: number;
}
interface QuickRiskCheck {
    riskLevel: SimulationRiskLevel;
    riskScore: number;
    warnings: SimulationWarning[];
    shouldSimulate: boolean;
    recommendation: 'proceed' | 'simulate_first' | 'review_carefully' | 'do_not_sign';
}
interface VerifiedProgram {
    programId: string;
    programName: string;
    category?: string;
    description?: string;
    websiteUrl?: string;
    isVerified: boolean;
    isAudited: boolean;
    auditUrl?: string;
    riskLevel: SimulationRiskLevel;
}
interface SimulationAlert {
    alertId: string;
    simulationId?: string;
    walletAddress: string;
    alertType: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details?: Record<string, any>;
    isAcknowledged: boolean;
    acknowledgedAt?: string;
    createdAt: string;
}

/**
 * Lavinth SDK
 * Main SDK class for wallet security operations
 */

declare class Lavinth {
    private client;
    private config;
    private eventHandlers;
    constructor(config: LavinthConfig);
    /**
     * Subscribe to Lavinth events
     */
    on(handler: EventHandler): () => void;
    /**
     * Emit an event to all subscribers
     */
    private emit;
    /**
     * Scan a wallet for token approvals and generate security profile
     */
    scanWallet(walletAddress: string): Promise<SecurityProfile>;
    /**
     * Get cached security profile for a wallet
     */
    getSecurityProfile(walletAddress: string): Promise<SecurityProfile | null>;
    /**
     * Get all token approvals for a wallet
     */
    getApprovals(walletAddress: string): Promise<TokenApproval[]>;
    /**
     * Create a revocation plan for all risky approvals
     */
    createRevocationPlan(walletAddress: string): Promise<RevocationPlan>;
    /**
     * Build unsigned revocation transactions
     */
    buildRevocationTransactions(walletAddress: string): Promise<{
        sessionId: string;
        transactions: RevocationTransaction[];
    }>;
    /**
     * Submit signed revocation transactions
     */
    submitRevocations(sessionId: string, signedTransactions: string[]): Promise<RevocationResult>;
    /**
     * Emergency revoke all high-risk approvals
     */
    emergencyRevoke(walletAddress: string): Promise<{
        sessionId: string;
        transactions: RevocationTransaction[];
    }>;
    /**
     * Analyze a wallet for signs of compromise
     */
    analyzeCompromise(walletAddress: string): Promise<CompromiseAnalysis>;
    /**
     * Get alerts for a wallet
     */
    getAlerts(walletAddress: string, limit?: number): Promise<SecurityAlert[]>;
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert(alertId: string): Promise<void>;
    /**
     * Register a wallet for monitoring
     */
    registerForMonitoring(config: MonitoringConfig): Promise<void>;
    /**
     * Create alert subscription
     */
    subscribeToAlerts(walletAddress: string, channels: {
        webhook?: string;
        discord?: string;
        email?: string;
    }): Promise<void>;
    /**
     * Unsubscribe from alerts
     */
    unsubscribeFromAlerts(walletAddress: string): Promise<void>;
    /**
     * Start tracing stolen funds
     */
    startFundTrace(sourceWallet: string, initialAmount: number, tokenMint?: string): Promise<FundTrace>;
    /**
     * Get fund trace status
     */
    getTrace(traceId: string): Promise<FundTrace | null>;
    /**
     * Get all traces for a wallet
     */
    getTracesForWallet(walletAddress: string): Promise<FundTrace[]>;
    /**
     * Generate recovery report
     */
    generateRecoveryReport(traceId: string): Promise<RecoveryReport>;
    /**
     * Get list of supported exchanges
     */
    getExchangeContacts(): Promise<ExchangeContact[]>;
    /**
     * Create a freeze request
     */
    createFreezeRequest(params: {
        traceId: string;
        exchangeName: string;
        depositAddress: string;
        depositSignature: string;
        amount: number;
        victimWallet: string;
        tokenMint?: string;
        tokenSymbol?: string;
    }): Promise<FreezeRequest>;
    /**
     * Get freeze request by ID
     */
    getFreezeRequest(requestId: string): Promise<FreezeRequest | null>;
    /**
     * Get pending freeze requests
     */
    getPendingFreezeRequests(): Promise<FreezeRequest[]>;
    /**
     * Update freeze request status
     */
    updateFreezeRequestStatus(requestId: string, status: string, exchangeTicketId?: string, exchangeResponse?: string): Promise<void>;
    /**
     * Generate evidence package
     */
    generateEvidencePackage(requestId: string, traceId: string, victimWallet: string, victimStatement?: string): Promise<EvidencePackage>;
    /**
     * Generate freeze request email template
     */
    generateFreezeRequestEmail(requestId: string): Promise<{
        subject: string;
        body: string;
        recipientEmail?: string;
    }>;
    /**
     * Report a malicious delegate/spender address
     */
    reportMaliciousAddress(address: string, label: string, category: string, reportedLosses?: number): Promise<void>;
    /**
     * Check if an address is a known exchange
     */
    isKnownExchange(address: string): Promise<ExchangeContact | null>;
    /**
     * Get freeze request statistics
     */
    getFreezeStatistics(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        successRate: number;
        avgResponseTime: number;
    }>;
    /**
     * Simulate a transaction before signing
     * Returns detailed risk analysis and predicted effects
     */
    simulateTransaction(serializedTransaction: string, walletAddress: string, storeResult?: boolean): Promise<SimulationResult>;
    /**
     * Quick risk check for a transaction (lightweight)
     * Use for pre-screening before full simulation
     */
    quickRiskCheck(serializedTransaction: string): Promise<QuickRiskCheck>;
    /**
     * Get simulation history for a wallet
     */
    getSimulationHistory(walletAddress: string, limit?: number): Promise<SimulationResult[]>;
    /**
     * Get a specific simulation by ID
     */
    getSimulation(simulationId: string): Promise<SimulationResult | null>;
    /**
     * Get list of verified programs
     */
    getVerifiedPrograms(): Promise<VerifiedProgram[]>;
    /**
     * Check if a program is verified
     */
    checkProgram(programId: string): Promise<VerifiedProgram | null>;
    /**
     * Get simulation alerts for a wallet
     */
    getSimulationAlerts(walletAddress: string, limit?: number, acknowledged?: boolean): Promise<SimulationAlert[]>;
    /**
     * Acknowledge a simulation alert
     */
    acknowledgeSimulationAlert(alertId: string): Promise<void>;
}

/**
 * Lavinth API Client
 * Handles all HTTP communication with the Lavinth API
 */

declare class ApiClient {
    private apiKey;
    private apiUrl;
    private timeout;
    private retryAttempts;
    private onError?;
    constructor(config: LavinthConfig);
    private getApiUrlForEnvironment;
    private sleep;
    private fetchWithRetry;
    private getHeaders;
    get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>>;
    post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>>;
    patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>>;
    delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}

/**
 * Lavinth SDK
 *
 * A comprehensive SDK for Solana wallet security:
 * - Token approval scanning and management
 * - Compromise detection and alerting
 * - Fund tracing and recovery
 * - Exchange coordination for fund freezing
 *
 * @example
 * ```typescript
 * import { Lavinth } from '@lavinth/sdk';
 *
 * const lavinth = new Lavinth({
 *   apiKey: 'your-api-key',
 *   environment: 'production',
 *   onAlert: (alert) => console.log('Security alert:', alert),
 * });
 *
 * // Scan wallet for approvals
 * const profile = await lavinth.scanWallet('your-wallet-address');
 *
 * // Check for compromise
 * const analysis = await lavinth.analyzeCompromise('your-wallet-address');
 *
 * // Start fund trace
 * const trace = await lavinth.startFundTrace('victim-wallet', 10.5);
 * ```
 */

declare const VERSION = "1.0.0";

declare function createLavinth(config: LavinthConfig): Lavinth;

export { type AlertChannels, type AlertThresholds, type AlertType, ApiClient, type ApiResponse, type ApprovalChange, type BalanceChange, type BlockchainEvidence, type BridgeTransfer, type CompromiseAnalysis, type CompromiseIndicator, type EffectType, type EventHandler, type EvidencePackage, type ExchangeContact, type ExchangeDeposit, type ExchangeDepositEvidence, type FreezeRequest, type FreezeRequestStatus, type FundDistribution, type FundFlowStep, type FundTrace, Lavinth, type LavinthConfig, LavinthError, type LavinthEvent, type MonitoringConfig, type ProgramInfo, type QuickRiskCheck, type RecoveryRecommendation, type RecoveryReport, type RevocationItemResult, type RevocationPlan, type RevocationResult, type RevocationTransaction, type SecurityAlert, type SecurityProfile, type SecurityRecommendation, type SimulationAlert, type SimulationResult, type SimulationRiskLevel, type SimulationWarning, type SuspiciousTransaction, type ThreatMetrics, type TokenApproval, type TraceHop, type TraceStatus, type TransactionEffect, VERSION, type VerifiedProgram, type WarningType, createLavinth, Lavinth as default };
