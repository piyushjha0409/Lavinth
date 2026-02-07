// src/types.ts
var LavinthError = class extends Error {
  constructor(message, code, statusCode, details) {
    super(message);
    this.name = "LavinthError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
};

// src/client.ts
var DEFAULT_API_URL = "https://api.lavinth.io";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_RETRY_ATTEMPTS = 3;
var ApiClient = class {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || this.getApiUrlForEnvironment(config.environment);
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.retryAttempts = config.retryAttempts || DEFAULT_RETRY_ATTEMPTS;
    this.onError = config.onError;
  }
  getApiUrlForEnvironment(env) {
    switch (env) {
      case "development":
        return "http://localhost:3001";
      case "staging":
        return "https://staging-api.lavinth.io";
      default:
        return DEFAULT_API_URL;
    }
  }
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async fetchWithRetry(url, options, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        const error = new LavinthError(
          data.error || `Request failed with status ${response.status}`,
          "API_ERROR",
          response.status,
          data
        );
        if (this.onError) {
          this.onError(error);
        }
        if (response.status >= 500 && attempt < this.retryAttempts) {
          await this.sleep(Math.pow(2, attempt) * 1e3);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
        return {
          success: false,
          error: error.message,
          statusCode: response.status
        };
      }
      return {
        success: true,
        data,
        statusCode: response.status
      };
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new LavinthError(
          "Request timed out",
          "TIMEOUT",
          void 0,
          { timeout: this.timeout }
        );
        if (this.onError) {
          this.onError(timeoutError);
        }
        return {
          success: false,
          error: "Request timed out",
          statusCode: 408
        };
      }
      if (attempt < this.retryAttempts) {
        await this.sleep(Math.pow(2, attempt) * 1e3);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      const networkError = new LavinthError(
        error.message || "Network error",
        "NETWORK_ERROR",
        void 0,
        error
      );
      if (this.onError) {
        this.onError(networkError);
      }
      return {
        success: false,
        error: error.message || "Network error",
        statusCode: 0
      };
    }
  }
  getHeaders() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "x-access-token": this.apiKey
    };
  }
  async get(endpoint, params) {
    let url = `${this.apiUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== void 0 && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.fetchWithRetry(url, {
      method: "GET",
      headers: this.getHeaders()
    });
  }
  async post(endpoint, body) {
    return this.fetchWithRetry(`${this.apiUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : void 0
    });
  }
  async patch(endpoint, body) {
    return this.fetchWithRetry(`${this.apiUrl}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : void 0
    });
  }
  async delete(endpoint) {
    return this.fetchWithRetry(`${this.apiUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
  }
};

// src/lavinth.ts
var Lavinth = class {
  constructor(config) {
    this.eventHandlers = /* @__PURE__ */ new Set();
    if (!config.apiKey) {
      throw new LavinthError("API key is required", "INVALID_CONFIG");
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
  on(handler) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  /**
   * Emit an event to all subscribers
   */
  emit(event) {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("Event handler error:", error);
      }
    });
  }
  // ==========================================
  // Security Profile & Approvals
  // ==========================================
  /**
   * Scan a wallet for token approvals and generate security profile
   */
  async scanWallet(walletAddress) {
    const response = await this.client.get(
      `/api/approvals/scan/${walletAddress}`
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to scan wallet",
        "SCAN_ERROR",
        response.statusCode
      );
    }
    return response.data.profile;
  }
  /**
   * Get cached security profile for a wallet
   */
  async getSecurityProfile(walletAddress) {
    const response = await this.client.get(
      `/api/security-profile/${walletAddress}`
    );
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || "Failed to get security profile",
        "PROFILE_ERROR",
        response.statusCode
      );
    }
    return response.data?.profile || null;
  }
  /**
   * Get all token approvals for a wallet
   */
  async getApprovals(walletAddress) {
    const response = await this.client.get(
      `/api/approvals/${walletAddress}`
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get approvals",
        "APPROVALS_ERROR",
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
  async createRevocationPlan(walletAddress) {
    const response = await this.client.post(
      "/api/revocation/plan",
      { walletAddress }
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to create revocation plan",
        "REVOCATION_ERROR",
        response.statusCode
      );
    }
    return response.data.plan;
  }
  /**
   * Build unsigned revocation transactions
   */
  async buildRevocationTransactions(walletAddress) {
    const response = await this.client.post("/api/revocation/build", { walletAddress });
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to build revocation transactions",
        "REVOCATION_ERROR",
        response.statusCode
      );
    }
    return response.data;
  }
  /**
   * Submit signed revocation transactions
   */
  async submitRevocations(sessionId, signedTransactions) {
    const response = await this.client.post(
      "/api/revocation/submit",
      { sessionId, signedTransactions }
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to submit revocations",
        "REVOCATION_ERROR",
        response.statusCode
      );
    }
    response.data.results.forEach((result) => {
      if (result.success) {
        this.emit({
          type: "approval_revoked",
          data: { id: result.approvalId }
        });
      }
    });
    return response.data;
  }
  /**
   * Emergency revoke all high-risk approvals
   */
  async emergencyRevoke(walletAddress) {
    const response = await this.client.post("/api/revocation/emergency", { walletAddress });
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to create emergency revocation",
        "REVOCATION_ERROR",
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
  async analyzeCompromise(walletAddress) {
    const response = await this.client.get(
      `/api/compromise/analyze/${walletAddress}`
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to analyze wallet",
        "ANALYSIS_ERROR",
        response.statusCode
      );
    }
    const analysis = response.data;
    if (analysis.isCompromised) {
      this.emit({ type: "compromise_detected", data: analysis });
      analysis.alerts.forEach((alert) => {
        this.emit({ type: "alert", data: alert });
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
  async getAlerts(walletAddress, limit) {
    const response = await this.client.get(
      `/api/compromise/alerts/${walletAddress}`,
      { limit }
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get alerts",
        "ALERTS_ERROR",
        response.statusCode
      );
    }
    return response.data?.alerts || [];
  }
  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId) {
    const response = await this.client.post(
      `/api/compromise/alerts/${alertId}/acknowledge`
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to acknowledge alert",
        "ALERT_ERROR",
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
  async registerForMonitoring(config) {
    const response = await this.client.post("/api/compromise/monitor", {
      walletAddress: config.walletAddress,
      alertChannels: config.alertChannels,
      monitoringLevel: config.monitoringLevel
    });
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to register for monitoring",
        "MONITORING_ERROR",
        response.statusCode
      );
    }
  }
  /**
   * Create alert subscription
   */
  async subscribeToAlerts(walletAddress, channels) {
    const response = await this.client.post("/api/alerts/subscribe", {
      walletAddress,
      channels
    });
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to subscribe to alerts",
        "SUBSCRIPTION_ERROR",
        response.statusCode
      );
    }
  }
  /**
   * Unsubscribe from alerts
   */
  async unsubscribeFromAlerts(walletAddress) {
    const response = await this.client.delete(
      `/api/alerts/subscription/${walletAddress}`
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to unsubscribe",
        "SUBSCRIPTION_ERROR",
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
  async startFundTrace(sourceWallet, initialAmount, tokenMint) {
    const response = await this.client.post(
      "/api/funds/trace",
      { sourceWallet, initialAmount, tokenMint }
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to start fund trace",
        "TRACE_ERROR",
        response.statusCode
      );
    }
    return response.data.trace;
  }
  /**
   * Get fund trace status
   */
  async getTrace(traceId) {
    const response = await this.client.get(
      `/api/funds/trace/${traceId}`
    );
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || "Failed to get trace",
        "TRACE_ERROR",
        response.statusCode
      );
    }
    return response.data || null;
  }
  /**
   * Get all traces for a wallet
   */
  async getTracesForWallet(walletAddress) {
    const response = await this.client.get(
      `/api/funds/traces/${walletAddress}`
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get traces",
        "TRACE_ERROR",
        response.statusCode
      );
    }
    return response.data?.traces || [];
  }
  /**
   * Generate recovery report
   */
  async generateRecoveryReport(traceId) {
    const response = await this.client.get(
      `/api/funds/report/${traceId}`
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to generate report",
        "REPORT_ERROR",
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
  async getExchangeContacts() {
    const response = await this.client.get(
      "/api/exchanges/contacts"
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get exchanges",
        "EXCHANGE_ERROR",
        response.statusCode
      );
    }
    return response.data?.contacts || [];
  }
  /**
   * Create a freeze request
   */
  async createFreezeRequest(params) {
    const response = await this.client.post(
      "/api/freeze-requests",
      params
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to create freeze request",
        "FREEZE_ERROR",
        response.statusCode
      );
    }
    return response.data.request;
  }
  /**
   * Get freeze request by ID
   */
  async getFreezeRequest(requestId) {
    const response = await this.client.get(
      `/api/freeze-requests/${requestId}`
    );
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || "Failed to get freeze request",
        "FREEZE_ERROR",
        response.statusCode
      );
    }
    return response.data || null;
  }
  /**
   * Get pending freeze requests
   */
  async getPendingFreezeRequests() {
    const response = await this.client.get(
      "/api/freeze-requests/pending"
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get pending requests",
        "FREEZE_ERROR",
        response.statusCode
      );
    }
    return response.data?.requests || [];
  }
  /**
   * Update freeze request status
   */
  async updateFreezeRequestStatus(requestId, status, exchangeTicketId, exchangeResponse) {
    const response = await this.client.patch(
      `/api/freeze-requests/${requestId}/status`,
      { status, exchangeTicketId, exchangeResponse }
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to update status",
        "FREEZE_ERROR",
        response.statusCode
      );
    }
  }
  /**
   * Generate evidence package
   */
  async generateEvidencePackage(requestId, traceId, victimWallet, victimStatement) {
    const response = await this.client.post(
      `/api/freeze-requests/${requestId}/evidence`,
      { traceId, victimWallet, victimStatement }
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to generate evidence",
        "EVIDENCE_ERROR",
        response.statusCode
      );
    }
    return response.data.evidencePackage;
  }
  /**
   * Generate freeze request email template
   */
  async generateFreezeRequestEmail(requestId) {
    const response = await this.client.post(`/api/freeze-requests/${requestId}/email-template`);
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to generate email",
        "EMAIL_ERROR",
        response.statusCode
      );
    }
    return {
      subject: response.data.template.subject,
      body: response.data.template.body,
      recipientEmail: response.data.recipientEmail
    };
  }
  // ==========================================
  // Utility Methods
  // ==========================================
  /**
   * Report a malicious delegate/spender address
   */
  async reportMaliciousAddress(address, label, category, reportedLosses) {
    const response = await this.client.post("/api/report/malicious-delegate", {
      address,
      label,
      category,
      reportedLosses
    });
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to report address",
        "REPORT_ERROR",
        response.statusCode
      );
    }
  }
  /**
   * Check if an address is a known exchange
   */
  async isKnownExchange(address) {
    const response = await this.client.get(
      `/api/exchanges/by-address/${address}`
    );
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || "Failed to check exchange",
        "EXCHANGE_ERROR",
        response.statusCode
      );
    }
    return response.data || null;
  }
  /**
   * Get freeze request statistics
   */
  async getFreezeStatistics() {
    const response = await this.client.get("/api/freeze-requests/statistics");
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get statistics",
        "STATS_ERROR",
        response.statusCode
      );
    }
    return response.data;
  }
  // ==========================================
  // Transaction Simulation
  // ==========================================
  /**
   * Simulate a transaction before signing
   * Returns detailed risk analysis and predicted effects
   */
  async simulateTransaction(serializedTransaction, walletAddress, storeResult = true) {
    const response = await this.client.post(
      "/api/simulation/simulate",
      { serializedTransaction, walletAddress, storeResult }
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to simulate transaction",
        "SIMULATION_ERROR",
        response.statusCode
      );
    }
    return response.data.simulation;
  }
  /**
   * Quick risk check for a transaction (lightweight)
   * Use for pre-screening before full simulation
   */
  async quickRiskCheck(serializedTransaction) {
    const response = await this.client.post(
      "/api/simulation/quick-check",
      { serializedTransaction }
    );
    if (!response.success || !response.data) {
      throw new LavinthError(
        response.error || "Failed to perform risk check",
        "SIMULATION_ERROR",
        response.statusCode
      );
    }
    return response.data.check;
  }
  /**
   * Get simulation history for a wallet
   */
  async getSimulationHistory(walletAddress, limit = 50) {
    const response = await this.client.get(
      `/api/simulation/history/${walletAddress}`,
      { limit }
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get simulation history",
        "SIMULATION_ERROR",
        response.statusCode
      );
    }
    return response.data?.simulations || [];
  }
  /**
   * Get a specific simulation by ID
   */
  async getSimulation(simulationId) {
    const response = await this.client.get(
      `/api/simulation/${simulationId}`
    );
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new LavinthError(
        response.error || "Failed to get simulation",
        "SIMULATION_ERROR",
        response.statusCode
      );
    }
    return response.data || null;
  }
  /**
   * Get list of verified programs
   */
  async getVerifiedPrograms() {
    const response = await this.client.get(
      "/api/programs/verified"
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get verified programs",
        "PROGRAMS_ERROR",
        response.statusCode
      );
    }
    return response.data?.programs || [];
  }
  /**
   * Check if a program is verified
   */
  async checkProgram(programId) {
    const response = await this.client.get(
      `/api/programs/${programId}`
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to check program",
        "PROGRAMS_ERROR",
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
  async getSimulationAlerts(walletAddress, limit = 50, acknowledged) {
    const params = { limit };
    if (acknowledged !== void 0) {
      params.acknowledged = acknowledged;
    }
    const response = await this.client.get(
      `/api/simulation/alerts/${walletAddress}`,
      params
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to get simulation alerts",
        "SIMULATION_ERROR",
        response.statusCode
      );
    }
    return response.data?.alerts || [];
  }
  /**
   * Acknowledge a simulation alert
   */
  async acknowledgeSimulationAlert(alertId) {
    const response = await this.client.post(
      `/api/simulation/alerts/${alertId}/acknowledge`
    );
    if (!response.success) {
      throw new LavinthError(
        response.error || "Failed to acknowledge alert",
        "SIMULATION_ERROR",
        response.statusCode
      );
    }
  }
};

// src/index.ts
var VERSION = "1.0.0";
function createLavinth(config) {
  return new Lavinth(config);
}
var index_default = Lavinth;
export {
  ApiClient,
  Lavinth,
  LavinthError,
  VERSION,
  createLavinth,
  index_default as default
};
