import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';
import { Lavinth, SecurityAlert, LavinthConfig, LavinthEvent, SecurityProfile, LavinthError, CompromiseAnalysis, TokenApproval, RevocationPlan, RevocationTransaction, FundTrace, RecoveryReport, ExchangeContact, FreezeRequest, EvidencePackage, SimulationResult, SimulationAlert, VerifiedProgram, QuickRiskCheck, TraceHop } from '@lavinth/sdk';
export { ApprovalChange, BalanceChange, CompromiseAnalysis, CompromiseIndicator, EvidencePackage, ExchangeContact, FreezeRequest, FundTrace, LavinthConfig, LavinthError, ProgramInfo, QuickRiskCheck, RecoveryRecommendation, RecoveryReport, RevocationPlan, RevocationTransaction, SecurityAlert, SecurityProfile, SimulationAlert, SimulationResult, SimulationRiskLevel, SimulationWarning, ThreatMetrics, TokenApproval, TraceHop, TransactionEffect, VerifiedProgram } from '@lavinth/sdk';

interface LavinthContextValue {
    sdk: Lavinth | null;
    isInitialized: boolean;
    alerts: SecurityAlert[];
    clearAlerts: () => void;
}
interface LavinthProviderProps {
    config: LavinthConfig;
    children: React.ReactNode;
    onEvent?: (event: LavinthEvent) => void;
}
/**
 * Lavinth Provider Component
 *
 * Wrap your app with this provider to access Lavinth functionality
 *
 * @example
 * ```tsx
 * <LavinthProvider config={{ apiKey: 'your-api-key' }}>
 *   <App />
 * </LavinthProvider>
 * ```
 */
