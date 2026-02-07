/**
 * Lavinth SDK
 * Main SDK class for wallet security operations
 */

import { ApiClient } from './client';
import {
  LavinthConfig,
  LavinthError,
  SecurityProfile,
  TokenApproval,
  CompromiseAnalysis,
  SecurityAlert,
  FundTrace,
  RecoveryReport,
  FreezeRequest,
  ExchangeContact,
  EvidencePackage,
  RevocationPlan,
  RevocationTransaction,
  RevocationResult,
  MonitoringConfig,
  EventHandler,
  LavinthEvent,
  SimulationResult,
  QuickRiskCheck,
  VerifiedProgram,
  SimulationAlert,
} from './types';

export class Lavinth {
  private client: ApiClient;
  private config: LavinthConfig;
  private eventHandlers: Set<EventHandler> = new Set();

  constructor(config: LavinthConfig) {
    if (!config.apiKey) {
      throw new LavinthError('API key is required', 'INVALID_CONFIG');
    }

    this.config = config;
    this.client = new ApiClient(config);
  }

  // ==========================================
  // Event Handling
  // ==========================================

  /**
   * Subscribe to Lavinth events
   */
  on(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: LavinthEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }

  // ==========================================
  // Security Profile & Approvals
  // ==========================================

  /**
   * Scan a wallet for token approvals and generate security profile
   */
  async scanWallet(walletAddress: string): Promise<SecurityProfile> {
    const response = await this.client.get<{ profile: SecurityProfile }>(
      `/api/approvals/scan/${walletAddress}`
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to scan wallet',
        'SCAN_ERROR',
        response.statusCode
      );
    }

