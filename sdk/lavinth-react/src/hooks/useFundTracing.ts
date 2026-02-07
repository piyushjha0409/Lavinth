/**
 * useFundTracing Hook
 * Manages stolen fund tracing and recovery
 */

import { useState, useCallback } from 'react';
import {
  FundTrace,
  RecoveryReport,
  LavinthError,
} from '@lavinth/sdk';
import { useLavinth } from '../context';

export interface UseFundTracingOptions {
  walletAddress?: string;
}

export interface UseFundTracingResult {
  traces: FundTrace[];
  currentTrace: FundTrace | null;
  report: RecoveryReport | null;
  isLoading: boolean;
  isTracing: boolean;
  error: LavinthError | null;
  startTrace: (
    sourceWallet: string,
    amount: number,
    tokenMint?: string
  ) => Promise<FundTrace | null>;
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
export function useFundTracing(
  options: UseFundTracingOptions = {}
): UseFundTracingResult {
  const { walletAddress } = options;
  const shield = useLavinth();

  const [traces, setTraces] = useState<FundTrace[]>([]);
  const [currentTrace, setCurrentTrace] = useState<FundTrace | null>(null);
  const [report, setReport] = useState<RecoveryReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [error, setError] = useState<LavinthError | null>(null);

  // Start trace
  const startTrace = useCallback(
    async (
      sourceWallet: string,
      amount: number,
      tokenMint?: string
    ): Promise<FundTrace | null> => {
      setIsTracing(true);
      setError(null);

      try {
        const trace = await shield.startFundTrace(sourceWallet, amount, tokenMint);
        setCurrentTrace(trace);
        setTraces((prev) => [...prev, trace]);
        return trace;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'TRACE_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsTracing(false);
      }
    },
    [shield]
  );

  // Get trace by ID
  const getTrace = useCallback(
    async (traceId: string): Promise<FundTrace | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const trace = await shield.getTrace(traceId);
        if (trace) {
          setCurrentTrace(trace);
        }
        return trace;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'TRACE_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );

  // Fetch all traces for wallet
  const fetchTraces = useCallback(
    async (address?: string): Promise<FundTrace[]> => {
      const targetAddress = address || walletAddress;

      if (!targetAddress) {
        setError(
          new LavinthError('Wallet address is required', 'INVALID_INPUT')
        );
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await shield.getTracesForWallet(targetAddress);
        setTraces(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'TRACE_ERROR');
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );

  // Generate recovery report
  const generateReport = useCallback(
    async (traceId: string): Promise<RecoveryReport | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await shield.generateRecoveryReport(traceId);
        setReport(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'REPORT_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );

  return {
    traces,
    currentTrace,
    report,
    isLoading,
    isTracing,
    error,
    startTrace,
    getTrace,
    fetchTraces,
    generateReport,
  };
}
