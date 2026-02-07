/**
 * useSecurityProfile Hook
 * Fetches and manages wallet security profile
 */

import { useState, useCallback, useEffect } from 'react';
import { SecurityProfile, LavinthError } from '@lavinth/sdk';
import { useLavinth } from '../context';

export interface UseSecurityProfileOptions {
  walletAddress?: string;
  autoScan?: boolean;
  refreshInterval?: number; // ms
}

export interface UseSecurityProfileResult {
  profile: SecurityProfile | null;
  isLoading: boolean;
  error: LavinthError | null;
  scan: (address?: string) => Promise<SecurityProfile | null>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage wallet security profile
 *
 * @example
 * ```tsx
 * const { profile, isLoading, scan } = useSecurityProfile({
 *   walletAddress: '...',
 *   autoScan: true,
 * });
 * ```
 */
export function useSecurityProfile(
  options: UseSecurityProfileOptions = {}
): UseSecurityProfileResult {
  const { walletAddress, autoScan = false, refreshInterval } = options;
  const shield = useLavinth();

  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LavinthError | null>(null);

  // Scan wallet
  const scan = useCallback(
    async (address?: string): Promise<SecurityProfile | null> => {
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
        const result = await shield.scanWallet(targetAddress);
        setProfile(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'SCAN_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );

  // Refresh profile
  const refresh = useCallback(async () => {
    if (walletAddress) {
      await scan(walletAddress);
    }
  }, [scan, walletAddress]);

  // Auto-scan on mount
  useEffect(() => {
    if (autoScan && walletAddress) {
      scan(walletAddress);
    }
  }, [autoScan, walletAddress, scan]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval || !walletAddress) return;

    const intervalId = setInterval(() => {
      scan(walletAddress);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, walletAddress, scan]);

  return {
    profile,
    isLoading,
    error,
    scan,
    refresh,
  };
}
