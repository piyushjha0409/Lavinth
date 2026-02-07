/**
 * RecoveryWizard Component
 * Guides users through wallet migration after compromise
 */

import React, { useState, useCallback } from 'react';

export interface RecoveryWizardProps {
  compromisedWallet: string;
  onCreateNewWallet?: () => Promise<string>;
  onTransferAssets?: (fromWallet: string, toWallet: string, assets: Asset[]) => Promise<void>;
  onComplete?: (newWallet: string) => void;
  assets?: Asset[];
  className?: string;
}

export interface Asset {
  tokenAddress: string;
  tokenSymbol: string;
  amount: number;
  isSafe: boolean;
  usdValue?: number;
}

type Step = 'intro' | 'new-wallet' | 'review-assets' | 'transfer' | 'security' | 'complete';

const steps: { id: Step; title: string }[] = [
  { id: 'intro', title: 'Overview' },
  { id: 'new-wallet', title: 'New Wallet' },
  { id: 'review-assets', title: 'Review Assets' },
  { id: 'transfer', title: 'Transfer' },
  { id: 'security', title: 'Security' },
  { id: 'complete', title: 'Complete' },
];

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
export function RecoveryWizard({
  compromisedWallet,
  onCreateNewWallet,
  onTransferAssets,
  onComplete,
  assets = [],
  className,
}: RecoveryWizardProps): React.ReactElement {
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [newWalletAddress, setNewWalletAddress] = useState<string>('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(
    new Set(assets.filter((a) => a.isSafe).map((a) => a.tokenAddress))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityChecklist, setSecurityChecklist] = useState({
    revokedApprovals: false,
    changedPasswords: false,
    scannedDevice: false,
    enabledHardwareWallet: false,
  });

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const safeAssets = assets.filter((a) => a.isSafe);
  const unsafeAssets = assets.filter((a) => !a.isSafe);

  const handleNext = useCallback(async () => {
    setError(null);

    switch (currentStep) {
      case 'intro':
        setCurrentStep('new-wallet');
        break;

      case 'new-wallet':
        if (!newWalletAddress && onCreateNewWallet) {
          setIsProcessing(true);
          try {
            const addr = await onCreateNewWallet();
            setNewWalletAddress(addr);
          } catch (err: any) {
            setError(err.message || 'Failed to create new wallet');
            return;
          } finally {
            setIsProcessing(false);
          }
        }
        setCurrentStep('review-assets');
        break;

      case 'review-assets':
        setCurrentStep('transfer');
        break;

      case 'transfer':
        if (onTransferAssets && selectedAssets.size > 0) {
          setIsProcessing(true);
          try {
            const assetsToTransfer = assets.filter((a) =>
              selectedAssets.has(a.tokenAddress)
            );
            await onTransferAssets(compromisedWallet, newWalletAddress, assetsToTransfer);
          } catch (err: any) {
            setError(err.message || 'Failed to transfer assets');
            return;
          } finally {
            setIsProcessing(false);
          }
        }
        setCurrentStep('security');
        break;

      case 'security':
        setCurrentStep('complete');
        break;

      case 'complete':
        onComplete?.(newWalletAddress);
        break;
    }
  }, [
    currentStep,
    newWalletAddress,
    onCreateNewWallet,
    onTransferAssets,
    selectedAssets,
    assets,
    compromisedWallet,
    onComplete,
  ]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  }, [currentStepIndex]);

  const toggleAsset = (tokenAddress: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(tokenAddress)) {
        next.delete(tokenAddress);
      } else {
        next.add(tokenAddress);
      }
      return next;
    });
  };

  const toggleSecurityItem = (key: keyof typeof securityChecklist) => {
    setSecurityChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      overflow: 'hidden',
      color: 'white',
      maxWidth: '600px',
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid #374151',
    },
    progress: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '20px',
    },
    progressStep: {
      flex: 1,
      textAlign: 'center',
      position: 'relative',
    },
    progressDot: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      margin: '0 auto 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 600,
    },
    progressLabel: {
      fontSize: '11px',
      color: '#9ca3af',
    },
    body: {
      padding: '32px 24px',
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #374151',
      display: 'flex',
      justifyContent: 'space-between',
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: 500,
      cursor: 'pointer',
      fontSize: '14px',
      border: 'none',
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#374151',
      color: 'white',
    },
    assetItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      backgroundColor: '#111827',
      borderRadius: '8px',
      marginBottom: '8px',
    },
    checklistItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      backgroundColor: '#111827',
      borderRadius: '8px',
      marginBottom: '8px',
      cursor: 'pointer',
    },
    errorBox: {
      backgroundColor: '#7f1d1d',
      border: '1px solid #991b1b',
      borderRadius: '8px',
      padding: '12px',
      marginTop: '16px',
    },
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
              Wallet Recovery Wizard
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px', lineHeight: 1.6 }}>
              This wizard will guide you through creating a new secure wallet and
              safely migrating your assets from the compromised wallet.
            </p>
            <div
              style={{
                backgroundColor: '#7f1d1d',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                ⚠️ Compromised Wallet
              </div>
              <code style={{ fontSize: '14px', color: '#fca5a5' }}>
                {formatAddress(compromisedWallet)}
              </code>
            </div>
          </div>
        );

      case 'new-wallet':
        return (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              Create New Wallet
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              Create a new wallet to safely receive your assets. We recommend using a
              hardware wallet for maximum security.
            </p>

            {newWalletAddress ? (
              <div
                style={{
                  backgroundColor: '#064e3b',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <span style={{ fontWeight: 500 }}>New Wallet Created</span>
                </div>
                <code style={{ fontSize: '14px', color: '#86efac' }}>
                  {newWalletAddress}
                </code>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Enter new wallet address or create one"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  style={{
                    padding: '16px',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
                {onCreateNewWallet && (
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const addr = await onCreateNewWallet();
                        setNewWalletAddress(addr);
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    style={{
                      ...styles.button,
                      ...styles.secondaryButton,
                      opacity: isProcessing ? 0.5 : 1,
                    }}
                  >
                    {isProcessing ? 'Creating...' : '+ Create New Wallet'}
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'review-assets':
        return (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              Review Assets
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              Select the assets you want to transfer to your new wallet. Potentially
              malicious tokens are marked for your safety.
            </p>

            {safeAssets.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#10b981', marginBottom: '12px' }}>
                  ✅ SAFE ASSETS ({safeAssets.length})
                </div>
                {safeAssets.map((asset) => (
                  <div
                    key={asset.tokenAddress}
                    style={styles.assetItem}
                    onClick={() => toggleAsset(asset.tokenAddress)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssets.has(asset.tokenAddress)}
                      onChange={() => toggleAsset(asset.tokenAddress)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{asset.tokenSymbol}</div>
                      <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                        {asset.amount.toLocaleString()}
                        {asset.usdValue && ` ($${asset.usdValue.toFixed(2)})`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {unsafeAssets.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#ef4444', marginBottom: '12px' }}>
                  ⚠️ POTENTIALLY MALICIOUS ({unsafeAssets.length})
                </div>
                {unsafeAssets.map((asset) => (
                  <div
                    key={asset.tokenAddress}
                    style={{
                      ...styles.assetItem,
                      opacity: 0.6,
                      border: '1px solid #7f1d1d',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🚫</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{asset.tokenSymbol}</div>
                      <div style={{ fontSize: '13px', color: '#fca5a5' }}>
                        Not recommended for transfer
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'transfer':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>
              {isProcessing ? '⏳' : '📦'}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              {isProcessing ? 'Transferring Assets...' : 'Ready to Transfer'}
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} will be
              transferred to your new wallet.
            </p>
            <div
              style={{
                backgroundColor: '#111827',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>From</div>
                  <code style={{ fontSize: '13px' }}>{formatAddress(compromisedWallet)}</code>
                </div>
                <span style={{ fontSize: '24px' }}>→</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>To</div>
                  <code style={{ fontSize: '13px', color: '#10b981' }}>
                    {formatAddress(newWalletAddress)}
                  </code>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
              Security Checklist
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              Complete these security steps to protect your new wallet.
            </p>

            {[
              { key: 'revokedApprovals', label: 'Revoked all token approvals on compromised wallet' },
              { key: 'changedPasswords', label: 'Changed passwords on related accounts' },
              { key: 'scannedDevice', label: 'Scanned device for malware' },
              { key: 'enabledHardwareWallet', label: 'Consider using a hardware wallet' },
            ].map(({ key, label }) => (
              <div
                key={key}
                style={styles.checklistItem}
                onClick={() => toggleSecurityItem(key as keyof typeof securityChecklist)}
              >
                <input
                  type="checkbox"
                  checked={securityChecklist[key as keyof typeof securityChecklist]}
                  onChange={() => toggleSecurityItem(key as keyof typeof securityChecklist)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        );

      case 'complete':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
              Recovery Complete!
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
              Your assets have been safely transferred to your new wallet.
            </p>
            <div
              style={{
                backgroundColor: '#064e3b',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '14px', color: '#86efac', marginBottom: '8px' }}>
                New Wallet Address
              </div>
              <code style={{ fontSize: '16px', fontWeight: 500 }}>
                {newWalletAddress}
              </code>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={styles.container} className={className}>
      {/* Header with progress */}
      <div style={styles.header}>
        <div style={styles.progress}>
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            return (
              <div key={step.id} style={styles.progressStep}>
                <div
                  style={{
                    ...styles.progressDot,
                    backgroundColor: isComplete
                      ? '#10b981'
                      : isActive
                      ? '#3b82f6'
                      : '#374151',
                    color: isComplete || isActive ? 'white' : '#6b7280',
                  }}
                >
                  {isComplete ? '✓' : index + 1}
                </div>
                <div
                  style={{
                    ...styles.progressLabel,
                    color: isActive ? 'white' : '#6b7280',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {renderStep()}
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {currentStepIndex > 0 && currentStep !== 'complete' ? (
          <button
            onClick={handleBack}
            style={{ ...styles.button, ...styles.secondaryButton }}
            disabled={isProcessing}
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleNext}
          style={{
            ...styles.button,
            ...styles.primaryButton,
            opacity: isProcessing ? 0.5 : 1,
          }}
          disabled={isProcessing || (currentStep === 'new-wallet' && !newWalletAddress)}
        >
          {currentStep === 'complete'
            ? 'Done'
            : currentStep === 'transfer'
            ? isProcessing
              ? 'Transferring...'
              : 'Transfer Assets'
            : 'Continue'}
        </button>
      </div>
    </div>
  );
}
