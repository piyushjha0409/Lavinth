/**
 * FundTraceViewer Component
 * Visualizes stolen fund tracing results
 */

import React from 'react';
import { FundTrace, TraceHop, RecoveryReport } from '@lavinth/sdk';

export interface FundTraceViewerProps {
  trace: FundTrace | null;
  report?: RecoveryReport | null;
  isLoading?: boolean;
  onRequestFreeze?: (hop: TraceHop) => void;
  onGenerateReport?: () => void;
  className?: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  in_progress: { bg: '#1e3a5f', text: '#60a5fa' },
  completed: { bg: '#14532d', text: '#86efac' },
  stalled: { bg: '#713f12', text: '#fcd34d' },
  recovered: { bg: '#064e3b', text: '#6ee7b7' },
};

const hopTypeIcons: Record<string, string> = {
  wallet: '👛',
  exchange: '🏦',
  dex: '🔄',
  bridge: '🌉',
  mixer: '🌀',
  contract: '📄',
};

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
export function FundTraceViewer({
  trace,
  report,
  isLoading = false,
  onRequestFreeze,
  onGenerateReport,
  className,
}: FundTraceViewerProps): React.ReactElement {
  const containerStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    overflow: 'hidden',
    color: 'white',
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px',
    borderBottom: '1px solid #374151',
  };

  if (isLoading) {
    return (
      <div style={containerStyle} className={className}>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>
            🔍
          </div>
          <p style={{ color: '#9ca3af' }}>Tracing funds through the blockchain...</p>
        </div>
      </div>
    );
  }

  if (!trace) {
    return (
      <div style={containerStyle} className={className}>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔎</div>
          <p style={{ color: '#9ca3af' }}>No trace data available</p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            Start a new trace to track stolen funds
          </p>
        </div>
      </div>
    );
  }

  const status = statusColors[trace.status] || statusColors.in_progress;
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatAmount = (amount: number) => amount.toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div style={containerStyle} className={className}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Fund Trace
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              Trace ID: {trace.traceId.slice(0, 12)}...
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                backgroundColor: status.bg,
                color: status.text,
              }}
            >
              {trace.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#111827',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
              Total Stolen
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444' }}>
              {formatAmount(trace.totalAmount)} {trace.tokenSymbol || 'SOL'}
            </div>
          </div>
          <div>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
              Recovered
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
              {formatAmount(trace.recoveredAmount || 0)} {trace.tokenSymbol || 'SOL'}
            </div>
          </div>
          <div>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
              Hops Traced
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>
              {trace.hops.length}
            </div>
          </div>
        </div>
      </div>

      {/* Trace Flow */}
      <div style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#9ca3af' }}>
          FUND FLOW
        </h4>

        <div style={{ position: 'relative' }}>
          {/* Connecting line */}
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '20px',
              bottom: '20px',
              width: '2px',
              backgroundColor: '#374151',
            }}
          />

          {trace.hops.map((hop, index) => {
            const isExchange = hop.entityType === 'exchange';
            const icon = hopTypeIcons[hop.entityType] || '📍';

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: index < trace.hops.length - 1 ? '24px' : 0,
                  position: 'relative',
                }}
              >
                {/* Node indicator */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isExchange ? '#064e3b' : '#374151',
                    border: isExchange ? '2px solid #10b981' : '2px solid #4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    zIndex: 1,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>

                {/* Hop details */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    padding: '16px',
                    border: isExchange ? '1px solid #10b981' : '1px solid #374151',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 500 }}>
                          {hop.entityLabel || formatAddress(hop.address)}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            backgroundColor: '#374151',
                            color: '#9ca3af',
                          }}
                        >
                          {hop.entityType}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                        {formatAddress(hop.address)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>
                        {formatAmount(hop.amount)} {trace.tokenSymbol || 'SOL'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {new Date(hop.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {hop.transactionSignature && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                      TX: {hop.transactionSignature.slice(0, 20)}...
                    </div>
                  )}

                  {isExchange && onRequestFreeze && (
                    <button
                      onClick={() => onRequestFreeze(hop)}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      Request Freeze
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recovery Report Section */}
      {report && (
        <div style={{ padding: '20px', borderTop: '1px solid #374151' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#9ca3af' }}>
            RECOVERY ANALYSIS
          </h4>
          <div
            style={{
              backgroundColor: '#111827',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#9ca3af' }}>Recovery Probability</span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: report.recoveryProbability >= 50 ? '#10b981' : report.recoveryProbability >= 25 ? '#f59e0b' : '#ef4444',
                }}
              >
                {report.recoveryProbability}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: '8px',
                backgroundColor: '#374151',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${report.recoveryProbability}%`,
                  backgroundColor: report.recoveryProbability >= 50 ? '#10b981' : report.recoveryProbability >= 25 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>

            {report.recommendations && report.recommendations.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                  Recommendations:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#9ca3af', fontSize: '13px' }}>
                  {report.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      {rec.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {onGenerateReport && !report && (
        <div style={{ padding: '20px', borderTop: '1px solid #374151' }}>
          <button
            onClick={onGenerateReport}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Generate Recovery Report
          </button>
        </div>
      )}
    </div>
  );
}
