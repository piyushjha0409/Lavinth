"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ApprovalsList: () => ApprovalsList,
  EmergencyRecoveryModal: () => EmergencyRecoveryModal,
  FundTraceViewer: () => FundTraceViewer,
  LavinthProvider: () => LavinthProvider,
  RecoveryWizard: () => RecoveryWizard,
  SecurityAlertBanner: () => SecurityAlertBanner,
  useApprovals: () => useApprovals,
  useCompromiseDetection: () => useCompromiseDetection,
  useFreezeRequests: () => useFreezeRequests,
  useFundTracing: () => useFundTracing,
  useLavinth: () => useLavinth,
  useLavinthContext: () => useLavinthContext,
  useSecurityProfile: () => useSecurityProfile,
  useSimulation: () => useSimulation
});
module.exports = __toCommonJS(index_exports);

// src/context.tsx
var import_react = require("react");
var import_sdk = require("@lavinth/sdk");
var import_jsx_runtime = require("react/jsx-runtime");
var LavinthContext = (0, import_react.createContext)(null);
function LavinthProvider({
  config,
  children,
  onEvent
}) {
  const [alerts, setAlerts] = (0, import_react.useState)([]);
  const [isInitialized, setIsInitialized] = (0, import_react.useState)(false);
  const sdk = (0, import_react.useMemo)(() => {
    try {
      const instance = new import_sdk.Lavinth({
        ...config,
        onAlert: (alert) => {
          setAlerts((prev) => [...prev, alert]);
          config.onAlert?.(alert);
        }
      });
      return instance;
    } catch (error) {
      console.error("Failed to initialize Lavinth:", error);
      return null;
    }
  }, [config.apiKey, config.apiUrl, config.environment]);
  (0, import_react.useEffect)(() => {
    if (!sdk) return;
    const unsubscribe = sdk.on((event) => {
      onEvent?.(event);
      if (event.type === "alert") {
        setAlerts((prev) => [...prev, event.data]);
      }
    });
    setIsInitialized(true);
    return unsubscribe;
  }, [sdk, onEvent]);
  const clearAlerts = (0, import_react.useCallback)(() => {
    setAlerts([]);
  }, []);
  const value = (0, import_react.useMemo)(
    () => ({
      sdk,
      isInitialized,
      alerts,
      clearAlerts
    }),
    [sdk, isInitialized, alerts, clearAlerts]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LavinthContext.Provider, { value, children });
}
function useLavinthContext() {
  const context = (0, import_react.useContext)(LavinthContext);
  if (!context) {
    throw new Error(
      "useLavinthContext must be used within a LavinthProvider"
    );
  }
  return context;
}
function useLavinth() {
  const { sdk, isInitialized } = useLavinthContext();
  if (!sdk) {
    throw new Error("Lavinth SDK is not initialized");
  }
  return sdk;
}

