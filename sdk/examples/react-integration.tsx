/**
 * Lavinth React Integration Example
 *
 * This example demonstrates how to integrate Lavinth into a React application
 * for wallet security monitoring and emergency recovery.
 *
 * Installation:
 *   npm install @lavinth/sdk @lavinth/react
 *
 * Usage:
 *   1. Wrap your app with LavinthProvider
 *   2. Use hooks to access security features
 *   3. Render components for user interaction
 */

import React, { useState, useEffect } from 'react';

// Import from Lavinth SDK packages
import {
  LavinthProvider,
  useSecurityProfile,
  useCompromiseDetection,
  useApprovals,
  useFundTracing,
  useFreezeRequests,
  SecurityAlertBanner,
  EmergencyRecoveryModal,
  ApprovalsList,
  FundTraceViewer,
  RecoveryWizard,
} from '@lavinth/react';

// =============================================================================
// App Setup - Wrap your app with LavinthProvider
// =============================================================================

export function App() {
  return (
    <LavinthProvider
      config={{
        apiKey: process.env.REACT_APP_LAVINTH_API_KEY || '',
        baseUrl: 'https://api.lavinth.io', // or your self-hosted backend
      }}
    >
      <WalletSecurityDashboard />
    </LavinthProvider>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

function WalletSecurityDashboard() {
  // Get wallet address from your wallet adapter (Phantom, Solflare, etc.)
  const walletAddress = useWalletAddress(); // Your wallet hook

  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'trace' | 'freeze'>('overview');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showRecoveryWizard, setShowRecoveryWizard] = useState(false);

  // =============================================================================
  // Security Hooks
  // =============================================================================

  // Monitor wallet security profile
  const {
    profile,
    isLoading: profileLoading,
    refresh: refreshProfile,
  } = useSecurityProfile({
    walletAddress,
    autoScan: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // Compromise detection with real-time monitoring
  const {
    isCompromised,
    riskScore,
    alerts,
    analyze,
    acknowledgeAlert,
  } = useCompromiseDetection({
    walletAddress,
    autoAnalyze: true,
    monitorInterval: 60000, // Check every minute
  });

  // Token approvals management
  const {
    approvals,
    highRiskApprovals,
    isLoading: approvalsLoading,
    fetchApprovals,
    emergencyRevoke,
  } = useApprovals({
    walletAddress,
    autoFetch: true,
  });

  // Fund tracing for recovery
  const {
    traces,
    currentTrace,
    report,
    startTrace,
    generateReport,
  } = useFundTracing({ walletAddress });

  // Exchange freeze requests
  const {
    exchanges,
    createFreezeRequest,
    generateEvidence,
    generateEmailTemplate,
  } = useFreezeRequests({ autoFetchExchanges: true });

  // =============================================================================
  // Auto-trigger emergency mode on compromise detection
  // =============================================================================

  useEffect(() => {
    if (isCompromised && highRiskApprovals.length > 0) {
      // Show emergency recovery modal immediately
      setShowEmergencyModal(true);
    }
  }, [isCompromised, highRiskApprovals.length]);

  // =============================================================================
  // Render
  // =============================================================================

  if (!walletAddress) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Connect Your Wallet</h2>
        <p>Please connect your wallet to access security features.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Security Alerts Banner */}
      <SecurityAlertBanner
        alerts={alerts}
        onDismiss={(alertId) => acknowledgeAlert(alertId)}
        onAction={(alertId, action) => {
          if (action === 'REVOKE_APPROVALS') {
            setShowEmergencyModal(true);
          }
        }}
        maxVisible={3}
      />

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '16px' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'approvals', label: `Approvals (${approvals.length})` },
          { id: 'trace', label: 'Fund Tracing' },
          { id: 'freeze', label: 'Freeze Requests' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === tab.id ? '#3b82f6' : '#374151',
              color: 'white',
              fontWeight: 500,
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <SecurityOverview
          profile={profile}
          riskScore={riskScore}
          isCompromised={isCompromised}
          highRiskCount={highRiskApprovals.length}
          onEmergencyRevoke={() => setShowEmergencyModal(true)}
          onStartRecovery={() => setShowRecoveryWizard(true)}
          isLoading={profileLoading}
        />
      )}

      {activeTab === 'approvals' && (
        <ApprovalsList
          approvals={approvals}
          isLoading={approvalsLoading}
          onRevoke={async (approval) => {
            // Single approval revocation logic
            console.log('Revoking approval:', approval);
          }}
          onRevokeSelected={async (selected) => {
            // Batch revocation logic
            console.log('Revoking selected:', selected);
          }}
          showRiskBadge
          selectable
        />
      )}

      {activeTab === 'trace' && (
        <FundTraceViewer
          trace={currentTrace}
          report={report}
          onRequestFreeze={async (hop) => {
            // Create freeze request for exchange deposit
            if (hop.entityType === 'exchange' && currentTrace) {
              await createFreezeRequest({
                traceId: currentTrace.traceId,
                exchangeName: hop.entityLabel || 'Unknown',
                depositAddress: hop.address,
                depositSignature: hop.transactionSignature || '',
                amount: hop.amount,
                victimWallet: walletAddress,
              });
            }
          }}
          onGenerateReport={async () => {
            if (currentTrace) {
              await generateReport(currentTrace.traceId);
            }
          }}
        />
      )}

      {activeTab === 'freeze' && (
        <FreezeRequestsPanel
          exchanges={exchanges}
          onCreateRequest={createFreezeRequest}
          onGenerateEvidence={generateEvidence}
          onGenerateEmail={generateEmailTemplate}
        />
      )}

      {/* Emergency Recovery Modal */}
      <EmergencyRecoveryModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        walletAddress={walletAddress}
        highRiskApprovals={highRiskApprovals}
        onRevoke={async () => {
          return await emergencyRevoke();
        }}
        onSignTransaction={async (tx) => {
          // Sign with your wallet adapter
          // return await wallet.signTransaction(tx.serializedTransaction);
          return 'signature';
        }}
      />

      {/* Recovery Wizard */}
      {showRecoveryWizard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <RecoveryWizard
            compromisedWallet={walletAddress}
            assets={[
              // Get from your wallet's token list
              { tokenAddress: 'SOL', tokenSymbol: 'SOL', amount: 1.5, isSafe: true, usdValue: 150 },
              { tokenAddress: 'USDC', tokenSymbol: 'USDC', amount: 500, isSafe: true, usdValue: 500 },
            ]}
            onCreateNewWallet={async () => {
              // Create new wallet using your wallet adapter
              return 'NEW_WALLET_ADDRESS';
            }}
            onTransferAssets={async (from, to, assets) => {
              // Transfer assets using your wallet adapter
              console.log('Transferring', assets.length, 'assets from', from, 'to', to);
            }}
            onComplete={(newWallet) => {
              setShowRecoveryWizard(false);
              console.log('Recovery complete! New wallet:', newWallet);
            }}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Security Overview Component
// =============================================================================

interface SecurityOverviewProps {
  profile: any;
  riskScore: number;
  isCompromised: boolean;
  highRiskCount: number;
  onEmergencyRevoke: () => void;
  onStartRecovery: () => void;
  isLoading: boolean;
}

function SecurityOverview({
  profile,
  riskScore,
  isCompromised,
  highRiskCount,
  onEmergencyRevoke,
  onStartRecovery,
  isLoading,
}: SecurityOverviewProps) {
  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
        Analyzing wallet security...
      </div>
    );
  }

  const riskLevel = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
  const riskColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Compromise Warning */}
      {isCompromised && (
        <div
          style={{
            backgroundColor: '#7f1d1d',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>🚨</span>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', margin: 0 }}>
                Wallet Compromise Detected
              </h2>
              <p style={{ color: '#fca5a5', margin: '4px 0 0 0' }}>
                Immediate action required to protect your assets
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onEmergencyRevoke}
              style={{
                padding: '12px 24px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Emergency Revoke ({highRiskCount})
            </button>
            <button
              onClick={onStartRecovery}
              style={{
                padding: '12px 24px',
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Start Recovery Wizard
            </button>
          </div>
        </div>
      )}

      {/* Risk Score Card */}
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#9ca3af', marginBottom: '16px' }}>
          Security Score
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: `8px solid ${riskColors[riskLevel]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>
              {100 - riskScore}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>/ 100</span>
          </div>
          <div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: riskColors[riskLevel],
                textTransform: 'capitalize',
              }}
            >
              {riskLevel} Risk
            </div>
            <p style={{ color: '#9ca3af', marginTop: '8px' }}>
              {riskLevel === 'low' && 'Your wallet appears secure.'}
              {riskLevel === 'medium' && 'Some risk factors detected. Review recommended.'}
              {riskLevel === 'high' && 'Significant risks detected. Action required.'}
              {riskLevel === 'critical' && 'Critical threats detected. Immediate action required.'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Metrics Grid */}
      {profile && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            { label: 'High Risk Approvals', value: profile.highRiskApprovals, icon: '⚠️' },
            { label: 'Active Approvals', value: profile.activeApprovals, icon: '🔍' },
          ].map((metric) => (
            <div
              key={metric.label}
              style={{
                backgroundColor: '#1f2937',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{metric.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>
                {metric.value || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{metric.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Freeze Requests Panel Component
// =============================================================================

interface FreezeRequestsPanelProps {
  exchanges: any[];
  onCreateRequest: (params: any) => Promise<any>;
  onGenerateEvidence: (requestId: string, traceId: string, victimWallet: string) => Promise<any>;
  onGenerateEmail: (requestId: string) => Promise<any>;
}

function FreezeRequestsPanel({
  exchanges,
  onCreateRequest,
  onGenerateEvidence,
  onGenerateEmail,
}: FreezeRequestsPanelProps) {
  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>
        Exchange Freeze Requests
      </h3>
      <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
        Request exchanges to freeze stolen funds that have been deposited.
        We support {exchanges.length} major exchanges.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
        }}
      >
        {exchanges.slice(0, 8).map((exchange) => (
          <div
            key={exchange.name}
            style={{
              backgroundColor: '#111827',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏦</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>
              {exchange.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Placeholder for wallet hook (replace with your wallet adapter)
// =============================================================================

function useWalletAddress(): string | null {
  // Replace with your actual wallet adapter hook
  // Example with Solana Wallet Adapter:
  // const { publicKey } = useWallet();
  // return publicKey?.toBase58() || null;

  return 'EXAMPLE_WALLET_ADDRESS';
}

export default App;
