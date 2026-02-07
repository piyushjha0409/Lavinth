/**
 * useSimulation Hook
 * Transaction simulation and risk analysis
 */

import { useState, useCallback, useEffect } from 'react';
import {
  SimulationResult,
  QuickRiskCheck,
  VerifiedProgram,
  SimulationAlert,
  LavinthError,
} from '@lavinth/sdk';
import { useLavinth } from '../context';

export interface UseSimulationOptions {
  walletAddress?: string;
  autoFetchHistory?: boolean;
  autoFetchAlerts?: boolean;
  historyLimit?: number;
  alertsLimit?: number;
}

export interface UseSimulationResult {
  // State
  currentSimulation: SimulationResult | null;
  history: SimulationResult[];
  alerts: SimulationAlert[];
  verifiedPrograms: VerifiedProgram[];
  isSimulating: boolean;
  isLoading: boolean;
  error: LavinthError | null;

  // Actions
  simulate: (
    serializedTransaction: string,
    storeResult?: boolean
  ) => Promise<SimulationResult | null>;
  quickCheck: (serializedTransaction: string) => Promise<QuickRiskCheck | null>;
  getSimulation: (simulationId: string) => Promise<SimulationResult | null>;
  fetchHistory: (address?: string) => Promise<SimulationResult[]>;
  fetchAlerts: (address?: string, acknowledged?: boolean) => Promise<SimulationAlert[]>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  checkProgram: (programId: string) => Promise<VerifiedProgram | null>;
  fetchVerifiedPrograms: () => Promise<VerifiedProgram[]>;
  clearError: () => void;
}

/**
 * Hook for transaction simulation and risk analysis
 *
 * @example
 * ```tsx
 * const {
 *   simulate,
 *   quickCheck,
 *   currentSimulation,
 *   isSimulating,
 * } = useSimulation({ walletAddress: '...' });
 *
 * // Quick risk check before full simulation
 * const quickResult = await quickCheck(serializedTx);
 * if (quickResult?.shouldSimulate) {
 *   const result = await simulate(serializedTx);
 *   if (result?.riskLevel === 'critical') {
 *     // Warn user about critical risk
 *   }
 * }
 * ```
 */
export function useSimulation(
  options: UseSimulationOptions = {}
): UseSimulationResult {
  const {
    walletAddress,
    autoFetchHistory = false,
    autoFetchAlerts = false,
    historyLimit = 50,
    alertsLimit = 50,
  } = options;

  const lavinth = useLavinth();

  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [alerts, setAlerts] = useState<SimulationAlert[]>([]);
  const [verifiedPrograms, setVerifiedPrograms] = useState<VerifiedProgram[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LavinthError | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Simulate a transaction
  const simulate = useCallback(
    async (
      serializedTransaction: string,
      storeResult: boolean = true
    ): Promise<SimulationResult | null> => {
      if (!walletAddress) {
        setError(
          new LavinthError('Wallet address is required', 'INVALID_INPUT')
        );
        return null;
      }

      setIsSimulating(true);
      setError(null);

      try {
        const result = await lavinth.simulateTransaction(
          serializedTransaction,
          walletAddress,
          storeResult
        );
        setCurrentSimulation(result);

        // Add to history if stored
        if (storeResult) {
          setHistory((prev) => [result, ...prev.slice(0, historyLimit - 1)]);
        }

        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SIMULATION_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsSimulating(false);
      }
    },
    [lavinth, walletAddress, historyLimit]
  );

  // Quick risk check
  const quickCheck = useCallback(
    async (serializedTransaction: string): Promise<QuickRiskCheck | null> => {
      setError(null);

      try {
        return await lavinth.quickRiskCheck(serializedTransaction);
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SIMULATION_ERROR');
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );

  // Get a specific simulation
  const getSimulation = useCallback(
    async (simulationId: string): Promise<SimulationResult | null> => {
      setError(null);

      try {
        const result = await lavinth.getSimulation(simulationId);
        if (result) {
          setCurrentSimulation(result);
        }
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SIMULATION_ERROR');
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );

  // Fetch simulation history
  const fetchHistory = useCallback(
    async (address?: string): Promise<SimulationResult[]> => {
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
        const result = await lavinth.getSimulationHistory(targetAddress, historyLimit);
        setHistory(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SIMULATION_ERROR');
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [lavinth, walletAddress, historyLimit]
  );

  // Fetch simulation alerts
  const fetchAlerts = useCallback(
    async (
      address?: string,
      acknowledged?: boolean
    ): Promise<SimulationAlert[]> => {
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
        const result = await lavinth.getSimulationAlerts(
          targetAddress,
          alertsLimit,
          acknowledged
        );
        setAlerts(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SIMULATION_ERROR');
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [lavinth, walletAddress, alertsLimit]
  );

  // Acknowledge an alert
  const acknowledgeAlert = useCallback(
    async (alertId: string): Promise<void> => {
      try {
        await lavinth.acknowledgeSimulationAlert(alertId);
        // Update local state
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.alertId === alertId
              ? { ...alert, isAcknowledged: true, acknowledgedAt: new Date().toISOString() }
              : alert
          )
        );
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SIMULATION_ERROR');
        setError(wsError);
      }
    },
    [lavinth]
  );

  // Check if a program is verified
  const checkProgram = useCallback(
    async (programId: string): Promise<VerifiedProgram | null> => {
      try {
        return await lavinth.checkProgram(programId);
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'PROGRAMS_ERROR');
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );

  // Fetch all verified programs
  const fetchVerifiedPrograms = useCallback(async (): Promise<VerifiedProgram[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await lavinth.getVerifiedPrograms();
      setVerifiedPrograms(result);
      return result;
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'PROGRAMS_ERROR');
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [lavinth]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetchHistory && walletAddress) {
      fetchHistory(walletAddress);
    }
  }, [autoFetchHistory, walletAddress, fetchHistory]);

  useEffect(() => {
    if (autoFetchAlerts && walletAddress) {
      fetchAlerts(walletAddress);
    }
  }, [autoFetchAlerts, walletAddress, fetchAlerts]);

  return {
    currentSimulation,
    history,
    alerts,
    verifiedPrograms,
    isSimulating,
    isLoading,
    error,
    simulate,
    quickCheck,
    getSimulation,
    fetchHistory,
    fetchAlerts,
    acknowledgeAlert,
    checkProgram,
    fetchVerifiedPrograms,
    clearError,
  };
}