declare function LavinthProvider({ config, children, onEvent, }: LavinthProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access Lavinth context
 *
 * @throws Error if used outside LavinthProvider
 */
declare function useLavinthContext(): LavinthContextValue;
/**
 * Hook to get Lavinth SDK instance
 *
 * @throws Error if SDK is not initialized
 */
declare function useLavinth(): Lavinth;

/**
 * useSecurityProfile Hook
 * Fetches and manages wallet security profile
 */

interface UseSecurityProfileOptions {
    walletAddress?: string;
    autoScan?: boolean;
    refreshInterval?: number;
}
interface UseSecurityProfileResult {
    profile: SecurityProfile | null;
    isLoading: boolean;
    error: LavinthError | null;
    scan: (address?: string) => Promise<SecurityProfile | null>;
    refresh: () => Promise<void>;
}
/**
 * Hook to manage wallet security profile
 *
 * @example
 * ```tsx
 * const { profile, isLoading, scan } = useSecurityProfile({
 *   walletAddress: '...',
 *   autoScan: true,
 * });
 * ```
 */
declare function useSecurityProfile(options?: UseSecurityProfileOptions): UseSecurityProfileResult;

/**
 * useCompromiseDetection Hook
 * Analyzes wallet for signs of compromise
 */

interface UseCompromiseDetectionOptions {
    walletAddress?: string;
    autoAnalyze?: boolean;
    monitorInterval?: number;
}
interface UseCompromiseDetectionResult {
    analysis: CompromiseAnalysis | null;
    isCompromised: boolean;
    riskScore: number;
    alerts: SecurityAlert[];
    isLoading: boolean;
    error: LavinthError | null;
    analyze: (address?: string) => Promise<CompromiseAnalysis | null>;
    acknowledgeAlert: (alertId: string) => Promise<void>;
}
/**
 * Hook to detect wallet compromise
 *
 * @example
 * ```tsx
 * const { isCompromised, riskScore, alerts, analyze } = useCompromiseDetection({
 *   walletAddress: '...',
 *   autoAnalyze: true,
 * });
 *
 * if (isCompromised) {
 *   // Show emergency recovery UI
 * }
 * ```
 */
declare function useCompromiseDetection(options?: UseCompromiseDetectionOptions): UseCompromiseDetectionResult;

/**
 * useApprovals Hook
 * Manages token approvals and revocation
 */

interface UseApprovalsOptions {
    walletAddress?: string;
    autoFetch?: boolean;
}
interface UseApprovalsResult {
    approvals: TokenApproval[];
    highRiskApprovals: TokenApproval[];
    isLoading: boolean;
    error: LavinthError | null;
    fetchApprovals: (address?: string) => Promise<TokenApproval[]>;
    createRevocationPlan: () => Promise<RevocationPlan | null>;
    buildRevocationTransactions: () => Promise<{
        sessionId: string;
        transactions: RevocationTransaction[];
    } | null>;
    emergencyRevoke: () => Promise<{
        sessionId: string;
        transactions: RevocationTransaction[];
    } | null>;
}
/**
 * Hook to manage token approvals
 *
 * @example
 * ```tsx
 * const {
 *   approvals,
 *   highRiskApprovals,
 *   createRevocationPlan,
 *   emergencyRevoke,
 * } = useApprovals({ walletAddress: '...' });
 *
 * // Emergency revoke all high-risk approvals
 * const { sessionId, transactions } = await emergencyRevoke();
 * // Sign and submit transactions...
 * ```
 */
declare function useApprovals(options?: UseApprovalsOptions): UseApprovalsResult;

/**
 * useFundTracing Hook
 * Manages stolen fund tracing and recovery
 */

interface UseFundTracingOptions {
    walletAddress?: string;
}
interface UseFundTracingResult {
    traces: FundTrace[];
    currentTrace: FundTrace | null;
    report: RecoveryReport | null;
    isLoading: boolean;
    isTracing: boolean;
    error: LavinthError | null;
    startTrace: (sourceWallet: string, amount: number, tokenMint?: string) => Promise<FundTrace | null>;
    getTrace: (traceId: string) => Promise<FundTrace | null>;
    fetchTraces: (address?: string) => Promise<FundTrace[]>;
    generateReport: (traceId: string) => Promise<RecoveryReport | null>;
}
/**
 * Hook to manage fund tracing and recovery
 *
 * @example
 * ```tsx
 * const {
 *   traces,
 *   startTrace,
 *   generateReport,
 * } = useFundTracing({ walletAddress: '...' });
 *
 * // Start tracing stolen funds
 * const trace = await startTrace('victim-wallet', 10.5);
 *
 * // Generate recovery report
 * const report = await generateReport(trace.traceId);
 * console.log(`Recovery probability: ${report.recoveryProbability}%`);
 * ```
 */
declare function useFundTracing(options?: UseFundTracingOptions): UseFundTracingResult;

/**
 * useFreezeRequests Hook
 * Manages exchange freeze requests
 */

interface UseFreezeRequestsOptions {
    autoFetchExchanges?: boolean;
    autoFetchPending?: boolean;
}
interface UseFreezeRequestsResult {
    exchanges: ExchangeContact[];
    pendingRequests: FreezeRequest[];
    currentRequest: FreezeRequest | null;
    evidencePackage: EvidencePackage | null;
    emailTemplate: {
        subject: string;
        body: string;
        recipientEmail?: string;
    } | null;
    isLoading: boolean;
    error: LavinthError | null;
    fetchExchanges: () => Promise<ExchangeContact[]>;
    fetchPendingRequests: () => Promise<FreezeRequest[]>;
    createFreezeRequest: (params: {
        traceId: string;
        exchangeName: string;
        depositAddress: string;
        depositSignature: string;
        amount: number;
        victimWallet: string;
        tokenMint?: string;
        tokenSymbol?: string;
    }) => Promise<FreezeRequest | null>;
    updateStatus: (requestId: string, status: string, exchangeTicketId?: string, exchangeResponse?: string) => Promise<void>;
    generateEvidence: (requestId: string, traceId: string, victimWallet: string, victimStatement?: string) => Promise<EvidencePackage | null>;
    generateEmailTemplate: (requestId: string) => Promise<{
        subject: string;
        body: string;
        recipientEmail?: string;
    } | null>;
    getStatistics: () => Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        successRate: number;
        avgResponseTime: number;
    } | null>;
}
/**
 * Hook to manage exchange freeze requests
 *
 * @example
 * ```tsx
 * const {
 *   exchanges,
 *   createFreezeRequest,
 *   generateEvidence,
 *   generateEmailTemplate,
 * } = useFreezeRequests();
 *
 * // Create freeze request
 * const request = await createFreezeRequest({
 *   traceId: '...',
 *   exchangeName: 'Binance',
 *   depositAddress: '...',
 *   depositSignature: '...',
 *   amount: 10.5,
 *   victimWallet: '...',
 * });
 *
 * // Generate evidence and email
 * await generateEvidence(request.requestId, traceId, victimWallet);
 * const email = await generateEmailTemplate(request.requestId);
 * ```
 */
