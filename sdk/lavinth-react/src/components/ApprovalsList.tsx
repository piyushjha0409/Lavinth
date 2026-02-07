/**
 * ApprovalsList Component
 * Displays and manages token approvals
 */

import React, { useState } from 'react';
import { TokenApproval } from '@lavinth/sdk';

export interface ApprovalsListProps {
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

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#7f1d1d', text: '#fecaca', border: '#991b1b' },
  high: { bg: '#7c2d12', text: '#fed7aa', border: '#9a3412' },
  medium: { bg: '#713f12', text: '#fef08a', border: '#854d0e' },
  low: { bg: '#14532d', text: '#bbf7d0', border: '#166534' },
};

const defaultStyles = {
  container: {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #374151',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    padding: '16px 20px',
    borderBottom: '1px solid #374151',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
};

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
export function ApprovalsList({
  approvals,
  isLoading = false,
  onRevoke,
  onRevokeSelected,
  showRiskBadge = true,
  selectable = false,
  className,
  styles = {},
}: ApprovalsListProps): React.ReactElement {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingBatch, setIsRevokingBatch] = useState(false);

  const mergedStyles = {
    ...defaultStyles,
    ...styles,
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvals.map((a) => a.tokenAddress + a.spenderAddress)));
    }
  };

  const handleRevoke = async (approval: TokenApproval) => {
    if (!onRevoke) return;
    const id = approval.tokenAddress + approval.spenderAddress;
    setRevokingId(id);
    try {
      await onRevoke(approval);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeSelected = async () => {
    if (!onRevokeSelected) return;
    const selected = approvals.filter(
      (a) => selectedIds.has(a.tokenAddress + a.spenderAddress)
    );
    setIsRevokingBatch(true);
    try {
      await onRevokeSelected(selected);
      setSelectedIds(new Set());
    } finally {
      setIsRevokingBatch(false);
    }
  };

  const formatAmount = (approval: TokenApproval): string => {
    if (approval.isUnlimited) return 'Unlimited';
    if (approval.amount === undefined) return 'Unknown';
    return approval.amount.toLocaleString();
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div style={mergedStyles.container} className={className}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
          Loading approvals...
        </div>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div style={mergedStyles.container} className={className}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <p>No token approvals found</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Your wallet has no active token approvals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={mergedStyles.container} className={className}>
      <div style={mergedStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectable && (
            <input
              type="checkbox"
              checked={selectedIds.size === approvals.length}
              onChange={selectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          )}
          <span style={{ color: 'white', fontWeight: 600 }}>
            Token Approvals ({approvals.length})
          </span>
        </div>
        {selectable && selectedIds.size > 0 && onRevokeSelected && (
          <button
            onClick={handleRevokeSelected}
            disabled={isRevokingBatch}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isRevokingBatch ? 'not-allowed' : 'pointer',
              opacity: isRevokingBatch ? 0.5 : 1,
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {isRevokingBatch
              ? 'Revoking...'
              : `Revoke Selected (${selectedIds.size})`}
          </button>
        )}
      </div>

      {approvals.map((approval) => {
        const id = approval.tokenAddress + approval.spenderAddress;
        const isSelected = selectedIds.has(id);
        const isRevoking = revokingId === id;
        const riskStyle = riskColors[approval.riskLevel] || riskColors.medium;

        return (
          <div
            key={id}
            style={{
              ...mergedStyles.item,
              backgroundColor: isSelected ? '#374151' : 'transparent',
            }}
          >
            {selectable && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(id)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            )}

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'white', fontWeight: 500 }}>
                  {approval.tokenSymbol || 'Unknown Token'}
                </span>
                {showRiskBadge && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: riskStyle.bg,
                      color: riskStyle.text,
                      border: `1px solid ${riskStyle.border}`,
                    }}
                  >
                    {approval.riskLevel}
                  </span>
                )}
                {approval.isUnlimited && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#7f1d1d',
                      color: '#fecaca',
                    }}
                  >
                    UNLIMITED
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#9ca3af',
                }}
              >
                <span>Amount: {formatAmount(approval)}</span>
                <span>Spender: {formatAddress(approval.spenderAddress)}</span>
                {approval.spenderLabel && (
                  <span
                    style={{
                      color: approval.isVerifiedSpender ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {approval.spenderLabel}
                  </span>
                )}
              </div>
            </div>

            {onRevoke && (
              <button
                onClick={() => handleRevoke(approval)}
                disabled={isRevoking}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#374151',
                  color: '#ef4444',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  cursor: isRevoking ? 'not-allowed' : 'pointer',
                  opacity: isRevoking ? 0.5 : 1,
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {isRevoking ? 'Revoking...' : 'Revoke'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