// src/hooks/useSecurityProfile.ts
var import_react2 = require("react");
var import_sdk2 = require("@lavinth/sdk");
function useSecurityProfile(options = {}) {
  const { walletAddress, autoScan = false, refreshInterval } = options;
  const shield = useLavinth();
  const [profile, setProfile] = (0, import_react2.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const scan = (0, import_react2.useCallback)(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new import_sdk2.LavinthError("Wallet address is required", "INVALID_INPUT")
        );
        return null;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.scanWallet(targetAddress);
        setProfile(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk2.LavinthError ? err : new import_sdk2.LavinthError(err.message, "SCAN_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const refresh = (0, import_react2.useCallback)(async () => {
    if (walletAddress) {
      await scan(walletAddress);
    }
  }, [scan, walletAddress]);
  (0, import_react2.useEffect)(() => {
    if (autoScan && walletAddress) {
      scan(walletAddress);
    }
  }, [autoScan, walletAddress, scan]);
  (0, import_react2.useEffect)(() => {
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
    refresh
  };
}

// src/hooks/useCompromiseDetection.ts
var import_react3 = require("react");
var import_sdk3 = require("@lavinth/sdk");
function useCompromiseDetection(options = {}) {
  const { walletAddress, autoAnalyze = false, monitorInterval } = options;
  const shield = useLavinth();
  const { alerts: contextAlerts } = useLavinthContext();
  const [analysis, setAnalysis] = (0, import_react3.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)(null);
  const analyze = (0, import_react3.useCallback)(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new import_sdk3.LavinthError("Wallet address is required", "INVALID_INPUT")
        );
        return null;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.analyzeCompromise(targetAddress);
        setAnalysis(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk3.LavinthError ? err : new import_sdk3.LavinthError(err.message, "ANALYSIS_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const acknowledgeAlert = (0, import_react3.useCallback)(
    async (alertId) => {
      try {
        await shield.acknowledgeAlert(alertId);
        if (walletAddress) {
          await analyze(walletAddress);
        }
      } catch (err) {
        console.error("Failed to acknowledge alert:", err);
      }
    },
    [shield, walletAddress, analyze]
  );
  (0, import_react3.useEffect)(() => {
    if (autoAnalyze && walletAddress) {
      analyze(walletAddress);
    }
  }, [autoAnalyze, walletAddress, analyze]);
  (0, import_react3.useEffect)(() => {
    if (!monitorInterval || !walletAddress) return;
    const intervalId = setInterval(() => {
      analyze(walletAddress);
    }, monitorInterval);
    return () => clearInterval(intervalId);
  }, [monitorInterval, walletAddress, analyze]);
  const allAlerts = analysis?.alerts || [];
  const walletAlerts = walletAddress ? contextAlerts.filter((a) => a.walletAddress === walletAddress) : [];
  const uniqueAlerts = [
    ...allAlerts,
    ...walletAlerts.filter(
      (ca) => !allAlerts.some((a) => a.alertId === ca.alertId)
    )
  ];
  return {
    analysis,
    isCompromised: analysis?.isCompromised ?? false,
    riskScore: analysis?.riskScore ?? 0,
    alerts: uniqueAlerts,
    isLoading,
    error,
    analyze,
    acknowledgeAlert
  };
}

// src/hooks/useApprovals.ts
var import_react4 = require("react");
var import_sdk4 = require("@lavinth/sdk");
function useApprovals(options = {}) {
  const { walletAddress, autoFetch = false } = options;
  const shield = useLavinth();
  const [approvals, setApprovals] = (0, import_react4.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const fetchApprovals = (0, import_react4.useCallback)(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new import_sdk4.LavinthError("Wallet address is required", "INVALID_INPUT")
        );
        return [];
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.getApprovals(targetAddress);
        setApprovals(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk4.LavinthError ? err : new import_sdk4.LavinthError(err.message, "APPROVALS_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const createRevocationPlan = (0, import_react4.useCallback)(async () => {
    if (!walletAddress) {
      setError(
        new import_sdk4.LavinthError("Wallet address is required", "INVALID_INPUT")
      );
      return null;
    }
    try {
      return await shield.createRevocationPlan(walletAddress);
    } catch (err) {
      const wsError = err instanceof import_sdk4.LavinthError ? err : new import_sdk4.LavinthError(err.message, "REVOCATION_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);
  const buildRevocationTransactions = (0, import_react4.useCallback)(async () => {
    if (!walletAddress) {
      setError(
        new import_sdk4.LavinthError("Wallet address is required", "INVALID_INPUT")
      );
      return null;
    }
    try {
      return await shield.buildRevocationTransactions(walletAddress);
    } catch (err) {
      const wsError = err instanceof import_sdk4.LavinthError ? err : new import_sdk4.LavinthError(err.message, "REVOCATION_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);
  const emergencyRevoke = (0, import_react4.useCallback)(async () => {
    if (!walletAddress) {
      setError(
        new import_sdk4.LavinthError("Wallet address is required", "INVALID_INPUT")
      );
      return null;
    }
    try {
      return await shield.emergencyRevoke(walletAddress);
    } catch (err) {
      const wsError = err instanceof import_sdk4.LavinthError ? err : new import_sdk4.LavinthError(err.message, "REVOCATION_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);
  (0, import_react4.useEffect)(() => {
    if (autoFetch && walletAddress) {
      fetchApprovals(walletAddress);
    }
  }, [autoFetch, walletAddress, fetchApprovals]);
  const highRiskApprovals = approvals.filter(
    (a) => a.riskLevel === "critical" || a.riskLevel === "high"
  );
  return {
    approvals,
    highRiskApprovals,
    isLoading,
    error,
    fetchApprovals,
    createRevocationPlan,
    buildRevocationTransactions,
    emergencyRevoke
  };
}

// src/hooks/useFundTracing.ts
var import_react5 = require("react");
var import_sdk5 = require("@lavinth/sdk");
function useFundTracing(options = {}) {
  const { walletAddress } = options;
  const shield = useLavinth();
  const [traces, setTraces] = (0, import_react5.useState)([]);
  const [currentTrace, setCurrentTrace] = (0, import_react5.useState)(null);
  const [report, setReport] = (0, import_react5.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react5.useState)(false);
  const [isTracing, setIsTracing] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)(null);
  const startTrace = (0, import_react5.useCallback)(
    async (sourceWallet, amount, tokenMint) => {
      setIsTracing(true);
      setError(null);
      try {
        const trace = await shield.startFundTrace(sourceWallet, amount, tokenMint);
        setCurrentTrace(trace);
        setTraces((prev) => [...prev, trace]);
        return trace;
      } catch (err) {
        const wsError = err instanceof import_sdk5.LavinthError ? err : new import_sdk5.LavinthError(err.message, "TRACE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsTracing(false);
      }
    },
    [shield]
  );
  const getTrace = (0, import_react5.useCallback)(
    async (traceId) => {
      setIsLoading(true);
      setError(null);
      try {
        const trace = await shield.getTrace(traceId);
        if (trace) {
          setCurrentTrace(trace);
        }
        return trace;
      } catch (err) {
        const wsError = err instanceof import_sdk5.LavinthError ? err : new import_sdk5.LavinthError(err.message, "TRACE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const fetchTraces = (0, import_react5.useCallback)(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new import_sdk5.LavinthError("Wallet address is required", "INVALID_INPUT")
        );
        return [];
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.getTracesForWallet(targetAddress);
        setTraces(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk5.LavinthError ? err : new import_sdk5.LavinthError(err.message, "TRACE_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const generateReport = (0, import_react5.useCallback)(
    async (traceId) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.generateRecoveryReport(traceId);
        setReport(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk5.LavinthError ? err : new import_sdk5.LavinthError(err.message, "REPORT_ERROR");
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
    generateReport
  };
}

// src/hooks/useFreezeRequests.ts
var import_react6 = require("react");
var import_sdk6 = require("@lavinth/sdk");
function useFreezeRequests(options = {}) {
  const { autoFetchExchanges = false, autoFetchPending = false } = options;
  const shield = useLavinth();
  const [exchanges, setExchanges] = (0, import_react6.useState)([]);
  const [pendingRequests, setPendingRequests] = (0, import_react6.useState)([]);
  const [currentRequest, setCurrentRequest] = (0, import_react6.useState)(null);
  const [evidencePackage, setEvidencePackage] = (0, import_react6.useState)(null);
  const [emailTemplate, setEmailTemplate] = (0, import_react6.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)(null);
  const fetchExchanges = (0, import_react6.useCallback)(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await shield.getExchangeContacts();
      setExchanges(result);
      return result;
    } catch (err) {
      const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "EXCHANGE_ERROR");
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shield]);
  const fetchPendingRequests = (0, import_react6.useCallback)(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await shield.getPendingFreezeRequests();
      setPendingRequests(result);
      return result;
    } catch (err) {
      const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "FREEZE_ERROR");
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shield]);
  const createFreezeRequest = (0, import_react6.useCallback)(
    async (params) => {
      setIsLoading(true);
      setError(null);
      try {
        const request = await shield.createFreezeRequest(params);
        setCurrentRequest(request);
        return request;
      } catch (err) {
        const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "FREEZE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const updateStatus = (0, import_react6.useCallback)(
    async (requestId, status, exchangeTicketId, exchangeResponse) => {
      try {
        await shield.updateFreezeRequestStatus(
          requestId,
          status,
          exchangeTicketId,
          exchangeResponse
        );
        await fetchPendingRequests();
      } catch (err) {
        const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "FREEZE_ERROR");
        setError(wsError);
      }
    },
    [shield, fetchPendingRequests]
  );
  const generateEvidence = (0, import_react6.useCallback)(
    async (requestId, traceId, victimWallet, victimStatement) => {
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
      } catch (err) {
        const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "EVIDENCE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const generateEmailTemplate = (0, import_react6.useCallback)(
    async (requestId) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.generateFreezeRequestEmail(requestId);
        setEmailTemplate(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "EMAIL_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const getStatistics = (0, import_react6.useCallback)(async () => {
    try {
      return await shield.getFreezeStatistics();
    } catch (err) {
      const wsError = err instanceof import_sdk6.LavinthError ? err : new import_sdk6.LavinthError(err.message, "STATS_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield]);
  (0, import_react6.useEffect)(() => {
    if (autoFetchExchanges) {
      fetchExchanges();
    }
  }, [autoFetchExchanges, fetchExchanges]);
  (0, import_react6.useEffect)(() => {
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
    getStatistics
  };
}

// src/hooks/useSimulation.ts
var import_react7 = require("react");
var import_sdk7 = require("@lavinth/sdk");
function useSimulation(options = {}) {
  const {
    walletAddress,
    autoFetchHistory = false,
    autoFetchAlerts = false,
    historyLimit = 50,
    alertsLimit = 50
  } = options;
  const lavinth = useLavinth();
  const [currentSimulation, setCurrentSimulation] = (0, import_react7.useState)(null);
  const [history, setHistory] = (0, import_react7.useState)([]);
  const [alerts, setAlerts] = (0, import_react7.useState)([]);
  const [verifiedPrograms, setVerifiedPrograms] = (0, import_react7.useState)([]);
  const [isSimulating, setIsSimulating] = (0, import_react7.useState)(false);
  const [isLoading, setIsLoading] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)(null);
  const clearError = (0, import_react7.useCallback)(() => {
    setError(null);
  }, []);
  const simulate = (0, import_react7.useCallback)(
    async (serializedTransaction, storeResult = true) => {
      if (!walletAddress) {
        setError(
          new import_sdk7.LavinthError("Wallet address is required", "INVALID_INPUT")
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
        if (storeResult) {
          setHistory((prev) => [result, ...prev.slice(0, historyLimit - 1)]);
        }
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsSimulating(false);
      }
    },
    [lavinth, walletAddress, historyLimit]
  );
  const quickCheck = (0, import_react7.useCallback)(
    async (serializedTransaction) => {
      setError(null);
      try {
        return await lavinth.quickRiskCheck(serializedTransaction);
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );
  const getSimulation = (0, import_react7.useCallback)(
    async (simulationId) => {
      setError(null);
      try {
        const result = await lavinth.getSimulation(simulationId);
        if (result) {
          setCurrentSimulation(result);
        }
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );
  const fetchHistory = (0, import_react7.useCallback)(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new import_sdk7.LavinthError("Wallet address is required", "INVALID_INPUT")
        );
        return [];
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await lavinth.getSimulationHistory(targetAddress, historyLimit);
        setHistory(result);
        return result;
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [lavinth, walletAddress, historyLimit]
  );
  const fetchAlerts = (0, import_react7.useCallback)(
    async (address, acknowledged) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new import_sdk7.LavinthError("Wallet address is required", "INVALID_INPUT")
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
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [lavinth, walletAddress, alertsLimit]
  );
  const acknowledgeAlert = (0, import_react7.useCallback)(
    async (alertId) => {
      try {
        await lavinth.acknowledgeSimulationAlert(alertId);
        setAlerts(
          (prev) => prev.map(
            (alert) => alert.alertId === alertId ? { ...alert, isAcknowledged: true, acknowledgedAt: (/* @__PURE__ */ new Date()).toISOString() } : alert
          )
        );
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "SIMULATION_ERROR");
        setError(wsError);
      }
    },
    [lavinth]
  );
  const checkProgram = (0, import_react7.useCallback)(
    async (programId) => {
      try {
        return await lavinth.checkProgram(programId);
      } catch (err) {
        const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "PROGRAMS_ERROR");
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );
  const fetchVerifiedPrograms = (0, import_react7.useCallback)(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await lavinth.getVerifiedPrograms();
      setVerifiedPrograms(result);
      return result;
    } catch (err) {
      const wsError = err instanceof import_sdk7.LavinthError ? err : new import_sdk7.LavinthError(err.message, "PROGRAMS_ERROR");
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [lavinth]);
  (0, import_react7.useEffect)(() => {
    if (autoFetchHistory && walletAddress) {
      fetchHistory(walletAddress);
    }
  }, [autoFetchHistory, walletAddress, fetchHistory]);
  (0, import_react7.useEffect)(() => {
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
    clearError
  };
}

// src/components/SecurityAlertBanner.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var defaultStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%"
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px"
  },
  critical: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b"
  },
  high: {
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412"
  },
  medium: {
    backgroundColor: "#fefce8",
    border: "1px solid #fef08a",
    color: "#854d0e"
  },
  low: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534"
  }
};
var severityIcons = {
  critical: "\u{1F6A8}",
  high: "\u26A0\uFE0F",
  medium: "\u26A1",
  low: "\u2139\uFE0F"
};
function SecurityAlertBanner({
  alerts,
  onDismiss,
  onAction,
  maxVisible = 5,
  className,
  styles = {}
}) {
  if (!alerts || alerts.length === 0) {
    return null;
  }
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;
  const mergedStyles = {
    ...defaultStyles,
    ...styles
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className,
      style: mergedStyles.container,
      role: "alert",
      "aria-live": "polite",
      children: [
        visibleAlerts.map((alert) => {
          const severityStyle = mergedStyles[alert.severity] || mergedStyles.medium;
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "div",
            {
              style: {
                ...mergedStyles.alert,
                ...severityStyle
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: "8px", flex: 1 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { role: "img", "aria-label": alert.severity, children: severityIcons[alert.severity] || "\u26A1" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontWeight: 600, marginBottom: "4px" }, children: alert.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "14px", opacity: 0.9 }, children: alert.description }),
                    alert.suggestedAction && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { marginTop: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "button",
                      {
                        onClick: () => onAction?.(alert.alertId, alert.suggestedAction),
                        style: {
                          padding: "6px 12px",
                          borderRadius: "4px",
                          border: "none",
                          backgroundColor: "rgba(0,0,0,0.1)",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 500
                        },
                        children: alert.suggestedAction
                      }
                    ) })
                  ] })
                ] }),
                onDismiss && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    onClick: () => onDismiss(alert.alertId),
                    style: {
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      fontSize: "18px",
                      opacity: 0.6
                    },
                    "aria-label": "Dismiss alert",
                    children: "\xD7"
                  }
                )
              ]
            },
            alert.alertId
          );
        }),
        hiddenCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            style: {
              textAlign: "center",
              padding: "8px",
              fontSize: "14px",
              color: "#6b7280"
            },
            children: [
              "+",
              hiddenCount,
              " more alert",
              hiddenCount > 1 ? "s" : ""
            ]
          }
        )
      ]
    }
  );
}

// src/components/EmergencyRecoveryModal.tsx
var import_react8 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function EmergencyRecoveryModal({
  isOpen,
  onClose,
  walletAddress,
  highRiskApprovals,
  onRevoke,
  onSignTransaction,
  className
}) {
  const [step, setStep] = (0, import_react8.useState)("warning");
  const [isProcessing, setIsProcessing] = (0, import_react8.useState)(false);
  const [transactions, setTransactions] = (0, import_react8.useState)([]);
  const [signedCount, setSignedCount] = (0, import_react8.useState)(0);
  const [error, setError] = (0, import_react8.useState)(null);
  const handleProceed = (0, import_react8.useCallback)(async () => {
    if (step === "warning") {
      setStep("review");
      return;
    }
    if (step === "review") {
      setIsProcessing(true);
      setError(null);
      try {
        const result = await onRevoke(highRiskApprovals);
        if (result) {
          setTransactions(result.transactions);
          setStep("signing");
        } else {
          setError("Failed to create revocation transactions");
        }
      } catch (err) {
        setError(err.message || "Failed to create revocation transactions");
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    if (step === "signing" && onSignTransaction) {
      setIsProcessing(true);
      setError(null);
      try {
        for (let i = signedCount; i < transactions.length; i++) {
          await onSignTransaction(transactions[i]);
          setSignedCount(i + 1);
        }
        setStep("complete");
      } catch (err) {
        setError(err.message || "Transaction signing failed");
      } finally {
        setIsProcessing(false);
      }
    }
  }, [step, highRiskApprovals, onRevoke, onSignTransaction, transactions, signedCount]);
  const handleClose = (0, import_react8.useCallback)(() => {
    setStep("warning");
    setTransactions([]);
    setSignedCount(0);
    setError(null);
    onClose();
  }, [onClose]);
  if (!isOpen) {
    return null;
  }
  const modalStyles = {
    overlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    },
    modal: {
      backgroundColor: "#1f2937",
      borderRadius: "12px",
      maxWidth: "500px",
      width: "90%",
      maxHeight: "90vh",
      overflow: "auto",
      color: "white"
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #374151",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    },
    title: {
      fontSize: "20px",
      fontWeight: 600,
      color: "#ef4444",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    },
    body: {
      padding: "24px"
    },
    footer: {
      padding: "16px 24px",
      borderTop: "1px solid #374151",
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end"
    },
    button: {
      padding: "10px 20px",
      borderRadius: "6px",
      fontWeight: 500,
      cursor: "pointer",
      fontSize: "14px",
      border: "none"
    },
    primaryButton: {
      backgroundColor: "#ef4444",
      color: "white"
    },
    secondaryButton: {
      backgroundColor: "#374151",
      color: "white"
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed"
    },
    errorBox: {
      backgroundColor: "#7f1d1d",
      border: "1px solid #991b1b",
      borderRadius: "6px",
      padding: "12px",
      marginTop: "16px"
    },
    approvalItem: {
      backgroundColor: "#374151",
      borderRadius: "6px",
      padding: "12px",
      marginBottom: "8px"
    },
    progress: {
      height: "8px",
      backgroundColor: "#374151",
      borderRadius: "4px",
      overflow: "hidden",
      marginTop: "16px"
    },
    progressBar: {
      height: "100%",
      backgroundColor: "#10b981",
      transition: "width 0.3s ease"
    }
  };
  const renderStep = () => {
    switch (step) {
      case "warning":
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { textAlign: "center", marginBottom: "24px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u{1F6A8}" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: "Emergency Recovery Mode" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: "This will revoke all high-risk token approvals to protect your wallet." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              style: {
                backgroundColor: "#7f1d1d",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { style: { fontWeight: 500, marginBottom: "8px" }, children: [
                  highRiskApprovals.length,
                  " dangerous approval",
                  highRiskApprovals.length !== 1 ? "s" : "",
                  " detected"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { fontSize: "14px", color: "#fca5a5" }, children: "These approvals allow third parties to spend your tokens without limit." })
              ]
            }
          )
        ] });
      case "review":
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { marginBottom: "16px", color: "#9ca3af" }, children: "The following approvals will be revoked:" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { maxHeight: "300px", overflow: "auto" }, children: highRiskApprovals.map((approval, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: modalStyles.approvalItem, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { fontWeight: 500 }, children: approval.tokenSymbol }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "span",
                {
                  style: {
                    color: approval.riskLevel === "critical" ? "#ef4444" : "#f59e0b",
                    fontSize: "12px",
                    textTransform: "uppercase"
                  },
                  children: approval.riskLevel
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { fontSize: "12px", color: "#9ca3af", marginTop: "4px" }, children: [
              "Spender: ",
              approval.spenderAddress.slice(0, 8),
              "...",
              approval.spenderAddress.slice(-6)
            ] }),
            approval.isUnlimited && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: "12px", color: "#ef4444", marginTop: "4px" }, children: "Unlimited approval" })
          ] }, index)) })
        ] });
      case "signing":
        const progress = transactions.length > 0 ? signedCount / transactions.length * 100 : 0;
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { textAlign: "center", marginBottom: "24px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: isProcessing ? "\u23F3" : "\u270D\uFE0F" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: isProcessing ? "Processing..." : "Sign Transactions" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: [
              signedCount,
              " of ",
              transactions.length,
              " transactions signed"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: modalStyles.progress, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              style: {
                ...modalStyles.progressBar,
                width: `${progress}%`
              }
            }
          ) })
        ] });
      case "complete":
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u2705" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: "Recovery Complete" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: "All dangerous approvals have been revoked. Your wallet is now safer." }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              style: {
                backgroundColor: "#064e3b",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "24px"
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { style: { fontWeight: 500 }, children: [
                highRiskApprovals.length,
                " approval",
                highRiskApprovals.length !== 1 ? "s" : "",
                " revoked"
              ] })
            }
          )
        ] });
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: modalStyles.overlay, className, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: modalStyles.modal, role: "dialog", "aria-modal": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: modalStyles.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: modalStyles.title, children: "\u{1F6A8} Emergency Recovery" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          onClick: handleClose,
          style: {
            background: "none",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: "24px"
          },
          "aria-label": "Close",
          children: "\xD7"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: modalStyles.body, children: [
      renderStep(),
      error && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: modalStyles.errorBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Error:" }),
        " ",
        error
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: modalStyles.footer, children: [
      step !== "complete" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          onClick: handleClose,
          style: { ...modalStyles.button, ...modalStyles.secondaryButton },
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          onClick: step === "complete" ? handleClose : handleProceed,
          disabled: isProcessing,
          style: {
            ...modalStyles.button,
            ...modalStyles.primaryButton,
            ...isProcessing ? modalStyles.disabledButton : {}
          },
          children: [
            step === "warning" && "Continue",
            step === "review" && "Revoke All",
            step === "signing" && (isProcessing ? "Signing..." : "Sign Transactions"),
            step === "complete" && "Done"
          ]
        }
      )
    ] })
  ] }) });
}

