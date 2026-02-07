/**
 * SecurityAlertBanner Component
 * Displays security alerts with severity-based styling
 */

import React from 'react';
import { SecurityAlert } from '@lavinth/sdk';

export interface SecurityAlertBannerProps {
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

const defaultStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    width: '100%',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  critical: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
  },
  high: {
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
  },
  medium: {
    backgroundColor: '#fefce8',
    border: '1px solid #fef08a',
    color: '#854d0e',
  },
  low: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
  },
};

const severityIcons: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '⚡',
  low: 'ℹ️',
};

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
export function SecurityAlertBanner({
  alerts,
  onDismiss,
  onAction,
  maxVisible = 5,
  className,
  styles = {},
}: SecurityAlertBannerProps): React.ReactElement | null {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  const mergedStyles = {
    ...defaultStyles,
    ...styles,
  };

  return (
    <div
      className={className}
      style={mergedStyles.container}
      role="alert"
      aria-live="polite"
    >
      {visibleAlerts.map((alert) => {
        const severityStyle =
          mergedStyles[alert.severity as keyof typeof mergedStyles] ||
          mergedStyles.medium;

        return (
          <div
            key={alert.alertId}
            style={{
              ...mergedStyles.alert,
              ...severityStyle,
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <span role="img" aria-label={alert.severity}>
                {severityIcons[alert.severity] || '⚡'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {alert.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  {alert.description}
                </div>
                {alert.suggestedAction && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => onAction?.(alert.alertId, alert.suggestedAction!)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {alert.suggestedAction}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.alertId)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '18px',
                  opacity: 0.6,
                }}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {hiddenCount > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '8px',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          +{hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
