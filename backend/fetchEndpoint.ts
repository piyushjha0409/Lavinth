import cors from "cors";
import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import db from "./db/db-utils";
import { validateToken } from "./middlewares/validateToken";
import { validateApiKey } from "./middlewares/validateApiKey";
import { globalLimiter, strictLimiter } from "./middlewares/rateLimiter";
import { validateEnv } from "./validateEnv";
import "./processHandlers";
import pinoHttp from 'pino-http';
import logger from './logger';

// Load environment variables
dotenv.config();

// Validate required env vars at startup
validateEnv();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: ["https://www.lavinth.com", "http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "x-access-token", "x-api-key"],
  })
);
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(globalLimiter);

// Health check endpoint (no auth, before rate limiter would apply to it via ordering)
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await db.pool.executeQuery('SELECT 1', [], 1);
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
    healthy = false;
  }

  const status = healthy ? 'healthy' : 'degraded';
  res.status(healthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    version: '1.0.0',
  });
});

// Helper: sanitize pagination params to prevent Postgres errors
function sanitizeLimit(val: any, defaultVal = 10, max = 10000): number {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}
function sanitizeOffset(val: any, defaultVal = 0): number {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) return defaultVal;
  return n;
}


app.get(
  "/api/check-wallet/:address",
  strictLimiter,
  validateApiKey,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { address } = req.params;

      if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid wallet address format",
        });
      }

      const { threatIntelligenceService } = await import("./services/threat-intelligence");

      // Check known_malicious_delegates table
      const localResult = await db.pool.executeQuery(
        `SELECT address, label, category, external_sources, confidence_score
         FROM known_malicious_delegates WHERE address = $1`,
        [address]
      );

      const isMalicious = localResult.rows.length > 0;

      // Query GoPlus for real-time risk data
      const goPlusResult = await threatIntelligenceService.checkAddressGoPlus(address);

      const isFlagged = isMalicious || goPlusResult.isRisky;
      const riskScore = isMalicious
        ? parseFloat(localResult.rows[0].confidence_score || '0.8')
        : goPlusResult.isRisky ? 0.7 : 0;

      req.log.info({ address, isFlagged, riskScore }, 'Wallet check complete');

      return res.status(200).json({
        status: "success",
        isFlagged,
        riskScore,
        details: isMalicious ? {
          label: localResult.rows[0].label,
          category: localResult.rows[0].category,
          sources: localResult.rows[0].external_sources || [],
        } : null,
        goPlusRisk: goPlusResult.isRisky ? {
          isRisky: goPlusResult.isRisky,
          riskFlags: goPlusResult.riskFlags,
        } : null,
        message: isFlagged
          ? `This wallet address is flagged as potentially malicious (risk score: ${riskScore.toFixed(4)}).`
          : "This wallet address is not flagged and appears to be safe.",
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error checking wallet address');
      res.status(500).json({
        status: "error",
        message: "Failed to check wallet address",
        error: (error as Error).message,
      });
    }
  }
);

// ============================================
// WalletShield Recovery Endpoints (Phase 1)
// ============================================

import { approvalScanner } from "./services/approval-scanner";
import { revocationEngine } from "./services/revocation-engine";

/**
 * Scan wallet for token approvals
 * GET /api/approvals/scan/:address
 */
