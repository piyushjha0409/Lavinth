/**
 * Lavinth SDK Types
 * Core type definitions for the Lavinth security SDK
 */

// Configuration
export interface LavinthConfig {
  apiKey: string;
  apiUrl?: string;
  environment?: 'production' | 'staging' | 'development';
  timeout?: number;
  retryAttempts?: number;
  onError?: (error: LavinthError) => void;
  onAlert?: (alert: SecurityAlert) => void;
}

// Errors
export class LavinthError extends Error {
  code: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'LavinthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Security Profile
export interface SecurityProfile {
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

export interface SecurityRecommendation {
  type: 'revoke' | 'review' | 'monitor';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  approvalId?: string;
}

// Recovery Recommendation (used in RecoveryReport)
export interface RecoveryRecommendation {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  estimatedRecovery?: number;
}

// Threat Metrics for security profile
export interface ThreatMetrics {
  dustAttacks: number;
  poisoningAttempts: number;
  riskyApprovals: number;
  suspiciousTransactions: number;
  totalThreats: number;
}

// Compromise Indicators
export interface CompromiseIndicator {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: string[];
  timestamp: string;
}

// Token Approvals
export interface TokenApproval {
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

// Compromise Detection
export interface CompromiseAnalysis {
  walletAddress: string;
  isCompromised: boolean;
  riskScore: number;
  confidence: number;
  indicators: CompromiseIndicator[];
  alerts: SecurityAlert[];
  recentTransactions: SuspiciousTransaction[];
  analyzedAt: string;
}

export interface SecurityAlert {
  alertId: string;
  walletAddress: string;
  type: AlertType;
  alertType?: AlertType; // Alias for backward compatibility
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedAction?: string;
  metadata: Record<string, any>;
  createdAt: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
}

export type AlertType =
  | 'large_outflow'
  | 'rapid_drain'
  | 'known_drainer'
  | 'suspicious_approval'
  | 'unusual_pattern'
  | 'bridge_exit'
  | 'exchange_deposit'
  | 'mixer_interaction';

export interface SuspiciousTransaction {
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

// Fund Tracing
export interface FundTrace {
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

export type TraceStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'funds_recovered'
  | 'funds_lost';

// Trace Hop - represents a single step in fund tracing
export interface TraceHop {
  address: string;
  amount: number;
  timestamp: string;
  transactionSignature?: string;
  entityType: 'wallet' | 'exchange' | 'dex' | 'bridge' | 'mixer' | 'contract' | 'unknown';
  entityLabel?: string;
  isKnown: boolean;
}

export interface FundDistribution {
  inExchanges: number;
  inBridges: number;
  inMixers: number;
  inUnknown: number;
  remaining: number;
}

export interface ExchangeDeposit {
  exchangeName: string;
  exchangeAddress: string;
  amount: number;
  signature: string;
  timestamp: string;
  isRecoverable: boolean;
}

export interface BridgeTransfer {
  bridgeName: string;
  bridgeAddress: string;
  destinationChain: string;
  amount: number;
  signature: string;
  timestamp: string;
}

// Recovery Report
export interface RecoveryReport {
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
  recommendedActions?: string[]; // Deprecated, use recommendations
  generatedAt: string;
}

// Freeze Requests
export interface FreezeRequest {
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

export type FreezeRequestStatus =
  | 'draft'
  | 'pending_evidence'
  | 'ready'
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'frozen'
  | 'partially_frozen'
  | 'rejected'
  | 'released'
  | 'expired'
  | 'closed';

// Exchange Contacts
export interface ExchangeContact {
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

// Evidence Package
export interface EvidencePackage {
  packageId: string;
  evidenceId: string; // Alias for packageId
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

export interface BlockchainEvidence {
  type: 'transaction' | 'approval' | 'token_transfer' | 'program_call';
  signature: string;
  timestamp: string;
  description: string;
  data: Record<string, any>;
}

export interface FundFlowStep {
  stepNumber: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: string;
  timestamp: string;
  addressType: string;
  addressLabel?: string;
}

export interface ExchangeDepositEvidence {
  exchangeName: string;
  depositAddress: string;
  depositSignature: string;
  amount: number;
  timestamp: string;
  blockHeight: number;
  confirmations: number;
}

// Revocation
export interface RevocationPlan {
  sessionId: string;
  walletAddress: string;
  totalApprovals: number;
  totalTransactions: number;
  estimatedTotalFee: number;
  approvals: TokenApproval[];
  createdAt: string;
}

export interface RevocationTransaction {
  transactionIndex: number;
  approvalId: string;
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol?: string;
  serializedTransaction: string;
  estimatedFee: number;
}

export interface RevocationResult {
  sessionId: string;
  totalRevoked: number;
  totalFailed: number;
  results: RevocationItemResult[];
  completedAt: string;
}

export interface RevocationItemResult {
  approvalId: string;
  success: boolean;
  signature?: string;
  error?: string;
}

// Monitoring
export interface MonitoringConfig {
  walletAddress: string;
  alertChannels: AlertChannels;
  monitoringLevel: 'basic' | 'standard' | 'enhanced';
  alertThresholds?: AlertThresholds;
}

export interface AlertChannels {
  webhook?: string;
  discord?: string;
  email?: string;
}

export interface AlertThresholds {
  minAlertAmount?: number;
  maxDailyAlerts?: number;
  severityFilter?: ('critical' | 'high' | 'medium' | 'low')[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

// Event Types for Callbacks
export type LavinthEvent =
  | { type: 'alert'; data: SecurityAlert }
  | { type: 'compromise_detected'; data: CompromiseAnalysis }
  | { type: 'approval_revoked'; data: TokenApproval }
  | { type: 'trace_updated'; data: FundTrace }
  | { type: 'freeze_status_changed'; data: FreezeRequest }
  | { type: 'error'; data: LavinthError };

export type EventHandler = (event: LavinthEvent) => void;

// ============================================
// Transaction Simulation Types
// ============================================

export type SimulationRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface SimulationResult {
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

export interface SimulationWarning {
  type: WarningType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  details?: Record<string, any>;
}

export type WarningType =
  | 'unlimited_approval'
  | 'high_value_transfer'
  | 'unknown_program'
  | 'suspicious_recipient'
  | 'drainer_signature'
  | 'authority_change'
  | 'account_closure'
  | 'multiple_approvals'
  | 'unusual_instruction_order'
  | 'known_exploit_pattern'
  | 'unverified_program'
  | 'low_balance_warning';

export interface TransactionEffect {
  type: EffectType;
  description: string;
  riskContribution: number;
  details: Record<string, any>;
}

export type EffectType =
  | 'sol_transfer'
  | 'token_transfer'
  | 'token_approval'
  | 'token_revoke'
  | 'account_creation'
  | 'account_closure'
  | 'authority_change'
  | 'program_call'
  | 'nft_transfer'
  | 'swap';

export interface BalanceChange {
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  before: number;
  after: number;
  change: number;
  isNative: boolean;
  usdValue?: number;
}

export interface ApprovalChange {
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

export interface ProgramInfo {
  programId: string;
  programName?: string;
  category?: string;
  isVerified: boolean;
  isAudited: boolean;
  riskLevel: SimulationRiskLevel;
  instructionCount: number;
}

export interface QuickRiskCheck {
  riskLevel: SimulationRiskLevel;
  riskScore: number;
  warnings: SimulationWarning[];
  shouldSimulate: boolean;
  recommendation: 'proceed' | 'simulate_first' | 'review_carefully' | 'do_not_sign';
}

export interface VerifiedProgram {
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

export interface SimulationAlert {
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