declare function useFreezeRequests(options?: UseFreezeRequestsOptions): UseFreezeRequestsResult;

/**
 * useSimulation Hook
 * Transaction simulation and risk analysis
 */

interface UseSimulationOptions {
    walletAddress?: string;
    autoFetchHistory?: boolean;
    autoFetchAlerts?: boolean;
    historyLimit?: number;
    alertsLimit?: number;
}
interface UseSimulationResult {
    currentSimulation: SimulationResult | null;
    history: SimulationResult[];
    alerts: SimulationAlert[];
    verifiedPrograms: VerifiedProgram[];
    isSimulating: boolean;
    isLoading: boolean;
    error: LavinthError | null;
    simulate: (serializedTransaction: string, storeResult?: boolean) => Promise<SimulationResult | null>;
    quickCheck: (serializedTransaction: string) => Promise<QuickRiskCheck | null>;
    getSimulation: (simulationId: string) => Promise<SimulationResult | null>;
    fetchHistory: (address?: string) => Promise<SimulationResult[]>;
    fetchAlerts: (address?: string, acknowledged?: boolean) => Promise<SimulationAlert[]>;
    acknowledgeAlert: (alertId: string) => Promise<void>;
    checkProgram: (programId: string) => Promise<VerifiedProgram | null>;
    fetchVerifiedPrograms: () => Promise<VerifiedProgram[]>;
    clearError: () => void;
}
/**
 * Hook for transaction simulation and risk analysis
 *
 * @example
 * ```tsx
 * const {
 *   simulate,
 *   quickCheck,
 *   currentSimulation,
 *   isSimulating,
 * } = useSimulation({ walletAddress: '...' });
 *
 * // Quick risk check before full simulation
 * const quickResult = await quickCheck(serializedTx);
 * if (quickResult?.shouldSimulate) {
 *   const result = await simulate(serializedTx);
 *   if (result?.riskLevel === 'critical') {
 *     // Warn user about critical risk
 *   }
 * }
 * ```
 */
declare function useSimulation(options?: UseSimulationOptions): UseSimulationResult;

/**
 * SecurityAlertBanner Component
 * Displays security alerts with severity-based styling
 */

interface SecurityAlertBannerProps {
    alerts: SecurityAlert[];
    onDismiss?: (alertId: string) => void;
    onAction?: (alertId: string, action: string) => void;
    maxVisible?: number;
    className?: string;
    styles?: {
        container?: React.CSSProperties;
        alert?: React.CSSProperties;
        critical?: React.CSSProperties;
        high?: React.CSSProperties;
        medium?: React.CSSProperties;
        low?: React.CSSProperties;
    };
}
/**
 * Displays security alerts with appropriate styling based on severity
 *
 * @example
 * ```tsx
 * <SecurityAlertBanner
 *   alerts={alerts}
 *   onDismiss={(id) => acknowledgeAlert(id)}
 *   onAction={(id, action) => handleAction(id, action)}
 * />
 * ```
 */
declare function SecurityAlertBanner({ alerts, onDismiss, onAction, maxVisible, className, styles, }: SecurityAlertBannerProps): React.ReactElement | null;

/**
 * EmergencyRecoveryModal Component
 * Modal for emergency wallet recovery actions
 */

interface EmergencyRecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
    highRiskApprovals: TokenApproval[];
    onRevoke: (approvals: TokenApproval[]) => Promise<{
        sessionId: string;
        transactions: RevocationTransaction[];
    } | null>;
    onSignTransaction?: (tx: RevocationTransaction) => Promise<string>;
    className?: string;
}
/**
 * Emergency recovery modal for batch revoking dangerous approvals
 *
 * @example
 * ```tsx
 * <EmergencyRecoveryModal
 *   isOpen={showEmergency}
 *   onClose={() => setShowEmergency(false)}
 *   walletAddress={wallet.publicKey}
 *   highRiskApprovals={highRiskApprovals}
 *   onRevoke={emergencyRevoke}
 *   onSignTransaction={signTransaction}
 * />
 * ```
 */