// src/components/ApprovalsList.tsx
var import_react9 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var riskColors = {
  critical: { bg: "#7f1d1d", text: "#fecaca", border: "#991b1b" },
  high: { bg: "#7c2d12", text: "#fed7aa", border: "#9a3412" },
  medium: { bg: "#713f12", text: "#fef08a", border: "#854d0e" },
  low: { bg: "#14532d", text: "#bbf7d0", border: "#166534" }
};
var defaultStyles2 = {
  container: {
    backgroundColor: "#1f2937",
    borderRadius: "12px",
    overflow: "hidden"
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #374151",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  item: {
    padding: "16px 20px",
    borderBottom: "1px solid #374151",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  }
};
function ApprovalsList({
  approvals,
  isLoading = false,
  onRevoke,
  onRevokeSelected,
  showRiskBadge = true,
  selectable = false,
  className,
  styles = {}
}) {
  const [selectedIds, setSelectedIds] = (0, import_react9.useState)(/* @__PURE__ */ new Set());
  const [revokingId, setRevokingId] = (0, import_react9.useState)(null);
  const [isRevokingBatch, setIsRevokingBatch] = (0, import_react9.useState)(false);
  const mergedStyles = {
    ...defaultStyles2,
    ...styles
  };
  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(/* @__PURE__ */ new Set());
    } else {
      setSelectedIds(new Set(approvals.map((a) => a.tokenAddress + a.spenderAddress)));
    }
  };
  const handleRevoke = async (approval) => {
    if (!onRevoke) return;
    const id = approval.tokenAddress + approval.spenderAddress;
    setRevokingId(id);
    try {
      await onRevoke(approval);
    } finally {
      setRevokingId(null);
    }
  };
  const handleRevokeSelected = async () => {
    if (!onRevokeSelected) return;
    const selected = approvals.filter(
      (a) => selectedIds.has(a.tokenAddress + a.spenderAddress)
    );
    setIsRevokingBatch(true);
    try {
      await onRevokeSelected(selected);
      setSelectedIds(/* @__PURE__ */ new Set());
    } finally {
      setIsRevokingBatch(false);
    }
  };
  const formatAmount = (approval) => {
    if (approval.isUnlimited) return "Unlimited";
    if (approval.amount === void 0) return "Unknown";
    return approval.amount.toLocaleString();
  };
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: mergedStyles.container, className, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { padding: "40px", textAlign: "center", color: "#9ca3af" }, children: "Loading approvals..." }) });
  }
  if (approvals.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: mergedStyles.container, className, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { padding: "40px", textAlign: "center", color: "#9ca3af" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u2705" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "No token approvals found" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: { fontSize: "14px", marginTop: "8px" }, children: "Your wallet has no active token approvals" })
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: mergedStyles.container, className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: mergedStyles.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "12px" }, children: [
        selectable && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            type: "checkbox",
            checked: selectedIds.size === approvals.length,
            onChange: selectAll,
            style: { width: "18px", height: "18px", cursor: "pointer" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { color: "white", fontWeight: 600 }, children: [
          "Token Approvals (",
          approvals.length,
          ")"
        ] })
      ] }),
      selectable && selectedIds.size > 0 && onRevokeSelected && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          onClick: handleRevokeSelected,
          disabled: isRevokingBatch,
          style: {
            padding: "8px 16px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isRevokingBatch ? "not-allowed" : "pointer",
            opacity: isRevokingBatch ? 0.5 : 1,
            fontSize: "14px",
            fontWeight: 500
          },
          children: isRevokingBatch ? "Revoking..." : `Revoke Selected (${selectedIds.size})`
        }
      )
    ] }),
    approvals.map((approval) => {
      const id = approval.tokenAddress + approval.spenderAddress;
      const isSelected = selectedIds.has(id);
      const isRevoking = revokingId === id;
      const riskStyle = riskColors[approval.riskLevel] || riskColors.medium;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "div",
        {
          style: {
            ...mergedStyles.item,
            backgroundColor: isSelected ? "#374151" : "transparent"
          },
          children: [
            selectable && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "input",
              {
                type: "checkbox",
                checked: isSelected,
                onChange: () => toggleSelection(id),
                style: { width: "18px", height: "18px", cursor: "pointer" }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { color: "white", fontWeight: 500 }, children: approval.tokenSymbol || "Unknown Token" }),
                showRiskBadge && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "span",
                  {
                    style: {
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      backgroundColor: riskStyle.bg,
                      color: riskStyle.text,
                      border: `1px solid ${riskStyle.border}`
                    },
                    children: approval.riskLevel
                  }
                ),
                approval.isUnlimited && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "span",
                  {
                    style: {
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "#7f1d1d",
                      color: "#fecaca"
                    },
                    children: "UNLIMITED"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "16px",
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#9ca3af"
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
                      "Amount: ",
                      formatAmount(approval)
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
                      "Spender: ",
                      formatAddress(approval.spenderAddress)
                    ] }),
                    approval.spenderLabel && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                      "span",
                      {
                        style: {
                          color: approval.isVerifiedSpender ? "#10b981" : "#f59e0b"
                        },
                        children: approval.spenderLabel
                      }
                    )
                  ]
                }
              )
            ] }),
            onRevoke && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                onClick: () => handleRevoke(approval),
                disabled: isRevoking,
                style: {
                  padding: "8px 16px",
                  backgroundColor: "#374151",
                  color: "#ef4444",
                  border: "1px solid #4b5563",
                  borderRadius: "6px",
                  cursor: isRevoking ? "not-allowed" : "pointer",
                  opacity: isRevoking ? 0.5 : 1,
                  fontSize: "13px",
                  fontWeight: 500
                },
                children: isRevoking ? "Revoking..." : "Revoke"
              }
            )
          ]
        },
        id
      );
    })
  ] });
}

