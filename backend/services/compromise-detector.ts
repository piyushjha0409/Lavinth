/**
 * Compromise Detector Service
 *
 * Monitors wallets for signs of compromise and generates alerts.
 * Part of WalletShield Recovery - Phase 2
 */

import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/config";
import logger from "../logger";
import type { ThreatIntelligenceService } from "./threat-intelligence";

dotenv.config();

// Helius RPC configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
  .split(",")
  .map((key) => key.trim())
  .filter((key) => key.length > 0);

const RPC_ENDPOINTS = HELIUS_API_KEYS.length > 0
  ? HELIUS_API_KEYS.map((apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`)
  : ["https://api.mainnet-beta.solana.com"];

// Detection thresholds
const DETECTION_CONFIG = {
  // Large outflow detection
  largeOutflowThresholdSol: parseFloat(process.env.LARGE_OUTFLOW_THRESHOLD || "10"),
  largeOutflowThresholdPercent: parseFloat(process.env.LARGE_OUTFLOW_PERCENT || "50"),

  // Rapid drain detection
  rapidDrainWindowMinutes: parseInt(process.env.RAPID_DRAIN_WINDOW || "5"),
  rapidDrainTransactionCount: parseInt(process.env.RAPID_DRAIN_TX_COUNT || "3"),

  // Monitoring interval
  monitoringIntervalMs: parseInt(process.env.MONITORING_INTERVAL || "30000"),

  // Transaction lookback
  transactionLookbackCount: parseInt(process.env.TX_LOOKBACK_COUNT || "20"),
};

// Interfaces
export interface MonitoredWallet {
  walletAddress: string;
  userId?: string;
  monitoringLevel: "standard" | "high" | "critical";
  alertChannels: AlertChannels;
  baselineBalance: number;
  lastKnownBalance: number;
  lastActivityAt?: Date;
  isCompromised: boolean;
  compromiseDetectedAt?: Date;
}

export interface AlertChannels {
  discord?: string;
  webhook?: string;
}

export interface CompromiseAlert {
  alertId: string;
  walletAddress: string;
  alertType: AlertType;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  metadata: any;
  createdAt: Date;
}

export type AlertType =
  | "large_outflow"
  | "rapid_drain"
  | "suspicious_approval"
  | "known_drainer"
  | "unusual_activity"
  | "bridge_transfer"
  | "exchange_deposit";

export interface WalletTransaction {
  signature: string;
  walletAddress: string;
  transactionType: string;
  amount: number;
  tokenMint?: string;
  counterparty?: string;
  isSuspicious: boolean;
  suspicionReasons: string[];
  riskScore: number;
  timestamp: Date;
}

export interface DetectionResult {
  isCompromised: boolean;
  alerts: CompromiseAlert[];
  transactions: WalletTransaction[];
  riskScore: number;
}

/**
 * CompromiseDetector class
 * Monitors wallets and detects signs of compromise
 */
export class CompromiseDetector {
  private connections: Connection[];
  private currentConnectionIndex: number = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private knownDrainers: Set<string> = new Set();
  private knownExchanges: Map<string, string> = new Map();
  private knownBridges: Map<string, string> = new Map();
  private threatIntel: ThreatIntelligenceService | null = null;

  constructor() {
    this.connections = RPC_ENDPOINTS.map(
      (endpoint) => new Connection(endpoint, "confirmed")
    );
    this.loadKnownAddresses();
  }

  /**
   * Set the threat intelligence service for enhanced detection
   */
  setThreatIntel(service: ThreatIntelligenceService): void {
    this.threatIntel = service;
  }

  /**
   * Refresh known addresses from database (public wrapper)
   */
  async refreshKnownAddresses(): Promise<void> {
    await this.loadKnownAddresses();
  }

  /**
   * Get next connection (round-robin)
   */
  private getConnection(): Connection {
    const connection = this.connections[this.currentConnectionIndex];
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
    return connection;
  }

  /**
   * Load known drainer, exchange, and bridge addresses from database
   */
  private async loadKnownAddresses(): Promise<void> {
    try {
      // Load known malicious delegates/drainers
      const drainers = await pool.executeQuery(
        `SELECT address FROM known_malicious_delegates`
      );
      drainers.rows.forEach((row) => this.knownDrainers.add(row.address));

      // Load known exchanges
      const exchanges = await pool.executeQuery(
        `SELECT address, exchange_name FROM known_exchanges`
      );
      exchanges.rows.forEach((row) =>
        this.knownExchanges.set(row.address, row.exchange_name)
      );

      // Load known bridges
      const bridges = await pool.executeQuery(
        `SELECT address, bridge_name FROM known_bridges`
      );
      bridges.rows.forEach((row) =>
        this.knownBridges.set(row.address, row.bridge_name)
      );

      logger.info({ source: 'CompromiseDetector', drainers: this.knownDrainers.size, exchanges: this.knownExchanges.size, bridges: this.knownBridges.size }, 'Loaded known addresses');
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error loading known addresses');
    }
  }

  /**
   * Register a wallet for monitoring
   */
  async registerWallet(
    walletAddress: string,
    userId?: string,
    alertChannels?: AlertChannels,
    monitoringLevel: "standard" | "high" | "critical" = "standard"
  ): Promise<MonitoredWallet> {
    const connection = this.getConnection();

    // Get current balance
    const pubkey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(pubkey);
    const balanceSol = balance / 1e9;

    const wallet: MonitoredWallet = {
      walletAddress,
      userId,
      monitoringLevel,
      alertChannels: alertChannels || {},
      baselineBalance: balanceSol,
      lastKnownBalance: balanceSol,
      isCompromised: false,
    };

    // Store in database
    await pool.executeQuery(
      `INSERT INTO monitored_wallets (
        wallet_address, user_id, monitoring_level, alert_channels,
        baseline_balance, last_known_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        monitoring_level = EXCLUDED.monitoring_level,
        alert_channels = EXCLUDED.alert_channels,
        updated_at = CURRENT_TIMESTAMP`,
      [
        walletAddress,
        userId,
        monitoringLevel,
        JSON.stringify(alertChannels || {}),
        balanceSol,
        balanceSol,
      ]
    );

    return wallet;
  }

  /**
   * Analyze a wallet for signs of compromise
   */
  async analyzeWallet(walletAddress: string): Promise<DetectionResult> {
    const connection = this.getConnection();
    const pubkey = new PublicKey(walletAddress);
    const alerts: CompromiseAlert[] = [];
    const transactions: WalletTransaction[] = [];
    let isCompromised = false;
    let riskScore = 0;

    try {
      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: DETECTION_CONFIG.transactionLookbackCount,
      });

      // Get current balance
      const currentBalance = await connection.getBalance(pubkey);
      const currentBalanceSol = currentBalance / 1e9;

      // Get monitored wallet info
      const walletInfo = await this.getMonitoredWallet(walletAddress);
      const baselineBalance = walletInfo?.baselineBalance || currentBalanceSol;

      // Analyze each transaction
      for (const sig of signatures) {
        const tx = await this.analyzeTransaction(connection, sig, walletAddress);
        if (tx) {
          transactions.push(tx);
          riskScore += tx.riskScore;
        }
      }

      // Detection: Large outflow
      const largeOutflowAlert = this.detectLargeOutflow(
        walletAddress,
        baselineBalance,
        currentBalanceSol,
        transactions
      );
      if (largeOutflowAlert) {
        alerts.push(largeOutflowAlert);
        if (largeOutflowAlert.severity === "critical") isCompromised = true;
      }

      // Detection: Rapid drain
      const rapidDrainAlert = this.detectRapidDrain(walletAddress, transactions);
      if (rapidDrainAlert) {
        alerts.push(rapidDrainAlert);
        if (rapidDrainAlert.severity === "critical") isCompromised = true;
      }

      // Detection: Known drainer interaction
      const drainerAlert = this.detectKnownDrainer(walletAddress, transactions);
      if (drainerAlert) {
        alerts.push(drainerAlert);
        isCompromised = true;
      }

      // Detection: Exchange deposits (potential laundering)
      const exchangeAlerts = this.detectExchangeDeposits(walletAddress, transactions);
      alerts.push(...exchangeAlerts);

      // Detection: Bridge transfers
      const bridgeAlerts = this.detectBridgeTransfers(walletAddress, transactions);
      alerts.push(...bridgeAlerts);

      // Update wallet status
      if (isCompromised && walletInfo) {
        await this.markWalletCompromised(walletAddress);
      }

      // Store alerts
      for (const alert of alerts) {
        await this.storeAlert(alert);
      }

      // Update last known balance
      await this.updateWalletBalance(walletAddress, currentBalanceSol);

      return {
        isCompromised,
        alerts,
        transactions,
        riskScore: Math.min(riskScore, 100),
      };
    } catch (error: any) {
      logger.error({ err: error, source: 'CompromiseDetector', walletAddress }, 'Error analyzing wallet');
      return {
        isCompromised: false,
        alerts: [],
        transactions: [],
        riskScore: 0,
      };
    }
  }

  /**
   * Analyze a single transaction
   */
  private async analyzeTransaction(
    connection: Connection,
    sigInfo: ConfirmedSignatureInfo,
    walletAddress: string
  ): Promise<WalletTransaction | null> {
    try {
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) return null;

      const suspicionReasons: string[] = [];
      let riskScore = 0;
      let transactionType = "unknown";
      let amount = 0;
      let counterparty: string | undefined;
      let tokenMint: string | undefined;

      // Analyze pre/post balances to determine flow
      const preBalance = tx.meta.preBalances[0] || 0;
      const postBalance = tx.meta.postBalances[0] || 0;
      const balanceChange = (postBalance - preBalance) / 1e9;

      if (balanceChange < 0) {
        transactionType = "transfer_out";
        amount = Math.abs(balanceChange);

        // Check if large outflow
        if (amount > DETECTION_CONFIG.largeOutflowThresholdSol) {
          suspicionReasons.push("Large outflow detected");
          riskScore += 30;
        }
      } else if (balanceChange > 0) {
        transactionType = "transfer_in";
        amount = balanceChange;
      }

      // Check for token transfers
      if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
        // Analyze token balance changes
        for (const postToken of tx.meta.postTokenBalances) {
          const preToken = tx.meta.preTokenBalances.find(
            (t) => t.accountIndex === postToken.accountIndex
          );
          if (preToken && postToken.uiTokenAmount && preToken.uiTokenAmount) {
            const tokenChange =
              (postToken.uiTokenAmount.uiAmount || 0) -
              (preToken.uiTokenAmount.uiAmount || 0);
            if (tokenChange < 0) {
              tokenMint = postToken.mint;
              transactionType = "token_transfer_out";
            }
          }
        }
      }

      // Extract counterparty from instructions
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if ("parsed" in ix && ix.parsed) {
          const parsed = ix.parsed as any;
          if (parsed.info?.destination) {
            counterparty = parsed.info.destination;
          } else if (parsed.info?.newAuthority) {
            counterparty = parsed.info.newAuthority;
          }
        }
      }

      // Check if counterparty is known drainer
      if (counterparty && this.knownDrainers.has(counterparty)) {
        suspicionReasons.push("Interaction with known drainer");
        riskScore += 50;
      }

      // Check if counterparty is exchange
      if (counterparty && this.knownExchanges.has(counterparty)) {
        suspicionReasons.push(`Transfer to exchange: ${this.knownExchanges.get(counterparty)}`);
        riskScore += 10;
      }

      // Check if counterparty is bridge
      if (counterparty && this.knownBridges.has(counterparty)) {
        suspicionReasons.push(`Bridge transfer: ${this.knownBridges.get(counterparty)}`);
        riskScore += 15;
      }

      // Helius enhanced parsing for richer type classification
      if (this.threatIntel) {
        try {
          const enhanced = await this.threatIntel.parseTransactionSignatures([sigInfo.signature]);
          if (enhanced.length > 0) {
            const eTx = enhanced[0];
            if (eTx.type && eTx.type !== "UNKNOWN") {
              transactionType = eTx.type.toLowerCase();
            }
            // Extract counterparty from native transfers if not already found
            if (!counterparty && eTx.nativeTransfers?.length > 0) {
              const outTransfer = eTx.nativeTransfers.find(
                (t) => t.fromUserAccount === walletAddress
              );
              if (outTransfer) {
                counterparty = outTransfer.toUserAccount;
              }
            }
          }
        } catch (err) {
          // Helius enhancement failed, continue with raw parsing
        }
      }

      const isSuspicious = suspicionReasons.length > 0;

      const walletTx: WalletTransaction = {
        signature: sigInfo.signature,
        walletAddress,
        transactionType,
        amount,
        tokenMint,
        counterparty,
        isSuspicious,
        suspicionReasons,
        riskScore,
        timestamp: new Date((sigInfo.blockTime || 0) * 1000),
      };

      // Store transaction
      await this.storeTransaction(walletTx);

      return walletTx;
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error analyzing transaction');
      return null;
    }
  }

  /**
   * Detect large outflow
   */
  private detectLargeOutflow(
    walletAddress: string,
    baselineBalance: number,
    currentBalance: number,
    transactions: WalletTransaction[]
  ): CompromiseAlert | null {
    const balanceLoss = baselineBalance - currentBalance;
    const lossPercent = baselineBalance > 0 ? (balanceLoss / baselineBalance) * 100 : 0;

    if (
      balanceLoss > DETECTION_CONFIG.largeOutflowThresholdSol ||
      lossPercent > DETECTION_CONFIG.largeOutflowThresholdPercent
    ) {
      const severity = lossPercent > 80 ? "critical" : lossPercent > 50 ? "high" : "medium";

      return {
        alertId: uuidv4(),
        walletAddress,
        alertType: "large_outflow",
        severity,
        title: "Large Balance Outflow Detected",
        description: `Wallet lost ${balanceLoss.toFixed(4)} SOL (${lossPercent.toFixed(1)}% of baseline balance)`,
        metadata: {
          baselineBalance,
          currentBalance,
          balanceLoss,
          lossPercent,
        },
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect rapid drain pattern
   */
  private detectRapidDrain(
    walletAddress: string,
    transactions: WalletTransaction[]
  ): CompromiseAlert | null {
    const windowMs = DETECTION_CONFIG.rapidDrainWindowMinutes * 60 * 1000;
    const now = Date.now();

    // Filter outgoing transactions within window
    const recentOutflows = transactions.filter(
      (tx) =>
        tx.transactionType.includes("out") &&
        now - tx.timestamp.getTime() < windowMs
    );

    if (recentOutflows.length >= DETECTION_CONFIG.rapidDrainTransactionCount) {
      const totalAmount = recentOutflows.reduce((sum, tx) => sum + tx.amount, 0);

      return {
        alertId: uuidv4(),
        walletAddress,
        alertType: "rapid_drain",
        severity: "critical",
        title: "Rapid Drain Detected",
        description: `${recentOutflows.length} outgoing transactions totaling ${totalAmount.toFixed(4)} SOL in ${DETECTION_CONFIG.rapidDrainWindowMinutes} minutes`,
        metadata: {
          transactionCount: recentOutflows.length,
          totalAmount,
          windowMinutes: DETECTION_CONFIG.rapidDrainWindowMinutes,
          transactions: recentOutflows.map((tx) => tx.signature),
        },
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect interaction with known drainer
   */
  private detectKnownDrainer(
    walletAddress: string,
    transactions: WalletTransaction[]
  ): CompromiseAlert | null {
    const drainerTxs = transactions.filter(
      (tx) => tx.counterparty && this.knownDrainers.has(tx.counterparty)
    );

    if (drainerTxs.length > 0) {
      return {
        alertId: uuidv4(),
        walletAddress,
        alertType: "known_drainer",
        severity: "critical",
        title: "Known Drainer Detected",
        description: `Wallet interacted with ${drainerTxs.length} known drainer address(es)`,
        metadata: {
          drainerAddresses: [...new Set(drainerTxs.map((tx) => tx.counterparty))],
          transactions: drainerTxs.map((tx) => tx.signature),
        },
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Detect deposits to exchanges
   */
  private detectExchangeDeposits(
    walletAddress: string,
    transactions: WalletTransaction[]
  ): CompromiseAlert[] {
    const alerts: CompromiseAlert[] = [];

    const exchangeTxs = transactions.filter(
      (tx) =>
        tx.counterparty &&
        this.knownExchanges.has(tx.counterparty) &&
        tx.transactionType.includes("out")
    );

    for (const tx of exchangeTxs) {
      const exchangeName = this.knownExchanges.get(tx.counterparty!);
      alerts.push({
        alertId: uuidv4(),
        walletAddress,
        alertType: "exchange_deposit",
        severity: "medium",
        title: `Deposit to ${exchangeName}`,
        description: `${tx.amount.toFixed(4)} SOL deposited to ${exchangeName}`,
        metadata: {
          exchangeName,
          exchangeAddress: tx.counterparty,
          amount: tx.amount,
          signature: tx.signature,
        },
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Detect bridge transfers
   */
  private detectBridgeTransfers(
    walletAddress: string,
    transactions: WalletTransaction[]
  ): CompromiseAlert[] {
    const alerts: CompromiseAlert[] = [];

    const bridgeTxs = transactions.filter(
      (tx) =>
        tx.counterparty &&
        this.knownBridges.has(tx.counterparty) &&
        tx.transactionType.includes("out")
    );

    for (const tx of bridgeTxs) {
      const bridgeName = this.knownBridges.get(tx.counterparty!);
      alerts.push({
        alertId: uuidv4(),
        walletAddress,
        alertType: "bridge_transfer",
        severity: "high",
        title: `Bridge Transfer via ${bridgeName}`,
        description: `${tx.amount.toFixed(4)} SOL bridged via ${bridgeName} - funds may be leaving Solana`,
        metadata: {
          bridgeName,
          bridgeAddress: tx.counterparty,
          amount: tx.amount,
          signature: tx.signature,
        },
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Store transaction in database
   */
  private async storeTransaction(tx: WalletTransaction): Promise<void> {
    try {
      await pool.executeQuery(
        `INSERT INTO wallet_transactions (
          wallet_address, signature, transaction_type, amount, token_mint,
          counterparty, is_suspicious, suspicion_reasons, risk_score, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (signature) DO UPDATE SET
          is_suspicious = EXCLUDED.is_suspicious,
          suspicion_reasons = EXCLUDED.suspicion_reasons,
          risk_score = EXCLUDED.risk_score`,
        [
          tx.walletAddress,
          tx.signature,
          tx.transactionType,
          tx.amount,
          tx.tokenMint,
          tx.counterparty,
          tx.isSuspicious,
          tx.suspicionReasons,
          tx.riskScore,
          tx.timestamp,
        ]
      );
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error storing transaction');
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: CompromiseAlert): Promise<void> {
    try {
      await pool.executeQuery(
        `INSERT INTO compromise_alerts (
          alert_id, wallet_address, alert_type, severity, title, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (alert_id) DO NOTHING`,
        [
          alert.alertId,
          alert.walletAddress,
          alert.alertType,
          alert.severity,
          alert.title,
          alert.description,
          JSON.stringify(alert.metadata),
        ]
      );
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error storing alert');
    }
  }

  /**
   * Get monitored wallet from database
   */
  async getMonitoredWallet(walletAddress: string): Promise<MonitoredWallet | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM monitored_wallets WHERE wallet_address = $1`,
        [walletAddress]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        walletAddress: row.wallet_address,
        userId: row.user_id,
        monitoringLevel: row.monitoring_level,
        alertChannels: row.alert_channels,
        baselineBalance: parseFloat(row.baseline_balance),
        lastKnownBalance: parseFloat(row.last_known_balance),
        lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : undefined,
        isCompromised: row.is_compromised,
        compromiseDetectedAt: row.compromise_detected_at
          ? new Date(row.compromise_detected_at)
          : undefined,
      };
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error getting monitored wallet');
      return null;
    }
  }

  /**
   * Mark wallet as compromised
   */
  private async markWalletCompromised(walletAddress: string): Promise<void> {
    try {
      await pool.executeQuery(
        `UPDATE monitored_wallets SET
          is_compromised = true,
          compromise_detected_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = $1`,
        [walletAddress]
      );
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error marking wallet compromised');
    }
  }

  /**
   * Update wallet balance
   */
  private async updateWalletBalance(walletAddress: string, balance: number): Promise<void> {
    try {
      await pool.executeQuery(
        `UPDATE monitored_wallets SET
          last_known_balance = $2,
          last_activity_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = $1`,
        [walletAddress, balance]
      );
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error updating wallet balance');
    }
  }

  /**
   * Get alerts for a wallet
   */
  async getAlerts(walletAddress: string, limit: number = 50): Promise<CompromiseAlert[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM compromise_alerts
         WHERE wallet_address = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [walletAddress, limit]
      );

      return result.rows.map((row) => ({
        alertId: row.alert_id,
        walletAddress: row.wallet_address,
        alertType: row.alert_type,
        severity: row.severity,
        title: row.title,
        description: row.description,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error getting alerts');
      return [];
    }
  }

  /**
   * Get recent transactions for a wallet
   */
  async getTransactions(walletAddress: string, limit: number = 50): Promise<WalletTransaction[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM wallet_transactions
         WHERE wallet_address = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [walletAddress, limit]
      );

      return result.rows.map((row) => ({
        signature: row.signature,
        walletAddress: row.wallet_address,
        transactionType: row.transaction_type,
        amount: parseFloat(row.amount),
        tokenMint: row.token_mint,
        counterparty: row.counterparty,
        isSuspicious: row.is_suspicious,
        suspicionReasons: row.suspicion_reasons || [],
        riskScore: row.risk_score,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error getting transactions');
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await pool.executeQuery(
        `UPDATE compromise_alerts SET
          is_acknowledged = true,
          acknowledged_at = CURRENT_TIMESTAMP
        WHERE alert_id = $1`,
        [alertId]
      );
    } catch (error) {
      logger.error({ err: error, source: 'CompromiseDetector' }, 'Error acknowledging alert');
    }
  }
}

// Export singleton instance
export const compromiseDetector = new CompromiseDetector();
export default compromiseDetector;
