/**
 * Lavinth React SDK
 * React components and hooks for wallet security integration
 */

// Context
export { LavinthProvider, useLavinth, useLavinthContext } from './context';
export type { LavinthContextValue } from './context';

// Hooks
export {
  useSecurityProfile,
  useCompromiseDetection,
  useApprovals,
  useFundTracing,
  useFreezeRequests,
  useSimulation,
} from './hooks';

export type {
  UseSecurityProfileOptions,
  UseSecurityProfileResult,
  UseCompromiseDetectionOptions,
  UseCompromiseDetectionResult,
  UseApprovalsOptions,
  UseApprovalsResult,
  UseFundTracingOptions,
  UseFundTracingResult,
  UseFreezeRequestsOptions,
  UseFreezeRequestsResult,
  UseSimulationOptions,
  UseSimulationResult,
} from './hooks';

// Components
export { SecurityAlertBanner } from './components/SecurityAlertBanner';
export { EmergencyRecoveryModal } from './components/EmergencyRecoveryModal';
export { ApprovalsList } from './components/ApprovalsList';
export { FundTraceViewer } from './components/FundTraceViewer';
export { RecoveryWizard } from './components/RecoveryWizard';

// Re-export types from core SDK
export type {
  LavinthConfig,
  SecurityProfile,
  ThreatMetrics,
  TokenApproval,
  RevocationPlan,
  RevocationTransaction,
  CompromiseAnalysis,
  CompromiseIndicator,
  SecurityAlert,
  FundTrace,
  TraceHop,
  RecoveryReport,
  RecoveryRecommendation,
  FreezeRequest,
  ExchangeContact,
  EvidencePackage,
  LavinthError,
  // Simulation types
  SimulationResult,
  SimulationWarning,
  SimulationRiskLevel,
  QuickRiskCheck,
  VerifiedProgram,
  SimulationAlert,
  TransactionEffect,
  BalanceChange,
  ApprovalChange,
  ProgramInfo,
} from '@lavinth/sdk';
