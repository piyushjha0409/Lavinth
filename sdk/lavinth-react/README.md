# @lavinth/react

React components and hooks for Lavinth - Post-Compromise Wallet Recovery Platform for Solana.

## Installation

```bash
npm install @lavinth/sdk @lavinth/react
# or
yarn add @lavinth/sdk @lavinth/react
# or
pnpm add @lavinth/sdk @lavinth/react
```

## Quick Start

```tsx
import {
  LavinthProvider,
  useSecurityProfile,
  useApprovals,
  SecurityAlertBanner,
  EmergencyRecoveryModal,
} from '@lavinth/react';

// Wrap your app with the provider
function App() {
  return (
    <LavinthProvider config={{ apiKey: 'your-api-key' }}>
      <SecurityDashboard />
    </LavinthProvider>
  );
}

// Use hooks in your components
function SecurityDashboard() {
  const { profile, isLoading, error, scan, refresh } = useSecurityProfile({
    walletAddress: 'YOUR_WALLET',
    autoScan: true,
  });

  const { approvals, highRiskApprovals, emergencyRevoke } = useApprovals({
    walletAddress: 'YOUR_WALLET',
    autoFetch: true,
  });

  return (
    <div>
      <h1>Security Score: {profile?.overallRiskScore}</h1>
      <p>{highRiskApprovals.length} high-risk approvals</p>
    </div>
  );
}
```

## Provider

Wrap your application with `LavinthProvider`:

```tsx
import { LavinthProvider } from '@lavinth/react';

function App() {
  return (
    <LavinthProvider
      config={{
        apiKey: process.env.REACT_APP_LAVINTH_API_KEY,
        apiUrl: 'https://api.lavinth.io',
      }}
    >
      {children}
    </LavinthProvider>
  );
}
```

## Hooks

### useSecurityProfile

Monitor wallet security status.

```tsx
const {
  profile,           // SecurityProfile | null
  isLoading,         // boolean
  error,             // LavinthError | null
  scan,              // (address?) => Promise<SecurityProfile | null>
  refresh,           // () => Promise<void>
} = useSecurityProfile({
  walletAddress: '...',
  autoScan: true,
});
```

### useCompromiseDetection

Detect wallet compromise with real-time monitoring.

```tsx
const {
  analysis,          // CompromiseAnalysis | null
  isCompromised,     // boolean
  riskScore,         // number (0-100)
  alerts,            // SecurityAlert[]
  isLoading,         // boolean
  error,             // LavinthError | null
  analyze,           // (address?) => Promise<CompromiseAnalysis | null>
  acknowledgeAlert,  // (alertId) => Promise<void>
} = useCompromiseDetection({
  walletAddress: '...',
  autoAnalyze: true,
  monitorInterval: 60000, // check every minute
});
```

### useApprovals

Manage token approvals and revocations.

```tsx
const {
  approvals,                    // TokenApproval[]
  highRiskApprovals,            // TokenApproval[]
  isLoading,                    // boolean
  error,                        // LavinthError | null
  fetchApprovals,               // (address?) => Promise<TokenApproval[]>
  createRevocationPlan,         // () => Promise<RevocationPlan | null>
  buildRevocationTransactions,  // () => Promise<{ sessionId, transactions } | null>
  emergencyRevoke,              // () => Promise<{ sessionId, transactions } | null>
} = useApprovals({
  walletAddress: '...',
  autoFetch: true,
});
```

### useFundTracing

Track stolen funds through the blockchain.

```tsx
const {
  traces,           // FundTrace[]
  currentTrace,     // FundTrace | null
  report,           // RecoveryReport | null
  isLoading,        // boolean
  isTracing,        // boolean
  error,            // LavinthError | null
  startTrace,       // (sourceWallet, amount, tokenMint?) => Promise<FundTrace | null>
  getTrace,         // (traceId) => Promise<FundTrace | null>
  fetchTraces,      // (address?) => Promise<FundTrace[]>
  generateReport,   // (traceId) => Promise<RecoveryReport | null>
} = useFundTracing({
  walletAddress: '...',
});
```

### useFreezeRequests

Manage exchange freeze requests.

```tsx
const {
  exchanges,              // ExchangeContact[]
  pendingRequests,        // FreezeRequest[]
  currentRequest,         // FreezeRequest | null
  evidencePackage,        // EvidencePackage | null
  emailTemplate,          // { subject, body, recipientEmail } | null
  isLoading,              // boolean
  error,                  // LavinthError | null
  fetchExchanges,         // () => Promise<ExchangeContact[]>
  fetchPendingRequests,   // () => Promise<FreezeRequest[]>
  createFreezeRequest,    // (params) => Promise<FreezeRequest | null>
  updateStatus,           // (requestId, status, ticketId?, response?) => Promise<void>
  generateEvidence,       // (requestId, traceId, victimWallet, statement?) => Promise<EvidencePackage | null>
  generateEmailTemplate,  // (requestId) => Promise<{ subject, body, recipientEmail } | null>
  getStatistics,          // () => Promise<Statistics | null>
} = useFreezeRequests({
  autoFetchExchanges: true,
  autoFetchPending: true,
});
```

## Components

### SecurityAlertBanner

Display security alerts with severity-based styling.

```tsx
<SecurityAlertBanner
  alerts={alerts}
  onDismiss={(alertId) => acknowledgeAlert(alertId)}
  onAction={(alertId, action) => handleAction(alertId, action)}
  maxVisible={5}
/>
```

### EmergencyRecoveryModal

Modal for emergency batch revocation of dangerous approvals.

```tsx
<EmergencyRecoveryModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  walletAddress={wallet.publicKey}
  highRiskApprovals={highRiskApprovals}
  onRevoke={emergencyRevoke}
  onSignTransaction={async (tx) => {
    return await wallet.signTransaction(tx.serializedTransaction);
  }}
/>
```

### ApprovalsList

Display and manage token approvals.

```tsx
<ApprovalsList
  approvals={approvals}
  isLoading={isLoading}
  onRevoke={async (approval) => {
    // Revoke single approval
  }}
  onRevokeSelected={async (selected) => {
    // Batch revoke
  }}
  showRiskBadge
  selectable
/>
```

### FundTraceViewer

Visualize fund tracing results.

```tsx
<FundTraceViewer
  trace={currentTrace}
  report={recoveryReport}
  onRequestFreeze={(hop) => {
    // Request freeze for exchange deposit
  }}
  onGenerateReport={() => generateReport(trace.traceId)}
/>
```

### RecoveryWizard

Step-by-step wallet recovery wizard.

```tsx
<RecoveryWizard
  compromisedWallet={wallet.publicKey}
  assets={safeAssets}
  onCreateNewWallet={async () => {
    const newWallet = await createWallet();
    return newWallet.publicKey;
  }}
  onTransferAssets={async (from, to, assets) => {
    await transferAll(from, to, assets);
  }}
  onComplete={(newWallet) => {
    setActiveWallet(newWallet);
  }}
/>
```

## Context Access

Access the SDK instance directly:

```tsx
import { useLavinth, useLavinthContext } from '@lavinth/react';

function MyComponent() {
  // Get SDK instance
  const lavinth = useLavinth();

  // Get full context (including alerts)
  const { sdk, alerts, addAlert, clearAlerts } = useLavinthContext();
}
```

## TypeScript

All types are fully exported:

```typescript
import type {
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
  SecurityAlertBannerProps,
  EmergencyRecoveryModalProps,
  ApprovalsListProps,
  FundTraceViewerProps,
  RecoveryWizardProps,
} from '@lavinth/react';
```

## License

MIT
