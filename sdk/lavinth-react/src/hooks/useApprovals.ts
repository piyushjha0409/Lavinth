/**
 * useApprovals Hook
 * Manages token approvals and revocation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  TokenApproval,
  RevocationPlan,
  RevocationTransaction,
  LavinthError,
} from '@lavinth/sdk';
import { useLavinth } from '../context';

export interface UseApprovalsOptions {
  walletAddress?: string;
  autoFetch?: boolean;
}

export interface UseApprovalsResult {
  approvals: TokenApproval[];
  highRiskApprovals: TokenApproval[];
  isLoading: boolean;
  error: LavinthError | null;
  fetchApprovals: (address?: string) => Promise<TokenApproval[]>;
  createRevocationPlan: () => Promise<RevocationPlan | null>;
  buildRevocationTransactions: () => Promise<{
    sessionId: string;
    transactions: RevocationTransaction[];
  } | null>;
  emergencyRevoke: () => Promise<{
    sessionId: string;
    transactions: RevocationTransaction[];
  } | null>;
}

/**
 * Hook to manage token approvals
 *
 * @example
 * ```tsx
 * const {
 *   approvals,
 *   highRiskApprovals,
 *   createRevocationPlan,
 *   emergencyRevoke,
 * } = useApprovals({ walletAddress: '...' });
 *
 * // Emergency revoke all high-risk approvals
 * const { sessionId, transactions } = await emergencyRevoke();
 * // Sign and submit transactions...
 * ```
 */
export function useApprovals(
  options: UseApprovalsOptions = {}
): UseApprovalsResult {
  const { walletAddress, autoFetch = false } = options;
  const shield = useLavinth();

  const [approvals, setApprovals] = useState<TokenApproval[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LavinthError | null>(null);

  // Fetch approvals
  const fetchApprovals = useCallback(
    async (address?: string): Promise<TokenApproval[]> => {
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
        const result = await shield.getApprovals(targetAddress);
        setApprovals(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'APPROVALS_ERROR');
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );

  // Create revocation plan
  const createRevocationPlan = useCallback(async (): Promise<RevocationPlan | null> => {
    if (!walletAddress) {
      setError(
        new LavinthError('Wallet address is required', 'INVALID_INPUT')
      );
      return null;
    }

    try {
      return await shield.createRevocationPlan(walletAddress);
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'REVOCATION_ERROR');
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);

  // Build revocation transactions
  const buildRevocationTransactions = useCallback(async () => {
    if (!walletAddress) {
      setError(
        new LavinthError('Wallet address is required', 'INVALID_INPUT')
      );
      return null;
    }

    try {
      return await shield.buildRevocationTransactions(walletAddress);
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'REVOCATION_ERROR');
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);

  // Emergency revoke
  const emergencyRevoke = useCallback(async () => {
    if (!walletAddress) {
      setError(
        new LavinthError('Wallet address is required', 'INVALID_INPUT')
      );
      return null;
    }

    try {
      return await shield.emergencyRevoke(walletAddress);
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'REVOCATION_ERROR');
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && walletAddress) {
      fetchApprovals(walletAddress);
    }
  }, [autoFetch, walletAddress, fetchApprovals]);

  // Filter high-risk approvals
  const highRiskApprovals = approvals.filter(
    (a) => a.riskLevel === 'critical' || a.riskLevel === 'high'
  );

  return {
    approvals,
    highRiskApprovals,
    isLoading,
    error,
    fetchApprovals,
    createRevocationPlan,
    buildRevocationTransactions,
    emergencyRevoke,
  };
}
