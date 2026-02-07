/**
 * useCompromiseDetection Hook
 * Analyzes wallet for signs of compromise
 */

import { useState, useCallback, useEffect } from 'react';
import {
  CompromiseAnalysis,
  SecurityAlert,
  LavinthError,
} from '@lavinth/sdk';
import { useLavinth, useLavinthContext } from '../context';

export interface UseCompromiseDetectionOptions {
  walletAddress?: string;
  autoAnalyze?: boolean;
  monitorInterval?: number; // ms
}

export interface UseCompromiseDetectionResult {
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
export function useCompromiseDetection(
  options: UseCompromiseDetectionOptions = {}
): UseCompromiseDetectionResult {
  const { walletAddress, autoAnalyze = false, monitorInterval } = options;
  const shield = useLavinth();
  const { alerts: contextAlerts } = useLavinthContext();

  const [analysis, setAnalysis] = useState<CompromiseAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LavinthError | null>(null);

  // Analyze wallet
  const analyze = useCallback(
    async (address?: string): Promise<CompromiseAnalysis | null> => {
      const targetAddress = address || walletAddress;

      if (!targetAddress) {
        setError(
          new LavinthError('Wallet address is required', 'INVALID_INPUT')
        );
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await shield.analyzeCompromise(targetAddress);
        setAnalysis(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'ANALYSIS_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );

  // Acknowledge alert
  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      try {
        await shield.acknowledgeAlert(alertId);
        // Refresh analysis
        if (walletAddress) {
          await analyze(walletAddress);
        }
      } catch (err: any) {
        console.error('Failed to acknowledge alert:', err);
      }
    },
    [shield, walletAddress, analyze]
  );

  // Auto-analyze on mount
  useEffect(() => {
    if (autoAnalyze && walletAddress) {
      analyze(walletAddress);
    }
  }, [autoAnalyze, walletAddress, analyze]);

  // Monitor interval
  useEffect(() => {
    if (!monitorInterval || !walletAddress) return;

    const intervalId = setInterval(() => {
      analyze(walletAddress);
    }, monitorInterval);

    return () => clearInterval(intervalId);
  }, [monitorInterval, walletAddress, analyze]);

  // Combine alerts from analysis and context
  const allAlerts = analysis?.alerts || [];
  const walletAlerts = walletAddress
    ? contextAlerts.filter((a) => a.walletAddress === walletAddress)
    : [];
  const uniqueAlerts = [
    ...allAlerts,
    ...walletAlerts.filter(
      (ca) => !allAlerts.some((a) => a.alertId === ca.alertId)
    ),
  ];

  return {
    analysis,
    isCompromised: analysis?.isCompromised ?? false,
    riskScore: analysis?.riskScore ?? 0,
    alerts: uniqueAlerts,
    isLoading,
    error,
    analyze,
    acknowledgeAlert,
  };
}
