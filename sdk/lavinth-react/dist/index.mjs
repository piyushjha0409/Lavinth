// src/context.tsx
import { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
import {
  Lavinth
} from "@lavinth/sdk";
import { jsx } from "react/jsx-runtime";
var LavinthContext = createContext(null);
function LavinthProvider({
  config,
  children,
  onEvent
}) {
  const [alerts, setAlerts] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const sdk = useMemo(() => {
    try {
      const instance = new Lavinth({
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
  useEffect(() => {
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
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);
  const value = useMemo(
    () => ({
      sdk,
      isInitialized,
      alerts,
      clearAlerts
    }),
    [sdk, isInitialized, alerts, clearAlerts]
  );
  return /* @__PURE__ */ jsx(LavinthContext.Provider, { value, children });
}
function useLavinthContext() {
  const context = useContext(LavinthContext);
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
import { useState as useState2, useCallback as useCallback2, useEffect as useEffect2 } from "react";
import { LavinthError } from "@lavinth/sdk";
function useSecurityProfile(options = {}) {
  const { walletAddress, autoScan = false, refreshInterval } = options;
  const shield = useLavinth();
  const [profile, setProfile] = useState2(null);
  const [isLoading, setIsLoading] = useState2(false);
  const [error, setError] = useState2(null);
  const scan = useCallback2(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new LavinthError("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError ? err : new LavinthError(err.message, "SCAN_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const refresh = useCallback2(async () => {
    if (walletAddress) {
      await scan(walletAddress);
    }
  }, [scan, walletAddress]);
  useEffect2(() => {
    if (autoScan && walletAddress) {
      scan(walletAddress);
    }
  }, [autoScan, walletAddress, scan]);
  useEffect2(() => {
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
import { useState as useState3, useCallback as useCallback3, useEffect as useEffect3 } from "react";
import {
  LavinthError as LavinthError2
} from "@lavinth/sdk";
function useCompromiseDetection(options = {}) {
  const { walletAddress, autoAnalyze = false, monitorInterval } = options;
  const shield = useLavinth();
  const { alerts: contextAlerts } = useLavinthContext();
  const [analysis, setAnalysis] = useState3(null);
  const [isLoading, setIsLoading] = useState3(false);
  const [error, setError] = useState3(null);
  const analyze = useCallback3(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new LavinthError2("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError2 ? err : new LavinthError2(err.message, "ANALYSIS_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const acknowledgeAlert = useCallback3(
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
  useEffect3(() => {
    if (autoAnalyze && walletAddress) {
      analyze(walletAddress);
    }
  }, [autoAnalyze, walletAddress, analyze]);
  useEffect3(() => {
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
import { useState as useState4, useCallback as useCallback4, useEffect as useEffect4 } from "react";
import {
  LavinthError as LavinthError3
} from "@lavinth/sdk";
function useApprovals(options = {}) {
  const { walletAddress, autoFetch = false } = options;
  const shield = useLavinth();
  const [approvals, setApprovals] = useState4([]);
  const [isLoading, setIsLoading] = useState4(false);
  const [error, setError] = useState4(null);
  const fetchApprovals = useCallback4(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new LavinthError3("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError3 ? err : new LavinthError3(err.message, "APPROVALS_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const createRevocationPlan = useCallback4(async () => {
    if (!walletAddress) {
      setError(
        new LavinthError3("Wallet address is required", "INVALID_INPUT")
      );
      return null;
    }
    try {
      return await shield.createRevocationPlan(walletAddress);
    } catch (err) {
      const wsError = err instanceof LavinthError3 ? err : new LavinthError3(err.message, "REVOCATION_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);
  const buildRevocationTransactions = useCallback4(async () => {
    if (!walletAddress) {
      setError(
        new LavinthError3("Wallet address is required", "INVALID_INPUT")
      );
      return null;
    }
    try {
      return await shield.buildRevocationTransactions(walletAddress);
    } catch (err) {
      const wsError = err instanceof LavinthError3 ? err : new LavinthError3(err.message, "REVOCATION_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);
  const emergencyRevoke = useCallback4(async () => {
    if (!walletAddress) {
      setError(
        new LavinthError3("Wallet address is required", "INVALID_INPUT")
      );
      return null;
    }
    try {
      return await shield.emergencyRevoke(walletAddress);
    } catch (err) {
      const wsError = err instanceof LavinthError3 ? err : new LavinthError3(err.message, "REVOCATION_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield, walletAddress]);
  useEffect4(() => {
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
import { useState as useState5, useCallback as useCallback5 } from "react";
import {
  LavinthError as LavinthError4
} from "@lavinth/sdk";
function useFundTracing(options = {}) {
  const { walletAddress } = options;
  const shield = useLavinth();
  const [traces, setTraces] = useState5([]);
  const [currentTrace, setCurrentTrace] = useState5(null);
  const [report, setReport] = useState5(null);
  const [isLoading, setIsLoading] = useState5(false);
  const [isTracing, setIsTracing] = useState5(false);
  const [error, setError] = useState5(null);
  const startTrace = useCallback5(
    async (sourceWallet, amount, tokenMint) => {
      setIsTracing(true);
      setError(null);
      try {
        const trace = await shield.startFundTrace(sourceWallet, amount, tokenMint);
        setCurrentTrace(trace);
        setTraces((prev) => [...prev, trace]);
        return trace;
      } catch (err) {
        const wsError = err instanceof LavinthError4 ? err : new LavinthError4(err.message, "TRACE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsTracing(false);
      }
    },
    [shield]
  );
  const getTrace = useCallback5(
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
        const wsError = err instanceof LavinthError4 ? err : new LavinthError4(err.message, "TRACE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const fetchTraces = useCallback5(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new LavinthError4("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError4 ? err : new LavinthError4(err.message, "TRACE_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [shield, walletAddress]
  );
  const generateReport = useCallback5(
    async (traceId) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.generateRecoveryReport(traceId);
        setReport(result);
        return result;
      } catch (err) {
        const wsError = err instanceof LavinthError4 ? err : new LavinthError4(err.message, "REPORT_ERROR");
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
import { useState as useState6, useCallback as useCallback6, useEffect as useEffect5 } from "react";
import {
  LavinthError as LavinthError5
} from "@lavinth/sdk";
function useFreezeRequests(options = {}) {
  const { autoFetchExchanges = false, autoFetchPending = false } = options;
  const shield = useLavinth();
  const [exchanges, setExchanges] = useState6([]);
  const [pendingRequests, setPendingRequests] = useState6([]);
  const [currentRequest, setCurrentRequest] = useState6(null);
  const [evidencePackage, setEvidencePackage] = useState6(null);
  const [emailTemplate, setEmailTemplate] = useState6(null);
  const [isLoading, setIsLoading] = useState6(false);
  const [error, setError] = useState6(null);
  const fetchExchanges = useCallback6(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await shield.getExchangeContacts();
      setExchanges(result);
      return result;
    } catch (err) {
      const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "EXCHANGE_ERROR");
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shield]);
  const fetchPendingRequests = useCallback6(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await shield.getPendingFreezeRequests();
      setPendingRequests(result);
      return result;
    } catch (err) {
      const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "FREEZE_ERROR");
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [shield]);
  const createFreezeRequest = useCallback6(
    async (params) => {
      setIsLoading(true);
      setError(null);
      try {
        const request = await shield.createFreezeRequest(params);
        setCurrentRequest(request);
        return request;
      } catch (err) {
        const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "FREEZE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const updateStatus = useCallback6(
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
        const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "FREEZE_ERROR");
        setError(wsError);
      }
    },
    [shield, fetchPendingRequests]
  );
  const generateEvidence = useCallback6(
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
        const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "EVIDENCE_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const generateEmailTemplate = useCallback6(
    async (requestId) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await shield.generateFreezeRequestEmail(requestId);
        setEmailTemplate(result);
        return result;
      } catch (err) {
        const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "EMAIL_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [shield]
  );
  const getStatistics = useCallback6(async () => {
    try {
      return await shield.getFreezeStatistics();
    } catch (err) {
      const wsError = err instanceof LavinthError5 ? err : new LavinthError5(err.message, "STATS_ERROR");
      setError(wsError);
      return null;
    }
  }, [shield]);
  useEffect5(() => {
    if (autoFetchExchanges) {
      fetchExchanges();
    }
  }, [autoFetchExchanges, fetchExchanges]);
  useEffect5(() => {
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
import { useState as useState7, useCallback as useCallback7, useEffect as useEffect6 } from "react";
import {
  LavinthError as LavinthError6
} from "@lavinth/sdk";
function useSimulation(options = {}) {
  const {
    walletAddress,
    autoFetchHistory = false,
    autoFetchAlerts = false,
    historyLimit = 50,
    alertsLimit = 50
  } = options;
  const lavinth = useLavinth();
  const [currentSimulation, setCurrentSimulation] = useState7(null);
  const [history, setHistory] = useState7([]);
  const [alerts, setAlerts] = useState7([]);
  const [verifiedPrograms, setVerifiedPrograms] = useState7([]);
  const [isSimulating, setIsSimulating] = useState7(false);
  const [isLoading, setIsLoading] = useState7(false);
  const [error, setError] = useState7(null);
  const clearError = useCallback7(() => {
    setError(null);
  }, []);
  const simulate = useCallback7(
    async (serializedTransaction, storeResult = true) => {
      if (!walletAddress) {
        setError(
          new LavinthError6("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return null;
      } finally {
        setIsSimulating(false);
      }
    },
    [lavinth, walletAddress, historyLimit]
  );
  const quickCheck = useCallback7(
    async (serializedTransaction) => {
      setError(null);
      try {
        return await lavinth.quickRiskCheck(serializedTransaction);
      } catch (err) {
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );
  const getSimulation = useCallback7(
    async (simulationId) => {
      setError(null);
      try {
        const result = await lavinth.getSimulation(simulationId);
        if (result) {
          setCurrentSimulation(result);
        }
        return result;
      } catch (err) {
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );
  const fetchHistory = useCallback7(
    async (address) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new LavinthError6("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [lavinth, walletAddress, historyLimit]
  );
  const fetchAlerts = useCallback7(
    async (address, acknowledged) => {
      const targetAddress = address || walletAddress;
      if (!targetAddress) {
        setError(
          new LavinthError6("Wallet address is required", "INVALID_INPUT")
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
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "SIMULATION_ERROR");
        setError(wsError);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [lavinth, walletAddress, alertsLimit]
  );
  const acknowledgeAlert = useCallback7(
    async (alertId) => {
      try {
        await lavinth.acknowledgeSimulationAlert(alertId);
        setAlerts(
          (prev) => prev.map(
            (alert) => alert.alertId === alertId ? { ...alert, isAcknowledged: true, acknowledgedAt: (/* @__PURE__ */ new Date()).toISOString() } : alert
          )
        );
      } catch (err) {
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "SIMULATION_ERROR");
        setError(wsError);
      }
    },
    [lavinth]
  );
  const checkProgram = useCallback7(
    async (programId) => {
      try {
        return await lavinth.checkProgram(programId);
      } catch (err) {
        const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "PROGRAMS_ERROR");
        setError(wsError);
        return null;
      }
    },
    [lavinth]
  );
  const fetchVerifiedPrograms = useCallback7(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await lavinth.getVerifiedPrograms();
      setVerifiedPrograms(result);
      return result;
    } catch (err) {
      const wsError = err instanceof LavinthError6 ? err : new LavinthError6(err.message, "PROGRAMS_ERROR");
      setError(wsError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [lavinth]);
  useEffect6(() => {
    if (autoFetchHistory && walletAddress) {
      fetchHistory(walletAddress);
    }
  }, [autoFetchHistory, walletAddress, fetchHistory]);
  useEffect6(() => {
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
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className,
      style: mergedStyles.container,
      role: "alert",
      "aria-live": "polite",
      children: [
        visibleAlerts.map((alert) => {
          const severityStyle = mergedStyles[alert.severity] || mergedStyles.medium;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
                ...mergedStyles.alert,
                ...severityStyle
              },
              children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px", flex: 1 }, children: [
                  /* @__PURE__ */ jsx2("span", { role: "img", "aria-label": alert.severity, children: severityIcons[alert.severity] || "\u26A1" }),
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ jsx2("div", { style: { fontWeight: 600, marginBottom: "4px" }, children: alert.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) }),
                    /* @__PURE__ */ jsx2("div", { style: { fontSize: "14px", opacity: 0.9 }, children: alert.description }),
                    alert.suggestedAction && /* @__PURE__ */ jsx2("div", { style: { marginTop: "8px" }, children: /* @__PURE__ */ jsx2(
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
                onDismiss && /* @__PURE__ */ jsx2(
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
        hiddenCount > 0 && /* @__PURE__ */ jsxs(
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
import { useState as useState8, useCallback as useCallback8 } from "react";
import { Fragment, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function EmergencyRecoveryModal({
  isOpen,
  onClose,
  walletAddress,
  highRiskApprovals,
  onRevoke,
  onSignTransaction,
  className
}) {
  const [step, setStep] = useState8("warning");
  const [isProcessing, setIsProcessing] = useState8(false);
  const [transactions, setTransactions] = useState8([]);
  const [signedCount, setSignedCount] = useState8(0);
  const [error, setError] = useState8(null);
  const handleProceed = useCallback8(async () => {
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
  const handleClose = useCallback8(() => {
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
        return /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsxs2("div", { style: { textAlign: "center", marginBottom: "24px" }, children: [
            /* @__PURE__ */ jsx3("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u{1F6A8}" }),
            /* @__PURE__ */ jsx3("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: "Emergency Recovery Mode" }),
            /* @__PURE__ */ jsx3("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: "This will revoke all high-risk token approvals to protect your wallet." })
          ] }),
          /* @__PURE__ */ jsxs2(
            "div",
            {
              style: {
                backgroundColor: "#7f1d1d",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px"
              },
              children: [
                /* @__PURE__ */ jsxs2("p", { style: { fontWeight: 500, marginBottom: "8px" }, children: [
                  highRiskApprovals.length,
                  " dangerous approval",
                  highRiskApprovals.length !== 1 ? "s" : "",
                  " detected"
                ] }),
                /* @__PURE__ */ jsx3("p", { style: { fontSize: "14px", color: "#fca5a5" }, children: "These approvals allow third parties to spend your tokens without limit." })
              ]
            }
          )
        ] });
      case "review":
        return /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsx3("p", { style: { marginBottom: "16px", color: "#9ca3af" }, children: "The following approvals will be revoked:" }),
          /* @__PURE__ */ jsx3("div", { style: { maxHeight: "300px", overflow: "auto" }, children: highRiskApprovals.map((approval, index) => /* @__PURE__ */ jsxs2("div", { style: modalStyles.approvalItem, children: [
            /* @__PURE__ */ jsxs2("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
              /* @__PURE__ */ jsx3("span", { style: { fontWeight: 500 }, children: approval.tokenSymbol }),
              /* @__PURE__ */ jsx3(
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
            /* @__PURE__ */ jsxs2("div", { style: { fontSize: "12px", color: "#9ca3af", marginTop: "4px" }, children: [
              "Spender: ",
              approval.spenderAddress.slice(0, 8),
              "...",
              approval.spenderAddress.slice(-6)
            ] }),
            approval.isUnlimited && /* @__PURE__ */ jsx3("div", { style: { fontSize: "12px", color: "#ef4444", marginTop: "4px" }, children: "Unlimited approval" })
          ] }, index)) })
        ] });
      case "signing":
        const progress = transactions.length > 0 ? signedCount / transactions.length * 100 : 0;
        return /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsxs2("div", { style: { textAlign: "center", marginBottom: "24px" }, children: [
            /* @__PURE__ */ jsx3("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: isProcessing ? "\u23F3" : "\u270D\uFE0F" }),
            /* @__PURE__ */ jsx3("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: isProcessing ? "Processing..." : "Sign Transactions" }),
            /* @__PURE__ */ jsxs2("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: [
              signedCount,
              " of ",
              transactions.length,
              " transactions signed"
            ] })
          ] }),
          /* @__PURE__ */ jsx3("div", { style: modalStyles.progress, children: /* @__PURE__ */ jsx3(
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
        return /* @__PURE__ */ jsxs2("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsx3("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u2705" }),
          /* @__PURE__ */ jsx3("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: "Recovery Complete" }),
          /* @__PURE__ */ jsx3("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: "All dangerous approvals have been revoked. Your wallet is now safer." }),
          /* @__PURE__ */ jsx3(
            "div",
            {
              style: {
                backgroundColor: "#064e3b",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "24px"
              },
              children: /* @__PURE__ */ jsxs2("p", { style: { fontWeight: 500 }, children: [
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
  return /* @__PURE__ */ jsx3("div", { style: modalStyles.overlay, className, children: /* @__PURE__ */ jsxs2("div", { style: modalStyles.modal, role: "dialog", "aria-modal": "true", children: [
    /* @__PURE__ */ jsxs2("div", { style: modalStyles.header, children: [
      /* @__PURE__ */ jsx3("span", { style: modalStyles.title, children: "\u{1F6A8} Emergency Recovery" }),
      /* @__PURE__ */ jsx3(
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
    /* @__PURE__ */ jsxs2("div", { style: modalStyles.body, children: [
      renderStep(),
      error && /* @__PURE__ */ jsxs2("div", { style: modalStyles.errorBox, children: [
        /* @__PURE__ */ jsx3("strong", { children: "Error:" }),
        " ",
        error
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("div", { style: modalStyles.footer, children: [
      step !== "complete" && /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: handleClose,
          style: { ...modalStyles.button, ...modalStyles.secondaryButton },
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ jsxs2(
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
import { useState as useState9 } from "react";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
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
  const [selectedIds, setSelectedIds] = useState9(/* @__PURE__ */ new Set());
  const [revokingId, setRevokingId] = useState9(null);
  const [isRevokingBatch, setIsRevokingBatch] = useState9(false);
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
    return /* @__PURE__ */ jsx4("div", { style: mergedStyles.container, className, children: /* @__PURE__ */ jsx4("div", { style: { padding: "40px", textAlign: "center", color: "#9ca3af" }, children: "Loading approvals..." }) });
  }
  if (approvals.length === 0) {
    return /* @__PURE__ */ jsx4("div", { style: mergedStyles.container, className, children: /* @__PURE__ */ jsxs3("div", { style: { padding: "40px", textAlign: "center", color: "#9ca3af" }, children: [
      /* @__PURE__ */ jsx4("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u2705" }),
      /* @__PURE__ */ jsx4("p", { children: "No token approvals found" }),
      /* @__PURE__ */ jsx4("p", { style: { fontSize: "14px", marginTop: "8px" }, children: "Your wallet has no active token approvals" })
    ] }) });
  }
  return /* @__PURE__ */ jsxs3("div", { style: mergedStyles.container, className, children: [
    /* @__PURE__ */ jsxs3("div", { style: mergedStyles.header, children: [
      /* @__PURE__ */ jsxs3("div", { style: { display: "flex", alignItems: "center", gap: "12px" }, children: [
        selectable && /* @__PURE__ */ jsx4(
          "input",
          {
            type: "checkbox",
            checked: selectedIds.size === approvals.length,
            onChange: selectAll,
            style: { width: "18px", height: "18px", cursor: "pointer" }
          }
        ),
        /* @__PURE__ */ jsxs3("span", { style: { color: "white", fontWeight: 600 }, children: [
          "Token Approvals (",
          approvals.length,
          ")"
        ] })
      ] }),
      selectable && selectedIds.size > 0 && onRevokeSelected && /* @__PURE__ */ jsx4(
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
      return /* @__PURE__ */ jsxs3(
        "div",
        {
          style: {
            ...mergedStyles.item,
            backgroundColor: isSelected ? "#374151" : "transparent"
          },
          children: [
            selectable && /* @__PURE__ */ jsx4(
              "input",
              {
                type: "checkbox",
                checked: isSelected,
                onChange: () => toggleSelection(id),
                style: { width: "18px", height: "18px", cursor: "pointer" }
              }
            ),
            /* @__PURE__ */ jsxs3("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxs3("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                /* @__PURE__ */ jsx4("span", { style: { color: "white", fontWeight: 500 }, children: approval.tokenSymbol || "Unknown Token" }),
                showRiskBadge && /* @__PURE__ */ jsx4(
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
                approval.isUnlimited && /* @__PURE__ */ jsx4(
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
              /* @__PURE__ */ jsxs3(
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
                    /* @__PURE__ */ jsxs3("span", { children: [
                      "Amount: ",
                      formatAmount(approval)
                    ] }),
                    /* @__PURE__ */ jsxs3("span", { children: [
                      "Spender: ",
                      formatAddress(approval.spenderAddress)
                    ] }),
                    approval.spenderLabel && /* @__PURE__ */ jsx4(
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
            onRevoke && /* @__PURE__ */ jsx4(
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
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
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
    return /* @__PURE__ */ jsx5("div", { style: containerStyle, className, children: /* @__PURE__ */ jsxs4("div", { style: { padding: "60px", textAlign: "center" }, children: [
      /* @__PURE__ */ jsx5("div", { style: { fontSize: "48px", marginBottom: "16px", animation: "spin 2s linear infinite" }, children: "\u{1F50D}" }),
      /* @__PURE__ */ jsx5("p", { style: { color: "#9ca3af" }, children: "Tracing funds through the blockchain..." })
    ] }) });
  }
  if (!trace) {
    return /* @__PURE__ */ jsx5("div", { style: containerStyle, className, children: /* @__PURE__ */ jsxs4("div", { style: { padding: "60px", textAlign: "center" }, children: [
      /* @__PURE__ */ jsx5("div", { style: { fontSize: "48px", marginBottom: "16px" }, children: "\u{1F50E}" }),
      /* @__PURE__ */ jsx5("p", { style: { color: "#9ca3af" }, children: "No trace data available" }),
      /* @__PURE__ */ jsx5("p", { style: { color: "#6b7280", fontSize: "14px", marginTop: "8px" }, children: "Start a new trace to track stolen funds" })
    ] }) });
  }
  const status = statusColors[trace.status] || statusColors.in_progress;
  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatAmount = (amount) => amount.toLocaleString(void 0, { maximumFractionDigits: 4 });
  return /* @__PURE__ */ jsxs4("div", { style: containerStyle, className, children: [
    /* @__PURE__ */ jsxs4("div", { style: headerStyle, children: [
      /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
        /* @__PURE__ */ jsxs4("div", { children: [
          /* @__PURE__ */ jsx5("h3", { style: { fontSize: "18px", fontWeight: 600, marginBottom: "8px" }, children: "Fund Trace" }),
          /* @__PURE__ */ jsxs4("p", { style: { color: "#9ca3af", fontSize: "14px" }, children: [
            "Trace ID: ",
            trace.traceId.slice(0, 12),
            "..."
          ] })
        ] }),
        /* @__PURE__ */ jsx5("div", { style: { textAlign: "right" }, children: /* @__PURE__ */ jsx5(
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
      /* @__PURE__ */ jsxs4(
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
            /* @__PURE__ */ jsxs4("div", { children: [
              /* @__PURE__ */ jsx5("div", { style: { color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }, children: "Total Stolen" }),
              /* @__PURE__ */ jsxs4("div", { style: { fontSize: "20px", fontWeight: 600, color: "#ef4444" }, children: [
                formatAmount(trace.totalAmount),
                " ",
                trace.tokenSymbol || "SOL"
              ] })
            ] }),
            /* @__PURE__ */ jsxs4("div", { children: [
              /* @__PURE__ */ jsx5("div", { style: { color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }, children: "Recovered" }),
              /* @__PURE__ */ jsxs4("div", { style: { fontSize: "20px", fontWeight: 600, color: "#10b981" }, children: [
                formatAmount(trace.recoveredAmount || 0),
                " ",
                trace.tokenSymbol || "SOL"
              ] })
            ] }),
            /* @__PURE__ */ jsxs4("div", { children: [
              /* @__PURE__ */ jsx5("div", { style: { color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }, children: "Hops Traced" }),
              /* @__PURE__ */ jsx5("div", { style: { fontSize: "20px", fontWeight: 600 }, children: trace.hops.length })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs4("div", { style: { padding: "20px" }, children: [
      /* @__PURE__ */ jsx5("h4", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#9ca3af" }, children: "FUND FLOW" }),
      /* @__PURE__ */ jsxs4("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ jsx5(
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
          return /* @__PURE__ */ jsxs4(
            "div",
            {
              style: {
                display: "flex",
                gap: "16px",
                marginBottom: index < trace.hops.length - 1 ? "24px" : 0,
                position: "relative"
              },
              children: [
                /* @__PURE__ */ jsx5(
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
                /* @__PURE__ */ jsxs4(
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
                      /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
                        /* @__PURE__ */ jsxs4("div", { children: [
                          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                            /* @__PURE__ */ jsx5("span", { style: { fontWeight: 500 }, children: hop.entityLabel || formatAddress(hop.address) }),
                            /* @__PURE__ */ jsx5(
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
                          /* @__PURE__ */ jsx5("div", { style: { fontSize: "13px", color: "#6b7280", marginTop: "4px" }, children: formatAddress(hop.address) })
                        ] }),
                        /* @__PURE__ */ jsxs4("div", { style: { textAlign: "right" }, children: [
                          /* @__PURE__ */ jsxs4("div", { style: { fontWeight: 600 }, children: [
                            formatAmount(hop.amount),
                            " ",
                            trace.tokenSymbol || "SOL"
                          ] }),
                          /* @__PURE__ */ jsx5("div", { style: { fontSize: "12px", color: "#6b7280", marginTop: "2px" }, children: new Date(hop.timestamp).toLocaleString() })
                        ] })
                      ] }),
                      hop.transactionSignature && /* @__PURE__ */ jsxs4("div", { style: { marginTop: "12px", fontSize: "12px", color: "#6b7280" }, children: [
                        "TX: ",
                        hop.transactionSignature.slice(0, 20),
                        "..."
                      ] }),
                      isExchange && onRequestFreeze && /* @__PURE__ */ jsx5(
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
    report && /* @__PURE__ */ jsxs4("div", { style: { padding: "20px", borderTop: "1px solid #374151" }, children: [
      /* @__PURE__ */ jsx5("h4", { style: { fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#9ca3af" }, children: "RECOVERY ANALYSIS" }),
      /* @__PURE__ */ jsxs4(
        "div",
        {
          style: {
            backgroundColor: "#111827",
            borderRadius: "8px",
            padding: "16px"
          },
          children: [
            /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [
              /* @__PURE__ */ jsx5("span", { style: { color: "#9ca3af" }, children: "Recovery Probability" }),
              /* @__PURE__ */ jsxs4(
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
            /* @__PURE__ */ jsx5(
              "div",
              {
                style: {
                  height: "8px",
                  backgroundColor: "#374151",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "16px"
                },
                children: /* @__PURE__ */ jsx5(
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
            report.recommendations && report.recommendations.length > 0 && /* @__PURE__ */ jsxs4("div", { children: [
              /* @__PURE__ */ jsx5("div", { style: { fontSize: "13px", fontWeight: 500, marginBottom: "8px" }, children: "Recommendations:" }),
              /* @__PURE__ */ jsx5("ul", { style: { margin: 0, paddingLeft: "20px", color: "#9ca3af", fontSize: "13px" }, children: report.recommendations.slice(0, 3).map((rec, i) => /* @__PURE__ */ jsx5("li", { style: { marginBottom: "4px" }, children: rec.action }, i)) })
            ] })
          ]
        }
      )
    ] }),
    onGenerateReport && !report && /* @__PURE__ */ jsx5("div", { style: { padding: "20px", borderTop: "1px solid #374151" }, children: /* @__PURE__ */ jsx5(
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
import { useState as useState10, useCallback as useCallback9 } from "react";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
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
  const [currentStep, setCurrentStep] = useState10("intro");
  const [newWalletAddress, setNewWalletAddress] = useState10("");
  const [selectedAssets, setSelectedAssets] = useState10(
    new Set(assets.filter((a) => a.isSafe).map((a) => a.tokenAddress))
  );
  const [isProcessing, setIsProcessing] = useState10(false);
  const [error, setError] = useState10(null);
  const [securityChecklist, setSecurityChecklist] = useState10({
    revokedApprovals: false,
    changedPasswords: false,
    scannedDevice: false,
    enabledHardwareWallet: false
  });
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const safeAssets = assets.filter((a) => a.isSafe);
  const unsafeAssets = assets.filter((a) => !a.isSafe);
  const handleNext = useCallback9(async () => {
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
  const handleBack = useCallback9(() => {
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
        return /* @__PURE__ */ jsxs5("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsx6("div", { style: { fontSize: "64px", marginBottom: "24px" }, children: "\u{1F6E1}\uFE0F" }),
          /* @__PURE__ */ jsx6("h2", { style: { fontSize: "24px", fontWeight: 600, marginBottom: "16px" }, children: "Wallet Recovery Wizard" }),
          /* @__PURE__ */ jsx6("p", { style: { color: "#9ca3af", marginBottom: "24px", lineHeight: 1.6 }, children: "This wizard will guide you through creating a new secure wallet and safely migrating your assets from the compromised wallet." }),
          /* @__PURE__ */ jsxs5(
            "div",
            {
              style: {
                backgroundColor: "#7f1d1d",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "left"
              },
              children: [
                /* @__PURE__ */ jsx6("div", { style: { fontWeight: 500, marginBottom: "8px" }, children: "\u26A0\uFE0F Compromised Wallet" }),
                /* @__PURE__ */ jsx6("code", { style: { fontSize: "14px", color: "#fca5a5" }, children: formatAddress(compromisedWallet) })
              ]
            }
          )
        ] });
      case "new-wallet":
        return /* @__PURE__ */ jsxs5("div", { children: [
          /* @__PURE__ */ jsx6("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: "Create New Wallet" }),
          /* @__PURE__ */ jsx6("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Create a new wallet to safely receive your assets. We recommend using a hardware wallet for maximum security." }),
          newWalletAddress ? /* @__PURE__ */ jsxs5(
            "div",
            {
              style: {
                backgroundColor: "#064e3b",
                borderRadius: "8px",
                padding: "20px"
              },
              children: [
                /* @__PURE__ */ jsxs5("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }, children: [
                  /* @__PURE__ */ jsx6("span", { style: { fontSize: "24px" }, children: "\u2705" }),
                  /* @__PURE__ */ jsx6("span", { style: { fontWeight: 500 }, children: "New Wallet Created" })
                ] }),
                /* @__PURE__ */ jsx6("code", { style: { fontSize: "14px", color: "#86efac" }, children: newWalletAddress })
              ]
            }
          ) : /* @__PURE__ */ jsxs5("div", { style: { display: "flex", flexDirection: "column", gap: "12px" }, children: [
            /* @__PURE__ */ jsx6(
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
            onCreateNewWallet && /* @__PURE__ */ jsx6(
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
        return /* @__PURE__ */ jsxs5("div", { children: [
          /* @__PURE__ */ jsx6("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: "Review Assets" }),
          /* @__PURE__ */ jsx6("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Select the assets you want to transfer to your new wallet. Potentially malicious tokens are marked for your safety." }),
          safeAssets.length > 0 && /* @__PURE__ */ jsxs5("div", { style: { marginBottom: "24px" }, children: [
            /* @__PURE__ */ jsxs5("div", { style: { fontSize: "13px", fontWeight: 500, color: "#10b981", marginBottom: "12px" }, children: [
              "\u2705 SAFE ASSETS (",
              safeAssets.length,
              ")"
            ] }),
            safeAssets.map((asset) => /* @__PURE__ */ jsxs5(
              "div",
              {
                style: styles.assetItem,
                onClick: () => toggleAsset(asset.tokenAddress),
                children: [
                  /* @__PURE__ */ jsx6(
                    "input",
                    {
                      type: "checkbox",
                      checked: selectedAssets.has(asset.tokenAddress),
                      onChange: () => toggleAsset(asset.tokenAddress),
                      style: { width: "18px", height: "18px" }
                    }
                  ),
                  /* @__PURE__ */ jsxs5("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ jsx6("div", { style: { fontWeight: 500 }, children: asset.tokenSymbol }),
                    /* @__PURE__ */ jsxs5("div", { style: { fontSize: "13px", color: "#9ca3af" }, children: [
                      asset.amount.toLocaleString(),
                      asset.usdValue && ` ($${asset.usdValue.toFixed(2)})`
                    ] })
                  ] })
                ]
              },
              asset.tokenAddress
            ))
          ] }),
          unsafeAssets.length > 0 && /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsxs5("div", { style: { fontSize: "13px", fontWeight: 500, color: "#ef4444", marginBottom: "12px" }, children: [
              "\u26A0\uFE0F POTENTIALLY MALICIOUS (",
              unsafeAssets.length,
              ")"
            ] }),
            unsafeAssets.map((asset) => /* @__PURE__ */ jsxs5(
              "div",
              {
                style: {
                  ...styles.assetItem,
                  opacity: 0.6,
                  border: "1px solid #7f1d1d"
                },
                children: [
                  /* @__PURE__ */ jsx6("span", { style: { fontSize: "20px" }, children: "\u{1F6AB}" }),
                  /* @__PURE__ */ jsxs5("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ jsx6("div", { style: { fontWeight: 500 }, children: asset.tokenSymbol }),
                    /* @__PURE__ */ jsx6("div", { style: { fontSize: "13px", color: "#fca5a5" }, children: "Not recommended for transfer" })
                  ] })
                ]
              },
              asset.tokenAddress
            ))
          ] })
        ] });
      case "transfer":
        return /* @__PURE__ */ jsxs5("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsx6("div", { style: { fontSize: "64px", marginBottom: "24px" }, children: isProcessing ? "\u23F3" : "\u{1F4E6}" }),
          /* @__PURE__ */ jsx6("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: isProcessing ? "Transferring Assets..." : "Ready to Transfer" }),
          /* @__PURE__ */ jsxs5("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: [
            selectedAssets.size,
            " asset",
            selectedAssets.size !== 1 ? "s" : "",
            " will be transferred to your new wallet."
          ] }),
          /* @__PURE__ */ jsx6(
            "div",
            {
              style: {
                backgroundColor: "#111827",
                borderRadius: "8px",
                padding: "20px"
              },
              children: /* @__PURE__ */ jsxs5("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }, children: [
                /* @__PURE__ */ jsxs5("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ jsx6("div", { style: { fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }, children: "From" }),
                  /* @__PURE__ */ jsx6("code", { style: { fontSize: "13px" }, children: formatAddress(compromisedWallet) })
                ] }),
                /* @__PURE__ */ jsx6("span", { style: { fontSize: "24px" }, children: "\u2192" }),
                /* @__PURE__ */ jsxs5("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ jsx6("div", { style: { fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }, children: "To" }),
                  /* @__PURE__ */ jsx6("code", { style: { fontSize: "13px", color: "#10b981" }, children: formatAddress(newWalletAddress) })
                ] })
              ] })
            }
          )
        ] });
      case "security":
        return /* @__PURE__ */ jsxs5("div", { children: [
          /* @__PURE__ */ jsx6("h2", { style: { fontSize: "20px", fontWeight: 600, marginBottom: "16px" }, children: "Security Checklist" }),
          /* @__PURE__ */ jsx6("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Complete these security steps to protect your new wallet." }),
          [
            { key: "revokedApprovals", label: "Revoked all token approvals on compromised wallet" },
            { key: "changedPasswords", label: "Changed passwords on related accounts" },
            { key: "scannedDevice", label: "Scanned device for malware" },
            { key: "enabledHardwareWallet", label: "Consider using a hardware wallet" }
          ].map(({ key, label }) => /* @__PURE__ */ jsxs5(
            "div",
            {
              style: styles.checklistItem,
              onClick: () => toggleSecurityItem(key),
              children: [
                /* @__PURE__ */ jsx6(
                  "input",
                  {
                    type: "checkbox",
                    checked: securityChecklist[key],
                    onChange: () => toggleSecurityItem(key),
                    style: { width: "20px", height: "20px" }
                  }
                ),
                /* @__PURE__ */ jsx6("span", { children: label })
              ]
            },
            key
          ))
        ] });
      case "complete":
        return /* @__PURE__ */ jsxs5("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsx6("div", { style: { fontSize: "64px", marginBottom: "24px" }, children: "\u{1F389}" }),
          /* @__PURE__ */ jsx6("h2", { style: { fontSize: "24px", fontWeight: 600, marginBottom: "16px" }, children: "Recovery Complete!" }),
          /* @__PURE__ */ jsx6("p", { style: { color: "#9ca3af", marginBottom: "24px" }, children: "Your assets have been safely transferred to your new wallet." }),
          /* @__PURE__ */ jsxs5(
            "div",
            {
              style: {
                backgroundColor: "#064e3b",
                borderRadius: "8px",
                padding: "20px"
              },
              children: [
                /* @__PURE__ */ jsx6("div", { style: { fontSize: "14px", color: "#86efac", marginBottom: "8px" }, children: "New Wallet Address" }),
                /* @__PURE__ */ jsx6("code", { style: { fontSize: "16px", fontWeight: 500 }, children: newWalletAddress })
              ]
            }
          )
        ] });
    }
  };
  return /* @__PURE__ */ jsxs5("div", { style: styles.container, className, children: [
    /* @__PURE__ */ jsx6("div", { style: styles.header, children: /* @__PURE__ */ jsx6("div", { style: styles.progress, children: steps.map((step, index) => {
      const isActive = index === currentStepIndex;
      const isComplete = index < currentStepIndex;
      return /* @__PURE__ */ jsxs5("div", { style: styles.progressStep, children: [
        /* @__PURE__ */ jsx6(
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
        /* @__PURE__ */ jsx6(
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
    /* @__PURE__ */ jsxs5("div", { style: styles.body, children: [
      renderStep(),
      error && /* @__PURE__ */ jsxs5("div", { style: styles.errorBox, children: [
        /* @__PURE__ */ jsx6("strong", { children: "Error:" }),
        " ",
        error
      ] })
    ] }),
    /* @__PURE__ */ jsxs5("div", { style: styles.footer, children: [
      currentStepIndex > 0 && currentStep !== "complete" ? /* @__PURE__ */ jsx6(
        "button",
        {
          onClick: handleBack,
          style: { ...styles.button, ...styles.secondaryButton },
          disabled: isProcessing,
          children: "Back"
        }
      ) : /* @__PURE__ */ jsx6("div", {}),
      /* @__PURE__ */ jsx6(
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
export {
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
};
