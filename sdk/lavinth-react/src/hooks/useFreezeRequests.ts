/**
 * useFreezeRequests Hook
 * Manages exchange freeze requests
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FreezeRequest,
  ExchangeContact,
  EvidencePackage,
  LavinthError,
} from '@lavinth/sdk';
import { useLavinth } from '../context';

export interface UseFreezeRequestsOptions {
  autoFetchExchanges?: boolean;
  autoFetchPending?: boolean;
}

export interface UseFreezeRequestsResult {
  exchanges: ExchangeContact[];
  pendingRequests: FreezeRequest[];
  currentRequest: FreezeRequest | null;
  evidencePackage: EvidencePackage | null;
  emailTemplate: { subject: string; body: string; recipientEmail?: string } | null;
  isLoading: boolean;
  error: LavinthError | null;
  fetchExchanges: () => Promise<ExchangeContact[]>;
  fetchPendingRequests: () => Promise<FreezeRequest[]>;
  createFreezeRequest: (params: {
    traceId: string;
    exchangeName: string;
    depositAddress: string;
    depositSignature: string;
    amount: number;
    victimWallet: string;
    tokenMint?: string;
    tokenSymbol?: string;
  }) => Promise<FreezeRequest | null>;
  updateStatus: (
    requestId: string,
    status: string,
    exchangeTicketId?: string,
    exchangeResponse?: string
  ) => Promise<void>;
  generateEvidence: (
    requestId: string,
    traceId: string,
    victimWallet: string,
    victimStatement?: string
  ) => Promise<EvidencePackage | null>;
  generateEmailTemplate: (
    requestId: string
  ) => Promise<{ subject: string; body: string; recipientEmail?: string } | null>;
  getStatistics: () => Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    successRate: number;
    avgResponseTime: number;
  } | null>;
}

/**
 * Hook to manage exchange freeze requests
 *
 * @example
 * ```tsx
 * const {
 *   exchanges,
 *   createFreezeRequest,
 *   generateEvidence,
 *   generateEmailTemplate,
 * } = useFreezeRequests();
 *
 * // Create freeze request
 * const request = await createFreezeRequest({
 *   traceId: '...',
 *   exchangeName: 'Binance',
 *   depositAddress: '...',
 *   depositSignature: '...',
 *   amount: 10.5,
 *   victimWallet: '...',
 * });
 *
 * // Generate evidence and email
 * await generateEvidence(request.requestId, traceId, victimWallet);
 * const email = await generateEmailTemplate(request.requestId);
 * ```
 */
export function useFreezeRequests(
  options: UseFreezeRequestsOptions = {}
): UseFreezeRequestsResult {
  const { autoFetchExchanges = false, autoFetchPending = false } = options;
  const shield = useLavinth();

  const [exchanges, setExchanges] = useState<ExchangeContact[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FreezeRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<FreezeRequest | null>(null);
  const [evidencePackage, setEvidencePackage] = useState<EvidencePackage | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<{
    subject: string;
    body: string;
    recipientEmail?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LavinthError | null>(null);

  // Fetch exchanges
  const fetchExchanges = useCallback(async (): Promise<ExchangeContact[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await shield.getExchangeContacts();
      setExchanges(result);
      return result;
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'EXCHANGE_ERROR');
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shield]);

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async (): Promise<FreezeRequest[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await shield.getPendingFreezeRequests();
      setPendingRequests(result);
      return result;
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'FREEZE_ERROR');
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shield]);

  // Create freeze request
  const createFreezeRequest = useCallback(
    async (params: {
      traceId: string;
      exchangeName: string;
      depositAddress: string;
      depositSignature: string;
      amount: number;
      victimWallet: string;
      tokenMint?: string;
      tokenSymbol?: string;
    }): Promise<FreezeRequest | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const request = await shield.createFreezeRequest(params);
        setCurrentRequest(request);
        return request;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'FREEZE_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );

  // Update status
  const updateStatus = useCallback(
    async (
      requestId: string,
      status: string,
      exchangeTicketId?: string,
      exchangeResponse?: string
    ) => {
      try {
        await shield.updateFreezeRequestStatus(
          requestId,
          status,
          exchangeTicketId,
          exchangeResponse
        );
        // Refresh pending requests
        await fetchPendingRequests();
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'FREEZE_ERROR');
        setError(wsError);
      }
    },
    [shield, fetchPendingRequests]
  );

  // Generate evidence
  const generateEvidence = useCallback(
    async (
      requestId: string,
      traceId: string,
      victimWallet: string,
      victimStatement?: string
    ): Promise<EvidencePackage | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await shield.generateEvidencePackage(
          requestId,
          traceId,
          victimWallet,
          victimStatement
        );
        setEvidencePackage(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'EVIDENCE_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );

  // Generate email template
  const generateEmailTemplate = useCallback(
    async (
      requestId: string
    ): Promise<{ subject: string; body: string; recipientEmail?: string } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await shield.generateFreezeRequestEmail(requestId);
        setEmailTemplate(result);
        return result;
      } catch (err: any) {
        const wsError =
          err instanceof LavinthError
            ? err
            : new LavinthError(err.message, 'EMAIL_ERROR');
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );

  // Get statistics
  const getStatistics = useCallback(async () => {
    try {
      return await shield.getFreezeStatistics();
    } catch (err: any) {
      const wsError =
        err instanceof LavinthError
          ? err
          : new LavinthError(err.message, 'STATS_ERROR');
      setError(wsError);
      return null;
    }
  }, [shield]);

  // Auto-fetch
  useEffect(() => {
    if (autoFetchExchanges) {
      fetchExchanges();
    }
  }, [autoFetchExchanges, fetchExchanges]);

  useEffect(() => {
    if (autoFetchPending) {
      fetchPendingRequests();
    }
  }, [autoFetchPending, fetchPendingRequests]);

  return {
    exchanges,
    pendingRequests,
    currentRequest,
    evidencePackage,
    emailTemplate,
    isLoading,
    error,
    fetchExchanges,
    fetchPendingRequests,
    createFreezeRequest,
    updateStatus,
    generateEvidence,
    generateEmailTemplate,
    getStatistics,
  };
}