app.get('/api/approvals/scan/:address', strictLimiter, validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    // Validate address format
    if (!address || address.length < 32 || address.length > 44) {
      res.status(400).json({ error: 'Invalid wallet address format' });
      return;
    }

    const scanResult = await approvalScanner.scanWallet(address);

    if (!scanResult.success) {
      req.log.error({ scanError: scanResult.error }, 'Approval scan failed');
      res.status(500).json({ error: scanResult.error });
      return;
    }

    req.log.info({ totalApprovals: scanResult.profile?.totalApprovals }, 'Scan completed');
    res.json({
      success: true,
      walletAddress: address,
      profile: scanResult.profile,
      scannedAt: new Date().toISOString()
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error scanning approvals');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get cached approvals for a wallet
 * GET /api/approvals/:address
 */
app.get('/api/approvals/:address', validateApiKey, async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 100, 500);
    const approvals = await approvalScanner.getApprovals(address);
    const profile = await approvalScanner.getSecurityProfile(address);

    req.log.info({ count: approvals.length }, 'Retrieved approvals');
    res.json({
      walletAddress: address,
      profile,
      approvals: approvals.slice(0, cap)
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching approvals');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get security profile for a wallet
 * GET /api/security-profile/:address
 */
app.get('/api/security-profile/:address', validateApiKey, async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    let profile = await approvalScanner.getSecurityProfile(address);

    // If no cached profile, do a fresh scan
    if (!profile) {
      req.log.info('No cached profile, performing fresh scan');
      const scanResult = await approvalScanner.scanWallet(address);
      profile = scanResult.profile;
    }

    res.json({
      walletAddress: address,
      profile,
      retrievedAt: new Date().toISOString()
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching security profile');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create revocation plan for a wallet
 * POST /api/revocation/plan
 */
app.post('/api/revocation/plan', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, approvalIds } = req.body;

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const plan = await revocationEngine.createRevocationPlan(walletAddress);

    req.log.info({ totalApprovals: plan.totalApprovals, totalTransactions: plan.totalTransactions }, 'Revocation plan created');
    res.json({
      success: true,
      plan: {
        sessionId: plan.sessionId,
        walletAddress: plan.walletAddress,
        totalApprovals: plan.totalApprovals,
        totalTransactions: plan.totalTransactions,
        estimatedTotalFee: plan.estimatedTotalFee,
        createdAt: plan.createdAt
      }
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating revocation plan');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Build unsigned transactions for revocation
 * POST /api/revocation/build
 */
app.post('/api/revocation/build', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress } = req.body;

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    // Create plan and build transactions
    const plan = await revocationEngine.createRevocationPlan(walletAddress);
    const transactions = await revocationEngine.buildUnsignedTransactions(plan);

    req.log.info({ count: transactions.length }, 'Built unsigned transactions');
    res.json({
      success: true,
      sessionId: plan.sessionId,
      walletAddress,
      totalApprovals: plan.totalApprovals,
      transactions: transactions,
      estimatedTotalFee: plan.estimatedTotalFee
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error building revocation transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Build unsigned transactions for selective revocation
 * POST /api/revocation/build-selective
 */
app.post('/api/revocation/build-selective', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, approvals } = req.body;

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      res.status(400).json({ error: 'approvals must be a non-empty array' });
      return;
    }

    const plan = await revocationEngine.createRevocationPlan(walletAddress, approvals);
    const transactions = await revocationEngine.buildUnsignedTransactions(plan);

    req.log.info({ count: transactions.length, selected: approvals.length }, 'Built selective revocation transactions');
    res.json({
      success: true,
      sessionId: plan.sessionId,
      walletAddress,
      totalApprovals: plan.totalApprovals,
      transactions: transactions,
      estimatedTotalFee: plan.estimatedTotalFee
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error building selective revocation transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Submit signed revocation transactions
 * POST /api/revocation/submit
 */
app.post('/api/revocation/submit', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { sessionId, signedTransactions } = req.body;

  try {
    if (!sessionId || !signedTransactions || !Array.isArray(signedTransactions)) {
      res.status(400).json({ error: 'sessionId and signedTransactions array are required' });
      return;
    }

    const result = await revocationEngine.submitSignedTransactions(sessionId, signedTransactions);

    req.log.info({ totalRevoked: result.totalRevoked, totalFailed: result.totalFailed }, 'Revocation submission complete');
    res.json(result);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error submitting revocation transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Emergency revoke all high-risk approvals
 * POST /api/revocation/emergency
 */
app.post('/api/revocation/emergency', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress } = req.body;

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const plan = await revocationEngine.createEmergencyRevokePlan(walletAddress);
    const transactions = await revocationEngine.buildUnsignedTransactions(plan);

    req.log.info({ totalHighRiskApprovals: plan.totalApprovals }, 'Emergency revocation plan created');
    res.json({
      success: true,
      isEmergency: true,
      sessionId: plan.sessionId,
      walletAddress,
      totalHighRiskApprovals: plan.totalApprovals,
      transactions: transactions,
      estimatedTotalFee: plan.estimatedTotalFee
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating emergency revocation');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get recovery session status
 * GET /api/recovery/session/:sessionId
 */
app.get('/api/recovery/session/:sessionId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  try {
    const session = await revocationEngine.getRecoverySession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching recovery session');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all recovery sessions for a wallet
 * GET /api/recovery/history/:address
 */
app.get('/api/recovery/history/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 50, 200);
    const sessions = await revocationEngine.getRecoverySessionsForWallet(address);

    res.json({
      walletAddress: address,
      sessions: sessions.slice(0, cap),
      total: sessions.length
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching recovery history');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Report a malicious delegate address
 * POST /api/report/malicious-delegate
 */
app.post('/api/report/malicious-delegate', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address, label, category, reportedLosses } = req.body;

  try {
    if (!address || !label || !category) {
      res.status(400).json({ error: 'address, label, and category are required' });
      return;
    }

    await approvalScanner.reportMaliciousDelegate(address, label, category, reportedLosses || 0);

    req.log.info({ address, category }, 'Malicious delegate reported');
    res.json({
      success: true,
      message: 'Malicious delegate reported successfully'
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error reporting malicious delegate');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 2)
// Compromise Detection & Fund Tracking
// ============================================

import { compromiseDetector } from "./services/compromise-detector";
import { fundTracker } from "./services/fund-tracker";
import { alertManager } from "./services/alert-manager";

/**
 * Analyze wallet for signs of compromise
 * GET /api/compromise/analyze/:address
 */
app.get('/api/compromise/analyze/:address', strictLimiter, validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    if (!address || address.length < 32 || address.length > 44) {
      res.status(400).json({ error: 'Invalid wallet address format' });
      return;
    }

    const result = await compromiseDetector.analyzeWallet(address);

    req.log.info({ isCompromised: result.isCompromised, alertCount: result.alerts.length }, 'Compromise analysis complete');
    res.json({
      success: true,
      walletAddress: address,
      isCompromised: result.isCompromised,
      riskScore: result.riskScore,
      alertCount: result.alerts.length,
      alerts: result.alerts,
      recentTransactions: result.transactions.slice(0, 10),
      analyzedAt: new Date().toISOString()
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error analyzing wallet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Register wallet for monitoring
 * POST /api/compromise/monitor
 */
app.post('/api/compromise/monitor', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, userId, alertChannels, monitoringLevel } = req.body;

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const wallet = await compromiseDetector.registerWallet(
      walletAddress,
      userId,
      alertChannels,
      monitoringLevel || 'standard'
    );

    // Also create alert subscription if channels provided
    if (alertChannels) {
      await alertManager.createSubscription(walletAddress, alertChannels, { userId });
    }

    req.log.info('Wallet registered for monitoring');
    res.json({
      success: true,
      wallet
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error registering wallet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get monitored wallet info
 * GET /api/compromise/monitor/:address
 */
app.get('/api/compromise/monitor/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    const wallet = await compromiseDetector.getMonitoredWallet(address);

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found in monitoring list' });
      return;
    }

    res.json(wallet);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching monitored wallet');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get alerts for a wallet
 * GET /api/compromise/alerts/:address
 */
app.get('/api/compromise/alerts/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  const { limit = 50 } = req.query;

  try {
    const alerts = await compromiseDetector.getAlerts(address, sanitizeLimit(limit, 50));

    res.json({
      walletAddress: address,
      alertCount: alerts.length,
      alerts
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching alerts');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Acknowledge an alert
 * POST /api/compromise/alerts/:alertId/acknowledge
 */
app.post('/api/compromise/alerts/:alertId/acknowledge', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { alertId } = req.params;

  try {
    await compromiseDetector.acknowledgeAlert(alertId);

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error acknowledging alert');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get recent transactions for a wallet
 * GET /api/compromise/transactions/:address
 */
app.get('/api/compromise/transactions/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  const { limit = 50 } = req.query;

  try {
    const transactions = await compromiseDetector.getTransactions(address, sanitizeLimit(limit, 50));

    res.json({
      walletAddress: address,
      transactionCount: transactions.length,
      transactions
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Fund Tracking Endpoints
// ============================================

/**
 * Start tracing stolen funds
 * POST /api/funds/trace
 */
app.post('/api/funds/trace', strictLimiter, validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { sourceWallet, initialAmount, tokenMint } = req.body;

  try {
    if (!sourceWallet || !initialAmount) {
      res.status(400).json({ error: 'sourceWallet and initialAmount are required' });
      return;
    }

    const trace = await fundTracker.startTrace(sourceWallet, initialAmount, tokenMint);

    req.log.info({ traceId: trace.traceId }, 'Fund trace started');
    res.json({
      success: true,
      trace
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error starting trace');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get trace status and details
 * GET /api/funds/trace/:traceId
 */
app.get('/api/funds/trace/:traceId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { traceId } = req.params;

  try {
    const trace = await fundTracker.getTrace(traceId);

    if (!trace) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }

    res.json(trace);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching trace');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all traces for a wallet
 * GET /api/funds/traces/:address
 */
app.get('/api/funds/traces/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 50, 200);
    const traces = await fundTracker.getTracesForWallet(address);

    res.json({
      walletAddress: address,
      traceCount: traces.length,
      traces: traces.slice(0, cap)
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching traces');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate recovery report
 * GET /api/funds/report/:traceId
 */
app.get('/api/funds/report/:traceId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { traceId } = req.params;

  try {
    const report = await fundTracker.generateRecoveryReport(traceId);

    if (!report) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }

    req.log.info({ recoveryProbability: report.recoveryProbability }, 'Recovery report generated');
    res.json(report);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generating report');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create freeze request for exchange
 * POST /api/funds/freeze-request
 */
app.post('/api/funds/freeze-request', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { traceId, exchangeDeposit, victimInfo } = req.body;

  try {
    if (!traceId || !exchangeDeposit) {
      res.status(400).json({ error: 'traceId and exchangeDeposit are required' });
      return;
    }

    const request = await fundTracker.createFreezeRequest(traceId, exchangeDeposit);

    // Generate template if victimInfo provided
    let template: string | undefined;
    if (victimInfo) {
      template = fundTracker.generateFreezeRequestTemplate(request, victimInfo);
    }

    req.log.info({ freezeRequestId: request.requestId }, 'Freeze request created');
    res.json({
      success: true,
      request,
      template
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating freeze request');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Alert Management Endpoints
// ============================================

/**
 * Create or update alert subscription
 * POST /api/alerts/subscribe
 */
app.post('/api/alerts/subscribe', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress, channels, userId, severityFilter, alertTypes } = req.body;

  try {
    if (!walletAddress || !channels) {
      res.status(400).json({ error: 'walletAddress and channels are required' });
      return;
    }

    const subscription = await alertManager.createSubscription(walletAddress, channels, {
      userId,
      severityFilter,
      alertTypes
    });

    req.log.info({ subscriptionId: subscription.subscriptionId }, 'Alert subscription created');
    res.json({
      success: true,
      subscription
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating subscription');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get alert subscription for wallet
 * GET /api/alerts/subscription/:address
 */
app.get('/api/alerts/subscription/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    const subscription = await alertManager.getSubscription(address);

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json(subscription);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching subscription');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Deactivate alert subscription
 * DELETE /api/alerts/subscription/:address
 */
app.delete('/api/alerts/subscription/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    await alertManager.deactivateSubscription(address);

    res.json({
      success: true,
      message: 'Subscription deactivated'
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error deactivating subscription');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get notification history for wallet
 * GET /api/alerts/history/:address
 */
app.get('/api/alerts/history/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  const { limit = 50 } = req.query;

  try {
    const notifications = await alertManager.getNotificationHistory(address, sanitizeLimit(limit, 50));

    res.json({
      walletAddress: address,
      notificationCount: notifications.length,
      notifications
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching notifications');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get known exchanges list
 * GET /api/data/exchanges
 */
app.get('/api/data/exchanges', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 200, 1000);
    const result = await db.pool.executeQuery(
      `SELECT address, exchange_name, exchange_type, is_verified FROM known_exchanges ORDER BY exchange_name LIMIT $1`,
      [cap]
    );

    res.json({
      count: result.rows.length,
      exchanges: result.rows
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching exchanges');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get known bridges list
 * GET /api/data/bridges
 */
app.get('/api/data/bridges', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 200, 1000);
    const result = await db.pool.executeQuery(
      `SELECT address, bridge_name, destination_chains, is_active FROM known_bridges ORDER BY bridge_name LIMIT $1`,
      [cap]
    );

    res.json({
      count: result.rows.length,
      bridges: result.rows
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching bridges');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 3)
// Exchange Coordination & Freeze Requests
// ============================================

import { exchangeCoordinator } from "./services/exchange-coordinator";

/**
 * List all exchange contacts
 * GET /api/exchanges/contacts
 */
app.get('/api/exchanges/contacts', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 200, 1000);
    const contacts = await exchangeCoordinator.listExchangeContacts();

    res.json({
      count: contacts.length,
      contacts: contacts.slice(0, cap)
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching exchange contacts');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get exchange contact by ID
 * GET /api/exchanges/contacts/:exchangeId
 */
app.get('/api/exchanges/contacts/:exchangeId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { exchangeId } = req.params;

  try {
    const contact = await exchangeCoordinator.getExchangeContact(exchangeId);

    if (!contact) {
      res.status(404).json({ error: 'Exchange contact not found' });
      return;
    }

    res.json(contact);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching exchange contact');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get exchange by deposit address
 * GET /api/exchanges/by-address/:address
 */
app.get('/api/exchanges/by-address/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    const contact = await exchangeCoordinator.getExchangeByAddress(address);

    if (!contact) {
      res.status(404).json({ error: 'Exchange not found for this address' });
      return;
    }

    res.json(contact);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching exchange by address');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new freeze request
 * POST /api/freeze-requests
 */
app.post('/api/freeze-requests', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { traceId, exchangeName, depositAddress, depositSignature, amount, victimWallet, tokenMint, tokenSymbol } = req.body;

  try {
    if (!traceId || !exchangeName || !depositAddress || !depositSignature || !amount || !victimWallet) {
      res.status(400).json({
        error: 'Missing required fields: traceId, exchangeName, depositAddress, depositSignature, amount, victimWallet'
      });
      return;
    }

    const request = await exchangeCoordinator.createFreezeRequest(
      traceId,
      exchangeName,
      depositAddress,
      depositSignature,
      amount,
      victimWallet,
      tokenMint,
      tokenSymbol
    );

    req.log.info({ freezeRequestId: request.requestId }, 'Freeze request created');
    res.status(201).json({
      success: true,
      request
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating freeze request');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * List all pending freeze requests
 * GET /api/freeze-requests/pending
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/pending', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 50, 500);
    const requests = await exchangeCoordinator.listPendingRequests();

    res.json({
      count: requests.length,
      requests: requests.slice(0, cap)
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching pending requests');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get requests needing follow-up
 * GET /api/freeze-requests/follow-up
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/follow-up', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 50, 500);
    const requests = await exchangeCoordinator.getRequestsNeedingFollowUp();

    res.json({
      count: requests.length,
      requests: requests.slice(0, cap)
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching follow-up requests');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get freeze request statistics
 * GET /api/freeze-requests/statistics
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/statistics', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const statistics = await exchangeCoordinator.getStatistics();

    res.json(statistics);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching statistics');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * List freeze requests for a trace
 * GET /api/freeze-requests/trace/:traceId
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/trace/:traceId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { traceId } = req.params;

  try {
    const requests = await exchangeCoordinator.listFreezeRequestsForTrace(traceId);

    res.json({
      traceId,
      count: requests.length,
      requests
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching freeze requests');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get freeze request by ID
 * GET /api/freeze-requests/:requestId
 * NOTE: This MUST be after all specific freeze-requests routes
 */
app.get('/api/freeze-requests/:requestId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { requestId: freezeRequestId } = req.params;

  try {
    const request = await exchangeCoordinator.getFreezeRequest(freezeRequestId);

    if (!request) {
      res.status(404).json({ error: 'Freeze request not found' });
      return;
    }

    res.json(request);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching freeze request');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update freeze request status
 * PATCH /api/freeze-requests/:requestId/status
 */
app.patch('/api/freeze-requests/:requestId/status', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params;
  const { status, exchangeTicketId, exchangeResponse } = req.body;

  try {
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    await exchangeCoordinator.updateRequestStatus(requestId, status, exchangeTicketId, exchangeResponse);

    req.log.info({ freezeRequestId: requestId, status }, 'Freeze request status updated');
    res.json({
      success: true,
      message: `Status updated to ${status}`
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error updating status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate evidence package for a freeze request
 * POST /api/freeze-requests/:requestId/evidence
 */
app.post('/api/freeze-requests/:requestId/evidence', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params;
  const { traceId, victimWallet, victimStatement } = req.body;

  try {
    if (!traceId || !victimWallet) {
      res.status(400).json({ error: 'traceId and victimWallet are required' });
      return;
    }

    const evidencePackage = await exchangeCoordinator.generateEvidencePackage(
      requestId,
      traceId,
      victimWallet,
      victimStatement
    );

    req.log.info({ packageId: evidencePackage.packageId }, 'Evidence package generated');
    res.status(201).json({
      success: true,
      evidencePackage
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generating evidence');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get evidence package by ID
 * GET /api/evidence/:packageId
 */
app.get('/api/evidence/:packageId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { packageId } = req.params;

  try {
    const evidencePackage = await exchangeCoordinator.getEvidencePackage(packageId);

    if (!evidencePackage) {
      res.status(404).json({ error: 'Evidence package not found' });
      return;
    }

    res.json(evidencePackage);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching evidence');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate freeze request email template
 * POST /api/freeze-requests/:requestId/email-template
 */
app.post('/api/freeze-requests/:requestId/email-template', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params;

  try {
    const request = await exchangeCoordinator.getFreezeRequest(requestId);
    if (!request) {
      res.status(404).json({ error: 'Freeze request not found' });
      return;
    }

    if (!request.evidencePackageId) {
      res.status(400).json({ error: 'Evidence package must be generated first' });
      return;
    }

    const evidencePackage = await exchangeCoordinator.getEvidencePackage(request.evidencePackageId);
    if (!evidencePackage) {
      res.status(404).json({ error: 'Evidence package not found' });
      return;
    }

    const exchangeContact = await exchangeCoordinator.getExchangeContact(request.exchangeId);
    if (!exchangeContact) {
      res.status(404).json({ error: 'Exchange contact not found' });
      return;
    }

    const template = exchangeCoordinator.generateFreezeRequestEmail(request, evidencePackage, exchangeContact);

    res.json({
      success: true,
      template,
      recipientEmail: exchangeContact.complianceEmail || exchangeContact.emergencyEmail
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generating email template');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Record follow-up action
 * POST /api/freeze-requests/:requestId/follow-up
 */
app.post('/api/freeze-requests/:requestId/follow-up', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params;
  const { nextFollowUpHours = 24 } = req.body;

  try {
    await exchangeCoordinator.recordFollowUp(requestId, nextFollowUpHours);

    res.json({
      success: true,
      message: `Follow-up recorded, next follow-up in ${nextFollowUpHours} hours`
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error recording follow-up');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 5)
// Transaction Simulation & Prevention
// ============================================

import { transactionSimulator } from "./services/transaction-simulator";

/**
 * Simulate a transaction before signing
 * POST /api/simulation/simulate
 */
app.post('/api/simulation/simulate', strictLimiter, validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { serializedTransaction, walletAddress, storeResult = true } = req.body;

  try {
    if (!serializedTransaction || !walletAddress) {
      res.status(400).json({ error: 'serializedTransaction and walletAddress are required' });
      return;
    }

    const result = await transactionSimulator.simulateTransaction(
      serializedTransaction,
      walletAddress
    );

    req.log.info({ riskLevel: result.riskLevel }, 'Simulation complete');
    res.json({
      success: true,
      simulation: result
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error simulating transaction');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Quick risk check for a transaction (lightweight)
 * POST /api/simulation/quick-check
 */
app.post('/api/simulation/quick-check', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { serializedTransaction } = req.body;

  try {
    if (!serializedTransaction) {
      res.status(400).json({ error: 'serializedTransaction is required' });
      return;
    }

    const result = await transactionSimulator.quickRiskCheck(serializedTransaction);

    req.log.info({ riskLevel: result.riskLevel }, 'Quick risk check complete');
    res.json({
      success: true,
      check: result
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error in quick check');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get simulation history for a wallet
 * GET /api/simulation/history/:walletAddress
 */
app.get('/api/simulation/history/:walletAddress', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress } = req.params;
  const { limit = 50 } = req.query;

  try {
    const history = await transactionSimulator.getSimulationHistory(
      walletAddress,
      sanitizeLimit(limit, 50)
    );

    res.json({
      walletAddress,
      count: history.length,
      simulations: history
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching simulation history');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific simulation by ID
 * GET /api/simulation/:simulationId
 */
app.get('/api/simulation/:simulationId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { simulationId } = req.params;

  try {
    const simResult = await db.pool.executeQuery(
      `SELECT * FROM transaction_simulations WHERE simulation_id = $1`,
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      res.status(404).json({ error: 'Simulation not found' });
      return;
    }

    const row = simResult.rows[0];
    const simulation = {
      simulationId: row.simulation_id,
      success: row.success,
      riskLevel: row.risk_level,
      riskScore: row.risk_score,
      warnings: row.warnings || [],
      effects: row.effects || [],
      simulatedAt: row.simulated_at,
    };

    res.json(simulation);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching simulation');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get list of verified programs
 * GET /api/simulation/programs
 * NOTE: This must be before /:simulationId route - but we define it here, Express handles it correctly
 */
app.get('/api/programs/verified', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 200, 1000);
    const result = await db.pool.executeQuery(
      `SELECT program_id, program_name, category, description, website_url, is_verified, is_audited, risk_level
       FROM verified_programs
       ORDER BY program_name
       LIMIT $1`,
      [cap]
    );

    res.json({
      count: result.rows.length,
      programs: result.rows
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching verified programs');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check if a program is verified
 * GET /api/programs/:programId
 */
app.get('/api/programs/:programId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { programId } = req.params;

  try {
    const result = await db.pool.executeQuery(
      `SELECT program_id, program_name, category, description, website_url, is_verified, is_audited, audit_url, risk_level
       FROM verified_programs
       WHERE program_id = $1`,
      [programId]
    );

    if (result.rows.length === 0) {
      res.json({
        programId,
        isVerified: false,
        isKnown: false,
        message: 'Program not found in verified database'
      });
      return;
    }

    res.json({
      ...result.rows[0],
      isKnown: true
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error checking program');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get simulation alerts for a wallet
 * GET /api/simulation/alerts/:walletAddress
 */
app.get('/api/simulation/alerts/:walletAddress', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { walletAddress } = req.params;
  const { limit = 50, acknowledged } = req.query;

  try {
    let query = `SELECT * FROM simulation_alerts WHERE wallet_address = $1`;
    const params: any[] = [walletAddress];

    if (acknowledged !== undefined) {
      query += ` AND is_acknowledged = $2`;
      params.push(acknowledged === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(sanitizeLimit(limit, 50));

    const result = await db.pool.executeQuery(query, params);

    res.json({
      walletAddress,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching simulation alerts');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Acknowledge a simulation alert
 * POST /api/simulation/alerts/:alertId/acknowledge
 */
app.post('/api/simulation/alerts/:alertId/acknowledge', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { alertId } = req.params;

  try {
    await db.pool.executeQuery(
      `UPDATE simulation_alerts SET is_acknowledged = true, acknowledged_at = NOW() WHERE alert_id = $1`,
      [alertId]
    );

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error acknowledging simulation alert');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 6)
// Threat Intelligence Data Source Integration
// ============================================

import { threatIntelligenceService } from "./services/threat-intelligence";

// Wire up threat intelligence to existing services
compromiseDetector.setThreatIntel(threatIntelligenceService);
fundTracker.setThreatIntel(threatIntelligenceService);
exchangeCoordinator.setThreatIntel(threatIntelligenceService);

/**
 * Trigger threat intel sync (all or specific source)
 * POST /api/threat-intel/sync
 */
app.post('/api/threat-intel/sync', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { sourceId } = req.body;

  try {
    if (sourceId) {
      const result = await threatIntelligenceService.syncSource(sourceId);

      // Refresh service caches after sync
      await Promise.all([
        compromiseDetector.refreshKnownAddresses(),
        fundTracker.refreshKnownAddresses(),
      ]);

      req.log.info({ sourceId, addressesNew: result.addressesNew, addressesUpdated: result.addressesUpdated }, 'Source sync complete');
      res.json({ success: true, results: [result] });
    } else {
      const results = await threatIntelligenceService.syncAll();

      // Refresh service caches after sync
      await Promise.all([
        compromiseDetector.refreshKnownAddresses(),
        fundTracker.refreshKnownAddresses(),
      ]);

      req.log.info({ sourcesCount: results.length }, 'Full threat intel sync complete');
      res.json({ success: true, results });
    }
  } catch (error: any) {
    req.log.error({ err: error }, 'Error during threat intel sync');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get threat intel system status
 * GET /api/threat-intel/status
 */
app.get('/api/threat-intel/status', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await threatIntelligenceService.getStatus();

    req.log.info({ sources: status.sources.length, totalAddresses: status.totalMaliciousAddresses }, 'Threat intel status retrieved');
    res.json(status);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching threat intel status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * List threat intel sources with per-source statistics
 * GET /api/threat-intel/sources
 */
app.get('/api/threat-intel/sources', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const cap = sanitizeLimit(limit, 100, 500);
    const sources = await threatIntelligenceService.getSources();

    res.json({
      count: sources.length,
      sources: sources.slice(0, cap)
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error fetching threat intel sources');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Arkham entity lookup for a specific address
 * GET /api/threat-intel/entity/:address
 */
app.get('/api/threat-intel/entity/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    if (!address || address.length < 32 || address.length > 44) {
      res.status(400).json({ error: 'Invalid address format' });
      return;
    }

    const entity = await threatIntelligenceService.lookupEntityCached(address);

    req.log.info({ entityName: entity?.entityName || null }, 'Entity lookup complete');
    res.json({
      address,
      entity,
      source: entity ? 'arkham' : null,
      cached: entity ? true : false,
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error looking up entity');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check if a domain is known scam/phishing
 * GET /api/threat-intel/domain/:domain
 */
app.get('/api/threat-intel/domain/:domain', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.params;

  try {
    if (!domain || domain.length < 3) {
      res.status(400).json({ error: 'Invalid domain' });
      return;
    }

    const result = await threatIntelligenceService.checkDomain(domain);

    req.log.info({ domain, isScam: result.isScam }, 'Domain check complete');
    res.json(result);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error checking domain');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Real-time address risk check (local DB + GoPlus)
 * GET /api/threat-intel/address/:address
 */
app.get('/api/threat-intel/address/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;

  try {
    // Validate base58 format (32-44 alphanumeric, no 0/O/I/l)
    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      res.status(400).json({ error: 'Invalid base58 address format' });
      return;
    }

    // Check local DB first
    const localResult = await db.pool.executeQuery(
      `SELECT address, label, category, external_sources, confidence_score
       FROM known_malicious_delegates WHERE address = $1`,
      [address]
    );

    const isMalicious = localResult.rows.length > 0;
    const sources: string[] = isMalicious ? (localResult.rows[0].external_sources || []) : [];

    // Query GoPlus for real-time risk data
    const goPlusResult = await threatIntelligenceService.checkAddressGoPlus(address);

    req.log.info({ isMalicious, goPlusRisky: goPlusResult.isRisky }, 'Address risk check complete');
    res.json({
      address,
      isMalicious: isMalicious || goPlusResult.isRisky,
      sources,
      goPlusRisk: goPlusResult.isRisky || goPlusResult.riskFlags.length > 0
        ? { isRisky: goPlusResult.isRisky, riskFlags: goPlusResult.riskFlags }
        : null,
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error checking address');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// User & API Key Management (wallet-based auth)
// ============================================
import crypto from 'crypto';

// POST /api/users/ensure - Upsert user by wallet_address
app.post('/api/users/ensure', validateToken, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const result = await db.pool.executeQuery(
      `INSERT INTO users (wallet_address, last_login_at)
       VALUES ($1, NOW())
       ON CONFLICT (wallet_address) DO UPDATE SET last_login_at = NOW()
       RETURNING id, wallet_address, created_at, last_login_at`,
      [walletAddress]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error ensuring user');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user-api-keys/:walletAddress - List API keys for a wallet
app.get('/api/user-api-keys/:walletAddress', validateToken, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const result = await db.pool.executeQuery(
      `SELECT id, name,
              CONCAT(LEFT(key, 8), '...', RIGHT(key, 4)) as key,
              wallet_address as "walletAddress",
              created_at as "createdAt",
              last_used as "lastUsed",
              is_active as "isActive",
              expires_at as "expiresAt",
              permissions,
              usage_limit as "usageLimit",
              current_usage as "currentUsage",
              ip_restrictions as "ipRestrictions",
              description
       FROM user_api_keys
       WHERE wallet_address = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [walletAddress]
    );

    res.json(result.rows);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error listing API keys');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user-api-keys/:walletAddress - Create API key
app.post('/api/user-api-keys/:walletAddress', validateToken, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { name, expiresAt, permissions, usageLimit, ipRestrictions, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    // Ensure user exists
    await db.pool.executeQuery(
      `INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING`,
      [walletAddress]
    );

    // Generate API key
    const randomBytes = crypto.randomBytes(32);
    const apiKey = `lav_live_${randomBytes.toString('base64').replace(/[+/=]/g, '')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await db.pool.executeQuery(
      `INSERT INTO user_api_keys (name, key, wallet_address, expires_at, permissions, usage_limit, ip_restrictions, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name,
                 CONCAT(LEFT(key, 8), '...', RIGHT(key, 4)) as key,
                 wallet_address as "walletAddress",
                 created_at as "createdAt",
                 is_active as "isActive",
                 expires_at as "expiresAt",
                 permissions,
                 usage_limit as "usageLimit",
                 current_usage as "currentUsage",
                 ip_restrictions as "ipRestrictions",
                 description`,
      [
        name,
        hashedKey,
        walletAddress,
        expiresAt || null,
        permissions || ['wallet-check:read'],
        usageLimit || null,
        ipRestrictions || [],
        description || null,
      ]
    );

    res.status(201).json({
      message: 'API key created successfully',
      apiKey,
      apiKeyDoc: result.rows[0],
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating API key');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user-api-keys/:walletAddress/:keyId - Get specific API key
app.get('/api/user-api-keys/:walletAddress/:keyId', validateToken, async (req: Request, res: Response) => {
  try {
    const { walletAddress, keyId } = req.params;

    const result = await db.pool.executeQuery(
      `SELECT id, name,
              CONCAT(LEFT(key, 8), '...', RIGHT(key, 4)) as key,
              wallet_address as "walletAddress",
              created_at as "createdAt",
              last_used as "lastUsed",
              is_active as "isActive",
              expires_at as "expiresAt",
              permissions,
              usage_limit as "usageLimit",
              current_usage as "currentUsage",
              ip_restrictions as "ipRestrictions",
              description
       FROM user_api_keys
       WHERE id = $1 AND wallet_address = $2`,
      [keyId, walletAddress]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error getting API key');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/user-api-keys/:walletAddress/:keyId - Revoke API key
app.delete('/api/user-api-keys/:walletAddress/:keyId', validateToken, async (req: Request, res: Response) => {
  try {
    const { walletAddress, keyId } = req.params;

    const result = await db.pool.executeQuery(
      `UPDATE user_api_keys SET is_active = false
       WHERE id = $1 AND wallet_address = $2
       RETURNING id`,
      [keyId, walletAddress]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'API key not found or not owned by user' });
      return;
    }

    res.json({ message: 'API key revoked successfully' });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error revoking API key');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SSE endpoint for real-time alerts
import { AlertManager } from './services/alert-manager';

const MAX_SSE_CONNECTIONS = 100;
let sseConnectionCount = 0;

app.get('/api/alerts/stream', validateApiKey, (req: Request, res: Response): any => {
  if (sseConnectionCount >= MAX_SSE_CONNECTIONS) {
    return res.status(503).json({ error: 'Too many concurrent connections' });
  }

  sseConnectionCount++;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);

  const onAlert = (data: any) => {
    res.write(`event: alert\ndata: ${JSON.stringify(data)}\n\n`);
  };

  AlertManager.events.on('alert', onAlert);

  req.on('close', () => {
    sseConnectionCount--;
    clearInterval(heartbeat);
    AlertManager.events.off('alert', onAlert);
  });
});

// Export the Express app
export { app };
export default app;

// Start the server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running');
});
