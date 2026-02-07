/**
 * EmergencyRecoveryModal Component
 * Modal for emergency wallet recovery actions
 */

import React, { useState, useCallback } from 'react';
import { TokenApproval, RevocationTransaction } from '@lavinth/sdk';

export interface EmergencyRecoveryModalProps {
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

type Step = 'warning' | 'review' | 'signing' | 'complete';

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
export function EmergencyRecoveryModal({
  isOpen,
  onClose,
  walletAddress,
  highRiskApprovals,
  onRevoke,
  onSignTransaction,
  className,
}: EmergencyRecoveryModalProps): React.ReactElement | null {
  const [step, setStep] = useState<Step>('warning');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<RevocationTransaction[]>([]);
  const [signedCount, setSignedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleProceed = useCallback(async () => {
    if (step === 'warning') {
      setStep('review');
      return;
    }

    if (step === 'review') {
      setIsProcessing(true);
      setError(null);

      try {
        const result = await onRevoke(highRiskApprovals);
        if (result) {
          setTransactions(result.transactions);
          setStep('signing');
        } else {
          setError('Failed to create revocation transactions');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to create revocation transactions');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (step === 'signing' && onSignTransaction) {
      setIsProcessing(true);
      setError(null);

      try {
        for (let i = signedCount; i < transactions.length; i++) {
          await onSignTransaction(transactions[i]);
          setSignedCount(i + 1);
        }
        setStep('complete');
      } catch (err: any) {
        setError(err.message || 'Transaction signing failed');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [step, highRiskApprovals, onRevoke, onSignTransaction, transactions, signedCount]);

  const handleClose = useCallback(() => {
    setStep('warning');
    setTransactions([]);
    setSignedCount(0);
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    },
    modal: {
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      color: 'white',
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#ef4444',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    body: {
      padding: '24px',
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #374151',
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '6px',
      fontWeight: 500,
      cursor: 'pointer',
      fontSize: '14px',
      border: 'none',
    },
    primaryButton: {
      backgroundColor: '#ef4444',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#374151',
      color: 'white',
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    errorBox: {
      backgroundColor: '#7f1d1d',
      border: '1px solid #991b1b',
      borderRadius: '6px',
      padding: '12px',
      marginTop: '16px',
    },
    approvalItem: {
      backgroundColor: '#374151',
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '8px',
    },
    progress: {
      height: '8px',
      backgroundColor: '#374151',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '16px',
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#10b981',
      transition: 'width 0.3s ease',
    },
  };

  const renderStep = () => {
    switch (step) {
      case 'warning':
        return (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Emergency Recovery Mode
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                This will revoke all high-risk token approvals to protect your wallet.
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#7f1d1d',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontWeight: 500, marginBottom: '8px' }}>
                {highRiskApprovals.length} dangerous approval
                {highRiskApprovals.length !== 1 ? 's' : ''} detected
              </p>
              <p style={{ fontSize: '14px', color: '#fca5a5' }}>
                These approvals allow third parties to spend your tokens without limit.
              </p>
            </div>
          </>
        );

      case 'review':
        return (
          <>
            <p style={{ marginBottom: '16px', color: '#9ca3af' }}>
              The following approvals will be revoked:
            </p>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {highRiskApprovals.map((approval, index) => (
                <div key={index} style={modalStyles.approvalItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{approval.tokenSymbol}</span>
                    <span
                      style={{
                        color: approval.riskLevel === 'critical' ? '#ef4444' : '#f59e0b',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {approval.riskLevel}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Spender: {approval.spenderAddress.slice(0, 8)}...
                    {approval.spenderAddress.slice(-6)}
                  </div>
                  {approval.isUnlimited && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      Unlimited approval
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        );

      case 'signing':
        const progress = transactions.length > 0
          ? (signedCount / transactions.length) * 100
          : 0;
        return (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {isProcessing ? '⏳' : '✍️'}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                {isProcessing ? 'Processing...' : 'Sign Transactions'}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                {signedCount} of {transactions.length} transactions signed
              </p>
            </div>
            <div style={modalStyles.progress}>
              <div
                style={{
                  ...modalStyles.progressBar,
                  width: `${progress}%`,
                }}
              />
            </div>
          </>
        );

      case 'complete':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Recovery Complete
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              All dangerous approvals have been revoked. Your wallet is now safer.
            </p>
            <div
              style={{
                backgroundColor: '#064e3b',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '24px',
              }}
            >
              <p style={{ fontWeight: 500 }}>
                {highRiskApprovals.length} approval
                {highRiskApprovals.length !== 1 ? 's' : ''} revoked
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={modalStyles.overlay} className={className}>
      <div style={modalStyles.modal} role="dialog" aria-modal="true">
        <div style={modalStyles.header}>
          <span style={modalStyles.title}>
            🚨 Emergency Recovery
          </span>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '24px',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={modalStyles.body}>
          {renderStep()}
          {error && (
            <div style={modalStyles.errorBox}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div style={modalStyles.footer}>
          {step !== 'complete' && (
            <button
              onClick={handleClose}
              style={{ ...modalStyles.button, ...modalStyles.secondaryButton }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={step === 'complete' ? handleClose : handleProceed}
            disabled={isProcessing}
            style={{
              ...modalStyles.button,
              ...modalStyles.primaryButton,
              ...(isProcessing ? modalStyles.disabledButton : {}),
            }}
          >
            {step === 'warning' && 'Continue'}
            {step === 'review' && 'Revoke All'}
            {step === 'signing' && (isProcessing ? 'Signing...' : 'Sign Transactions')}
            {step === 'complete' && 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