// src/components/FundTraceViewer.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var statusColors = {
  in_progress: { bg: "#1e3a5f", text: "#60a5fa" },
  completed: { bg: "#14532d", text: "#86efac" },
  stalled: { bg: "#713f12", text: "#fcd34d" },
  recovered: { bg: "#064e3b", text: "#6ee7b7" }
};
var hopTypeIcons = {
  wallet: "\u{1F45B}",
  exchange: "\u{1F3E6}",
  dex: "\u{1F504}",
  bridge: "\u{1F309}",
  mixer: "\u{1F300}",
  contract: "\u{1F4C4}"
};
function FundTraceViewer({
  trace,
  report,
  isLoading = false,
  onRequestFreeze,
  onGenerateReport,
  className
}) {
  const containerStyle = {
    backgroundColor: "#1f2937",
    borderRadius: "12px",
    overflow: "hidden",
    color: "white"
  };
  const headerStyle = {
    padding: "20px",
    borderBottom: "1px solid #374151"
  };
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: containerStyle, className, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { padding: "60px", textAlign: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: "48px", marginBottom: "16px", animation: "spin 2s linear infinite" }, children: "\u{1F50D}" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { color: "#9ca3af" }, children: "Tracing funds through the blockchain..." })
    ] }) });
  }
  if (!trace) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: containerStyle, className, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { padding: "60px", textAlign: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u{1F50E}" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { color: "#9ca3af" }, children: "No trace data available" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { color: "#6b7280", fontSize: "14px", marginTop: "8px" }, children: "Start a new trace to track stolen funds" })
    ] }) });
  }
  const status = statusColors[trace.status] || statusColors.in_progress;
  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatAmount = (amount) => amount.toLocaleString(void 0, { maximumFractionDigits: 4 });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: containerStyle, className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: headerStyle, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: "Fund Trace" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: [
            "Trace ID: ",
            trace.traceId.slice(0, 12),
            "..."
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { textAlign: "right" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "span",
          {
            style: {
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              backgroundColor: status.bg,
              color: status.text
            },
            children: trace.status.replace("_", " ")
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginTop: "20px",
            padding: "16px",
            backgroundColor: "#111827",
            borderRadius: "8px"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }, children: "Total Stolen" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontSize: "20px", fontWeight: 600, color: "#ef4444" }, children: [
                formatAmount(trace.totalAmount),
                " ",
                trace.tokenSymbol || "SOL"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }, children: "Recovered" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontSize: "20px", fontWeight: 600, color: "#10b981" }, children: [
                formatAmount(trace.recoveredAmount || 0),
                " ",
                trace.tokenSymbol || "SOL"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }, children: "Hops Traced" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: "20px", fontWeight: 600 }, children: trace.hops.length })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { padding: "20px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h4", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#9ca3af" }, children: "FUND FLOW" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "div",
          {
            style: {
              position: "absolute",
              left: "20px",
              top: "20px",
              bottom: "20px",
              width: "2px",
              backgroundColor: "#374151"
            }
          }
        ),
        trace.hops.map((hop, index) => {
          const isExchange = hop.entityType === "exchange";
          const icon = hopTypeIcons[hop.entityType] || "\u{1F4CD}";
          return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
            "div",
            {
              style: {
                display: "flex",
                gap: "16px",
                marginBottom: index < trace.hops.length - 1 ? "24px" : 0,
                position: "relative"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                  "div",
                  {
                    style: {
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: isExchange ? "#064e3b" : "#374151",
                      border: isExchange ? "2px solid #10b981" : "2px solid #4b5563",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      zIndex: 1,
                      flexShrink: 0
                    },
                    children: icon
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
                  "div",
                  {
                    style: {
                      flex: 1,
                      backgroundColor: "#111827",
                      borderRadius: "8px",
                      padding: "16px",
                      border: isExchange ? "1px solid #10b981" : "1px solid #374151"
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { fontWeight: 500 }, children: hop.entityLabel || formatAddress(hop.address) }),
                            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                              "span",
                              {
                                style: {
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  backgroundColor: "#374151",
                                  color: "#9ca3af"
                                },
                                children: hop.entityType
                              }
                            )
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: "13px", color: "#6b7280", marginTop: "4px" }, children: formatAddress(hop.address) })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { textAlign: "right" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontWeight: 600 }, children: [
                            formatAmount(hop.amount),
                            " ",
                            trace.tokenSymbol || "SOL"
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: "12px", color: "#6b7280", marginTop: "2px" }, children: new Date(hop.timestamp).toLocaleString() })
                        ] })
                      ] }),
                      hop.transactionSignature && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { marginTop: "12px", fontSize: "12px", color: "#6b7280" }, children: [
                        "TX: ",
                        hop.transactionSignature.slice(0, 20),
                        "..."
                      ] }),
                      isExchange && onRequestFreeze && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                        "button",
                        {
                          onClick: () => onRequestFreeze(hop),
                          style: {
                            marginTop: "12px",
                            padding: "8px 16px",
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500
                          },
                          children: "Request Freeze"
                        }
                      )
                    ]
                  }
                )
              ]
            },
            index
          );
        })
      ] })
    ] }),
    report && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { padding: "20px", borderTop: "1px solid #374151" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h4", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#9ca3af" }, children: "RECOVERY ANALYSIS" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "div",
        {
          style: {
            backgroundColor: "#111827",
            borderRadius: "8px",
            padding: "16px"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { color: "#9ca3af" }, children: "Recovery Probability" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
                "span",
                {
                  style: {
                    fontSize: "24px",
                    fontWeight: 700,
                    color: report.recoveryProbability >= 50 ? "#10b981" : report.recoveryProbability >= 25 ? "#f59e0b" : "#ef4444"
                  },
                  children: [
                    report.recoveryProbability,
                    "%"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "div",
              {
                style: {
                  height: "8px",
                  backgroundColor: "#374151",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "16px"
                },
                children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                  "div",
                  {
                    style: {
                      height: "100%",
                      width: `${report.recoveryProbability}%`,
                      backgroundColor: report.recoveryProbability >= 50 ? "#10b981" : report.recoveryProbability >= 25 ? "#f59e0b" : "#ef4444"
                    }
                  }
                )
              }
            ),
            report.recommendations && report.recommendations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { fontSize: "13px", fontWeight: 500, marginBottom: "8px" }, children: "Recommendations:" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("ul", { style: { margin: 0, paddingLeft: "20px", color: "#9ca3af", fontSize: "13px" }, children: report.recommendations.slice(0, 3).map((rec, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("li", { style: { marginBottom: "4px" }, children: rec.action }, i)) })
            ] })
          ]
        }
      )
    ] }),
    onGenerateReport && !report && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { padding: "20px", borderTop: "1px solid #374151" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "button",
      {
        onClick: onGenerateReport,
        style: {
          width: "100%",
          padding: "12px",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 500
        },
        children: "Generate Recovery Report"
      }
    ) })
  ] });
}