declare function EmergencyRecoveryModal({ isOpen, onClose, walletAddress, highRiskApprovals, onRevoke, onSignTransaction, className, }: EmergencyRecoveryModalProps): React.ReactElement | null;

/**
 * ApprovalsList Component
 * Displays and manages token approvals
 */

interface ApprovalsListProps {
    approvals: TokenApproval[];
    isLoading?: boolean;
    onRevoke?: (approval: TokenApproval) => Promise<void>;
    onRevokeSelected?: (approvals: TokenApproval[]) => Promise<void>;
    showRiskBadge?: boolean;
    selectable?: boolean;
    className?: string;
    styles?: {
        container?: React.CSSProperties;
        item?: React.CSSProperties;
        header?: React.CSSProperties;
    };
}
/**
 * Displays a list of token approvals with risk indicators and revocation options
 *
 * @example
 * ```tsx
 * <ApprovalsList
 *   approvals={approvals}
 *   onRevoke={async (approval) => {
 *     await revokeApproval(approval);
 *   }}
 *   showRiskBadge
 *   selectable
 * />
 * ```
 */
declare function ApprovalsList({ approvals, isLoading, onRevoke, onRevokeSelected, showRiskBadge, selectable, className, styles, }: ApprovalsListProps): React.ReactElement;

/**
 * FundTraceViewer Component
 * Visualizes stolen fund tracing results
 */

interface FundTraceViewerProps {
    trace: FundTrace | null;
    report?: RecoveryReport | null;
    isLoading?: boolean;
    onRequestFreeze?: (hop: TraceHop) => void;
    onGenerateReport?: () => void;
    className?: string;
}
/**
 * Displays fund tracing results with visual flow
 *
 * @example
 * ```tsx
 * <FundTraceViewer
 *   trace={currentTrace}
 *   report={recoveryReport}
 *   onRequestFreeze={(hop) => requestFreeze(hop)}
 *   onGenerateReport={() => generateReport(trace.traceId)}
 * />
 * ```
 */
declare function FundTraceViewer({ trace, report, isLoading, onRequestFreeze, onGenerateReport, className, }: FundTraceViewerProps): React.ReactElement;

/**
 * RecoveryWizard Component
 * Guides users through wallet migration after compromise
 */

interface RecoveryWizardProps {
    compromisedWallet: string;
    onCreateNewWallet?: () => Promise<string>;
    onTransferAssets?: (fromWallet: string, toWallet: string, assets: Asset[]) => Promise<void>;
    onComplete?: (newWallet: string) => void;
    assets?: Asset[];
    className?: string;
}
interface Asset {
    tokenAddress: string;
    tokenSymbol: string;
    amount: number;
    isSafe: boolean;
    usdValue?: number;
}
/**
 * Step-by-step wizard for recovering from a wallet compromise
 *
 * @example
 * ```tsx
 * <RecoveryWizard
 *   compromisedWallet={wallet.publicKey}
 *   assets={safeAssets}
 *   onCreateNewWallet={async () => {
 *     const newWallet = await createWallet();
 *     return newWallet.publicKey;
 *   }}
 *   onTransferAssets={async (from, to, assets) => {
 *     await transferAll(from, to, assets);
 *   }}
 *   onComplete={(newWallet) => {
 *     setActiveWallet(newWallet);
 *   }}
 * />
 * ```
 */
declare function RecoveryWizard({ compromisedWallet, onCreateNewWallet, onTransferAssets, onComplete, assets, className, }: RecoveryWizardProps): React.ReactElement;

export { ApprovalsList, EmergencyRecoveryModal, FundTraceViewer, type LavinthContextValue, LavinthProvider, RecoveryWizard, SecurityAlertBanner, type UseApprovalsOptions, type UseApprovalsResult, type UseCompromiseDetectionOptions, type UseCompromiseDetectionResult, type UseFreezeRequestsOptions, type UseFreezeRequestsResult, type UseFundTracingOptions, type UseFundTracingResult, type UseSecurityProfileOptions, type UseSecurityProfileResult, type UseSimulationOptions, type UseSimulationResult, useApprovals, useCompromiseDetection, useFreezeRequests, useFundTracing, useLavinth, useLavinthContext, useSecurityProfile, useSimulation };