    return response.data.profile;
  }

  /**
   * Get cached security profile for a wallet
   */
  async getSecurityProfile(walletAddress: string): Promise<SecurityProfile | null> {
    const response = await this.client.get<{ profile: SecurityProfile }>(
      `/api/security-profile/${walletAddress}`
    );

    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || 'Failed to get security profile',
        'PROFILE_ERROR',
        response.statusCode
      );
    }

    return response.data?.profile || null;
  }

  /**
   * Get all token approvals for a wallet
   */
  async getApprovals(walletAddress: string): Promise<TokenApproval[]> {
    const response = await this.client.get<{ approvals: TokenApproval[] }>(
      `/api/approvals/${walletAddress}`
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get approvals',
        'APPROVALS_ERROR',
        response.statusCode
      );
    }

    return response.data?.approvals || [];
  }

  // ==========================================
  // Revocation
  // ==========================================

  /**
   * Create a revocation plan for all risky approvals
   */
  async createRevocationPlan(walletAddress: string): Promise<RevocationPlan> {
    const response = await this.client.post<{ plan: RevocationPlan }>(
      '/api/revocation/plan',
      { walletAddress }
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to create revocation plan',
        'REVOCATION_ERROR',
        response.statusCode
      );
    }

    return response.data.plan;
  }

  /**
   * Build unsigned revocation transactions
   */
  async buildRevocationTransactions(
    walletAddress: string
  ): Promise<{ sessionId: string; transactions: RevocationTransaction[] }> {
    const response = await this.client.post<{
      sessionId: string;
      transactions: RevocationTransaction[];
    }>('/api/revocation/build', { walletAddress });

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to build revocation transactions',
        'REVOCATION_ERROR',
        response.statusCode
      );
    }

    return response.data;
  }

  /**
   * Submit signed revocation transactions
   */
  async submitRevocations(
    sessionId: string,
    signedTransactions: string[]
  ): Promise<RevocationResult> {
    const response = await this.client.post<RevocationResult>(
      '/api/revocation/submit',
      { sessionId, signedTransactions }
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to submit revocations',
        'REVOCATION_ERROR',
        response.statusCode
      );
    }

    // Emit events for revoked approvals
    response.data.results.forEach(result => {
      if (result.success) {
        this.emit({
          type: 'approval_revoked',
          data: { id: result.approvalId } as TokenApproval,
        });
      }
    });

    return response.data;
  }

  /**
   * Emergency revoke all high-risk approvals
   */
  async emergencyRevoke(
    walletAddress: string
  ): Promise<{ sessionId: string; transactions: RevocationTransaction[] }> {
    const response = await this.client.post<{
      sessionId: string;
      transactions: RevocationTransaction[];
    }>('/api/revocation/emergency', { walletAddress });

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to create emergency revocation',
        'REVOCATION_ERROR',
        response.statusCode
      );
    }

    return response.data;
  }

  // ==========================================
  // Compromise Detection
  // ==========================================

  /**
   * Analyze a wallet for signs of compromise
   */
  async analyzeCompromise(walletAddress: string): Promise<CompromiseAnalysis> {
    const response = await this.client.get<CompromiseAnalysis>(
      `/api/compromise/analyze/${walletAddress}`
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to analyze wallet',
        'ANALYSIS_ERROR',
        response.statusCode
      );
    }

    const analysis = response.data;

    // Emit alert if compromised
    if (analysis.isCompromised) {
      this.emit({ type: 'compromise_detected', data: analysis });

      // Emit individual alerts
      analysis.alerts.forEach(alert => {
        this.emit({ type: 'alert', data: alert });

        // Call the onAlert callback if configured
        if (this.config.onAlert) {
          this.config.onAlert(alert);
        }
      });
    }

    return analysis;
  }

  /**
   * Get alerts for a wallet
   */
  async getAlerts(walletAddress: string, limit?: number): Promise<SecurityAlert[]> {
    const response = await this.client.get<{ alerts: SecurityAlert[] }>(
      `/api/compromise/alerts/${walletAddress}`,
      { limit }
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get alerts',
        'ALERTS_ERROR',
        response.statusCode
      );
    }

    return response.data?.alerts || [];
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const response = await this.client.post(
      `/api/compromise/alerts/${alertId}/acknowledge`
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to acknowledge alert',
        'ALERT_ERROR',
        response.statusCode
      );
    }
  }

  // ==========================================
  // Wallet Monitoring
  // ==========================================

  /**
   * Register a wallet for monitoring
   */
  async registerForMonitoring(config: MonitoringConfig): Promise<void> {
    const response = await this.client.post('/api/compromise/monitor', {
      walletAddress: config.walletAddress,
      alertChannels: config.alertChannels,
      monitoringLevel: config.monitoringLevel,
    });

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to register for monitoring',
        'MONITORING_ERROR',
        response.statusCode
      );
    }
  }

  /**
   * Create alert subscription
   */
  async subscribeToAlerts(
    walletAddress: string,
    channels: { webhook?: string; discord?: string; email?: string }
  ): Promise<void> {
    const response = await this.client.post('/api/alerts/subscribe', {
      walletAddress,
      channels,
    });

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to subscribe to alerts',
        'SUBSCRIPTION_ERROR',
        response.statusCode
      );
    }
  }

  /**
   * Unsubscribe from alerts
   */
  async unsubscribeFromAlerts(walletAddress: string): Promise<void> {
    const response = await this.client.delete(
      `/api/alerts/subscription/${walletAddress}`
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to unsubscribe',
        'SUBSCRIPTION_ERROR',
        response.statusCode
      );
    }
  }

  // ==========================================
  // Fund Tracing
  // ==========================================

  /**
   * Start tracing stolen funds
   */
  async startFundTrace(
    sourceWallet: string,
    initialAmount: number,
    tokenMint?: string
  ): Promise<FundTrace> {
    const response = await this.client.post<{ trace: FundTrace }>(
      '/api/funds/trace',
      { sourceWallet, initialAmount, tokenMint }
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to start fund trace',
        'TRACE_ERROR',
        response.statusCode
      );
    }

    return response.data.trace;
  }

  /**
   * Get fund trace status
   */
  async getTrace(traceId: string): Promise<FundTrace | null> {
    const response = await this.client.get<FundTrace>(
      `/api/funds/trace/${traceId}`
    );

    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || 'Failed to get trace',
        'TRACE_ERROR',
        response.statusCode
      );
    }

    return response.data || null;
  }

  /**
   * Get all traces for a wallet
   */
  async getTracesForWallet(walletAddress: string): Promise<FundTrace[]> {
    const response = await this.client.get<{ traces: FundTrace[] }>(
      `/api/funds/traces/${walletAddress}`
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get traces',
        'TRACE_ERROR',
        response.statusCode
      );
    }

    return response.data?.traces || [];
  }

  /**
   * Generate recovery report
   */
  async generateRecoveryReport(traceId: string): Promise<RecoveryReport> {
    const response = await this.client.get<RecoveryReport>(
      `/api/funds/report/${traceId}`
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to generate report',
        'REPORT_ERROR',
        response.statusCode
      );
    }

    return response.data;
  }

  // ==========================================
  // Exchange Coordination
  // ==========================================

  /**
   * Get list of supported exchanges
   */
  async getExchangeContacts(): Promise<ExchangeContact[]> {
    const response = await this.client.get<{ contacts: ExchangeContact[] }>(
      '/api/exchanges/contacts'
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get exchanges',
        'EXCHANGE_ERROR',
        response.statusCode
      );
    }

    return response.data?.contacts || [];
  }

  /**
   * Create a freeze request
   */
  async createFreezeRequest(params: {
    traceId: string;
    exchangeName: string;
    depositAddress: string;
    depositSignature: string;
    amount: number;
    victimWallet: string;
    tokenMint?: string;
    tokenSymbol?: string;
  }): Promise<FreezeRequest> {
    const response = await this.client.post<{ request: FreezeRequest }>(
      '/api/freeze-requests',
      params
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to create freeze request',
        'FREEZE_ERROR',
        response.statusCode
      );
    }

    return response.data.request;
  }

  /**
   * Get freeze request by ID
   */
  async getFreezeRequest(requestId: string): Promise<FreezeRequest | null> {
    const response = await this.client.get<FreezeRequest>(
      `/api/freeze-requests/${requestId}`
    );

    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || 'Failed to get freeze request',
        'FREEZE_ERROR',
        response.statusCode
      );
    }

    return response.data || null;
  }

  /**
   * Get pending freeze requests
   */
  async getPendingFreezeRequests(): Promise<FreezeRequest[]> {
    const response = await this.client.get<{ requests: FreezeRequest[] }>(
      '/api/freeze-requests/pending'
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get pending requests',
        'FREEZE_ERROR',
        response.statusCode
      );
    }

    return response.data?.requests || [];
  }

  /**
   * Update freeze request status
   */
  async updateFreezeRequestStatus(
    requestId: string,
    status: string,
    exchangeTicketId?: string,
    exchangeResponse?: string
  ): Promise<void> {
    const response = await this.client.patch(
      `/api/freeze-requests/${requestId}/status`,
      { status, exchangeTicketId, exchangeResponse }
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to update status',
        'FREEZE_ERROR',
        response.statusCode
      );
    }
  }

  /**
   * Generate evidence package
   */
  async generateEvidencePackage(
    requestId: string,
    traceId: string,
    victimWallet: string,
    victimStatement?: string
  ): Promise<EvidencePackage> {
    const response = await this.client.post<{ evidencePackage: EvidencePackage }>(
      `/api/freeze-requests/${requestId}/evidence`,
      { traceId, victimWallet, victimStatement }
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to generate evidence',
        'EVIDENCE_ERROR',
        response.statusCode
      );
    }

    return response.data.evidencePackage;
  }

  /**
   * Generate freeze request email template
   */
  async generateFreezeRequestEmail(
    requestId: string
  ): Promise<{ subject: string; body: string; recipientEmail?: string }> {
    const response = await this.client.post<{
      template: { subject: string; body: string };
      recipientEmail?: string;
    }>(`/api/freeze-requests/${requestId}/email-template`);

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to generate email',
        'EMAIL_ERROR',
        response.statusCode
      );
    }

    return {
      subject: response.data.template.subject,
      body: response.data.template.body,
      recipientEmail: response.data.recipientEmail,
    };
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Report a malicious delegate/spender address
   */
  async reportMaliciousAddress(
    address: string,
    label: string,
    category: string,
    reportedLosses?: number
  ): Promise<void> {
    const response = await this.client.post('/api/report/malicious-delegate', {
      address,
      label,
      category,
      reportedLosses,
    });

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to report address',
        'REPORT_ERROR',
        response.statusCode
      );
    }
  }

  /**
   * Check if an address is a known exchange
   */
  async isKnownExchange(address: string): Promise<ExchangeContact | null> {
    const response = await this.client.get<ExchangeContact>(
      `/api/exchanges/by-address/${address}`
    );

    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || 'Failed to check exchange',
        'EXCHANGE_ERROR',
        response.statusCode
      );
    }

    return response.data || null;
  }

  /**
   * Get freeze request statistics
   */
  async getFreezeStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    successRate: number;
    avgResponseTime: number;
  }> {
    const response = await this.client.get('/api/freeze-requests/statistics');

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get statistics',
        'STATS_ERROR',
        response.statusCode
      );
    }

    return response.data as any;
  }

  // ==========================================
  // Transaction Simulation
  // ==========================================

  /**
   * Simulate a transaction before signing
   * Returns detailed risk analysis and predicted effects
   */
  async simulateTransaction(
    serializedTransaction: string,
    walletAddress: string,
    storeResult: boolean = true
  ): Promise<SimulationResult> {
    const response = await this.client.post<{ simulation: SimulationResult }>(
      '/api/simulation/simulate',
      { serializedTransaction, walletAddress, storeResult }
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to simulate transaction',
        'SIMULATION_ERROR',
        response.statusCode
      );
    }

    return response.data.simulation;
  }

  /**
   * Quick risk check for a transaction (lightweight)
   * Use for pre-screening before full simulation
   */
  async quickRiskCheck(serializedTransaction: string): Promise<QuickRiskCheck> {
    const response = await this.client.post<{ check: QuickRiskCheck }>(
      '/api/simulation/quick-check',
      { serializedTransaction }
    );

    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || 'Failed to perform risk check',
        'SIMULATION_ERROR',
        response.statusCode
      );
    }

    return response.data.check;
  }

  /**
   * Get simulation history for a wallet
   */
  async getSimulationHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<SimulationResult[]> {
    const response = await this.client.get<{ simulations: SimulationResult[] }>(
      `/api/simulation/history/${walletAddress}`,
      { limit }
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get simulation history',
        'SIMULATION_ERROR',
        response.statusCode
      );
    }

    return response.data?.simulations || [];
  }

  /**
   * Get a specific simulation by ID
   */
  async getSimulation(simulationId: string): Promise<SimulationResult | null> {
    const response = await this.client.get<SimulationResult>(
      `/api/simulation/${simulationId}`
    );

    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || 'Failed to get simulation',
        'SIMULATION_ERROR',
        response.statusCode
      );
    }

    return response.data || null;
  }

  /**
   * Get list of verified programs
   */
  async getVerifiedPrograms(): Promise<VerifiedProgram[]> {
    const response = await this.client.get<{ programs: VerifiedProgram[] }>(
      '/api/programs/verified'
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get verified programs',
        'PROGRAMS_ERROR',
        response.statusCode
      );
    }

    return response.data?.programs || [];
  }

  /**
   * Check if a program is verified
   */
  async checkProgram(programId: string): Promise<VerifiedProgram | null> {
    const response = await this.client.get<VerifiedProgram & { isKnown: boolean }>(
      `/api/programs/${programId}`
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to check program',
        'PROGRAMS_ERROR',
        response.statusCode
      );
    }

    if (!response.data?.isKnown) {
      return null;
    }

    return response.data;
  }

  /**
   * Get simulation alerts for a wallet
   */
  async getSimulationAlerts(
    walletAddress: string,
    limit: number = 50,
    acknowledged?: boolean
  ): Promise<SimulationAlert[]> {
    const params: Record<string, any> = { limit };
    if (acknowledged !== undefined) {
      params.acknowledged = acknowledged;
    }

    const response = await this.client.get<{ alerts: SimulationAlert[] }>(
      `/api/simulation/alerts/${walletAddress}`,
      params
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to get simulation alerts',
        'SIMULATION_ERROR',
        response.statusCode
      );
    }

    return response.data?.alerts || [];
  }

  /**
   * Acknowledge a simulation alert
   */
  async acknowledgeSimulationAlert(alertId: string): Promise<void> {
    const response = await this.client.post(
      `/api/simulation/alerts/${alertId}/acknowledge`
    );

    if (!response.success) {
      throw new LavinthError(
        response.error || 'Failed to acknowledge alert',
        'SIMULATION_ERROR',
        response.statusCode
      );
    }
  }
}