// src/components/RecoveryWizard.tsx
var import_react10 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
var steps = [
  { id: "intro", title: "Overview" },
  { id: "new-wallet", title: "New Wallet" },
  { id: "review-assets", title: "Review Assets" },
  { id: "transfer", title: "Transfer" },
  { id: "security", title: "Security" },
  { id: "complete", title: "Complete" }
];
function RecoveryWizard({
  compromisedWallet,
  onCreateNewWallet,
  onTransferAssets,
  onComplete,
  assets = [],
  className
}) {
  const [currentStep, setCurrentStep] = (0, import_react10.useState)("intro");
  const [newWalletAddress, setNewWalletAddress] = (0, import_react10.useState)("");
  const [selectedAssets, setSelectedAssets] = (0, import_react10.useState)(
    new Set(assets.filter((a) => a.isSafe).map((a) => a.tokenAddress))
  );
  const [isProcessing, setIsProcessing] = (0, import_react10.useState)(false);
  const [error, setError] = (0, import_react10.useState)(null);
  const [securityChecklist, setSecurityChecklist] = (0, import_react10.useState)({
    revokedApprovals: false,
    changedPasswords: false,
    scannedDevice: false,
    enabledHardwareWallet: false
  });
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const safeAssets = assets.filter((a) => a.isSafe);
  const unsafeAssets = assets.filter((a) => !a.isSafe);
  const handleNext = (0, import_react10.useCallback)(async () => {
    setError(null);
    switch (currentStep) {
      case "intro":
        setCurrentStep("new-wallet");
        break;
      case "new-wallet":
        if (!newWalletAddress && onCreateNewWallet) {
          setIsProcessing(true);
          try {
            const addr = await onCreateNewWallet();
            setNewWalletAddress(addr);
          } catch (err) {
            setError(err.message || "Failed to create new wallet");
            return;
          } finally {
            setIsProcessing(false);
          }
        }
        setCurrentStep("review-assets");
        break;
      case "review-assets":
        setCurrentStep("transfer");
        break;
      case "transfer":
        if (onTransferAssets && selectedAssets.size > 0) {
          setIsProcessing(true);
          try {
            const assetsToTransfer = assets.filter(
              (a) => selectedAssets.has(a.tokenAddress)
            );
            await onTransferAssets(compromisedWallet, newWalletAddress, assetsToTransfer);
          } catch (err) {
            setError(err.message || "Failed to transfer assets");
            return;
          } finally {
            setIsProcessing(false);
          }
        }
        setCurrentStep("security");
        break;
      case "security":
        setCurrentStep("complete");
        break;
      case "complete":
        onComplete?.(newWalletAddress);
        break;
    }
  }, [
    currentStep,
    newWalletAddress,
    onCreateNewWallet,
    onTransferAssets,
    selectedAssets,
    assets,
    compromisedWallet,
    onComplete
  ]);
  const handleBack = (0, import_react10.useCallback)(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  }, [currentStepIndex]);
  const toggleAsset = (tokenAddress) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(tokenAddress)) {
        next.delete(tokenAddress);
      } else {
        next.add(tokenAddress);
      }
      return next;
    });
  };
  const toggleSecurityItem = (key) => {
    setSecurityChecklist((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const styles = {
    container: {
      backgroundColor: "#1f2937",
      borderRadius: "12px",
      overflow: "hidden",
      color: "white",
      maxWidth: "600px"
    },
    header: {
      padding: "24px",
      borderBottom: "1px solid #374151"
    },
    progress: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "20px"
    },
    progressStep: {
      flex: 1,
      textAlign: "center",
      position: "relative"
    },
    progressDot: {
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      margin: "0 auto 8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: 600
    },
    progressLabel: {
      fontSize: "11px",
      color: "#9ca3af"
    },
    body: {
      padding: "32px 24px"
    },
    footer: {
      padding: "16px 24px",
      borderTop: "1px solid #374151",
      display: "flex",
      justifyContent: "space-between"
    },
    button: {
      padding: "12px 24px",
      borderRadius: "8px",
      fontWeight: 500,
      cursor: "pointer",
      fontSize: "14px",
      border: "none"
    },
    primaryButton: {
      backgroundColor: "#3b82f6",
      color: "white"
    },
    secondaryButton: {
      backgroundColor: "#374151",
      color: "white"
    },
    assetItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px",
      backgroundColor: "#111827",
      borderRadius: "8px",
      marginBottom: "8px"
    },
    checklistItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px",
      backgroundColor: "#111827",
      borderRadius: "8px",
      marginBottom: "8px",
      cursor: "pointer"
    },
    errorBox: {
      backgroundColor: "#7f1d1d",
      border: "1px solid #991b1b",
      borderRadius: "8px",
      padding: "12px",
      marginTop: "16px"
    }
  };
  const formatAddress = (addr) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  const renderStep = () => {
    switch (currentStep) {
      case "intro":
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "64px", marginBottom: "24px" }, children: "\u{1F6E1}\uFE0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { fontSize: "24px", fontWeight: 600, marginBottom: "16px" }, children: "Wallet Recovery Wizard" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#9ca3af", marginBottom: "24px", lineHeight: 1.6 }, children: "This wizard will guide you through creating a new secure wallet and safely migrating your assets from the compromised wallet." }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              style: {
                backgroundColor: "#7f1d1d",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "left"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontWeight: 500, marginBottom: "8px" }, children: "\u26A0\uFE0F Compromised Wallet" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { style: { fontSize: "14px", color: "#fca5a5" }, children: formatAddress(compromisedWallet) })
              ]
            }
          )
        ] });
      case "new-wallet":
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: "Create New Wallet" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Create a new wallet to safely receive your assets. We recommend using a hardware wallet for maximum security." }),
          newWalletAddress ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              style: {
                backgroundColor: "#064e3b",
                borderRadius: "8px",
                padding: "20px"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontSize: "24px" }, children: "\u2705" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontWeight: 500 }, children: "New Wallet Created" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { style: { fontSize: "14px", color: "#86efac" }, children: newWalletAddress })
              ]
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "12px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "input",
              {
                type: "text",
                placeholder: "Enter new wallet address or create one",
                value: newWalletAddress,
                onChange: (e) => setNewWalletAddress(e.target.value),
                style: {
                  padding: "16px",
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px"
                }
              }
            ),
            onCreateNewWallet && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "button",
              {
                onClick: async () => {
                  setIsProcessing(true);
                  try {
                    const addr = await onCreateNewWallet();
                    setNewWalletAddress(addr);
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setIsProcessing(false);
                  }
                },
                disabled: isProcessing,
                style: {
                  ...styles.button,
                  ...styles.secondaryButton,
                  opacity: isProcessing ? 0.5 : 1
                },
                children: isProcessing ? "Creating..." : "+ Create New Wallet"
              }
            )
          ] })
        ] });
      case "review-assets":
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: "Review Assets" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Select the assets you want to transfer to your new wallet. Potentially malicious tokens are marked for your safety." }),
          safeAssets.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { marginBottom: "24px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontSize: "13px", fontWeight: 500, color: "#10b981", marginBottom: "12px" }, children: [
              "\u2705 SAFE ASSETS (",
              safeAssets.length,
              ")"
            ] }),
            safeAssets.map((asset) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "div",
              {
                style: styles.assetItem,
                onClick: () => toggleAsset(asset.tokenAddress),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                    "input",
                    {
                      type: "checkbox",
                      checked: selectedAssets.has(asset.tokenAddress),
                      onChange: () => toggleAsset(asset.tokenAddress),
                      style: { width: "18px", height: "18px" }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontWeight: 500 }, children: asset.tokenSymbol }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontSize: "13px", color: "#9ca3af" }, children: [
                      asset.amount.toLocaleString(),
                      asset.usdValue && ` ($${asset.usdValue.toFixed(2)})`
                    ] })
                  ] })
                ]
              },
              asset.tokenAddress
            ))
          ] }),
          unsafeAssets.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontSize: "13px", fontWeight: 500, color: "#ef4444", marginBottom: "12px" }, children: [
              "\u26A0\uFE0F POTENTIALLY MALICIOUS (",
              unsafeAssets.length,
              ")"
            ] }),
            unsafeAssets.map((asset) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "div",
              {
                style: {
                  ...styles.assetItem,
                  opacity: 0.6,
                  border: "1px solid #7f1d1d"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontSize: "20px" }, children: "\u{1F6AB}" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontWeight: 500 }, children: asset.tokenSymbol }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "13px", color: "#fca5a5" }, children: "Not recommended for transfer" })
                  ] })
                ]
              },
              asset.tokenAddress
            ))
          ] })
        ] });
      case "transfer":
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "64px", marginBottom: "24px" }, children: isProcessing ? "\u23F3" : "\u{1F4E6}" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: isProcessing ? "Transferring Assets..." : "Ready to Transfer" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: [
            selectedAssets.size,
            " asset",
            selectedAssets.size !== 1 ? "s" : "",
            " will be transferred to your new wallet."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "div",
            {
              style: {
                backgroundColor: "#111827",
                borderRadius: "8px",
                padding: "20px"
              },
              children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }, children: "From" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { style: { fontSize: "13px" }, children: formatAddress(compromisedWallet) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontSize: "24px" }, children: "\u2192" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }, children: "To" }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { style: { fontSize: "13px", color: "#10b981" }, children: formatAddress(newWalletAddress) })
                ] })
              ] })
            }
          )
        ] });
      case "security":
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: "Security Checklist" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Complete these security steps to protect your new wallet." }),
          [
            { key: "revokedApprovals", label: "Revoked all token approvals on compromised wallet" },
            { key: "changedPasswords", label: "Changed passwords on related accounts" },
            { key: "scannedDevice", label: "Scanned device for malware" },
            { key: "enabledHardwareWallet", label: "Consider using a hardware wallet" }
          ].map(({ key, label }) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              style: styles.checklistItem,
              onClick: () => toggleSecurityItem(key),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: securityChecklist[key],
                    onChange: () => toggleSecurityItem(key),
                    style: { width: "20px", height: "20px" }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: label })
              ]
            },
            key
          ))
        ] });
      case "complete":
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "64px", marginBottom: "24px" }, children: "\u{1F389}" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { fontSize: "24px", fontWeight: 600, marginBottom: "16px" }, children: "Recovery Complete!" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Your assets have been safely transferred to your new wallet." }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              style: {
                backgroundColor: "#064e3b",
                borderRadius: "8px",
                padding: "20px"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "14px", color: "#86efac", marginBottom: "8px" }, children: "New Wallet Address" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("code", { style: { fontSize: "16px", fontWeight: 500 }, children: newWalletAddress })
              ]
            }
          )
        ] });
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: styles.container, className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: styles.header, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: styles.progress, children: steps.map((step, index) => {
      const isActive = index === currentStepIndex;
      const isComplete = index < currentStepIndex;
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: styles.progressStep, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "div",
          {
            style: {
              ...styles.progressDot,
              backgroundColor: isComplete ? "#10b981" : isActive ? "#3b82f6" : "#374151",
              color: isComplete || isActive ? "white" : "#6b7280"
            },
            children: isComplete ? "\u2713" : index + 1
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "div",
          {
            style: {
              ...styles.progressLabel,
              color: isActive ? "white" : "#6b7280",
              fontWeight: isActive ? 500 : 400
            },
            children: step.title
          }
        )
      ] }, step.id);
    }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: styles.body, children: [
      renderStep(),
      error && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: styles.errorBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: "Error:" }),
        " ",
        error
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: styles.footer, children: [
      currentStepIndex > 0 && currentStep !== "complete" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "button",
        {
          onClick: handleBack,
          style: { ...styles.button, ...styles.secondaryButton },
          disabled: isProcessing,
          children: "Back"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", {}),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "button",
        {
          onClick: handleNext,
          style: {
            ...styles.button,
            ...styles.primaryButton,
            opacity: isProcessing ? 0.5 : 1
          },
          disabled: isProcessing || currentStep === "new-wallet" && !newWalletAddress,
          children: currentStep === "complete" ? "Done" : currentStep === "transfer" ? isProcessing ? "Transferring..." : "Transfer Assets" : "Continue"
        }
      )
    ] })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApprovalsList,
  EmergencyRecoveryModal,
  FundTraceViewer,
  LavinthProvider,
  RecoveryWizard,
  SecurityAlertBanner,
  useApprovals,
  useCompromiseDetection,
  useFreezeRequests,
  useFundTracing,
  useLavinth,
  useLavinthContext,
  useSecurityProfile,
  useSimulation
});
