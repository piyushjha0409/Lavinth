/**
 * Forensic Analyzer Service
 *
 * Performs deep forensic analysis on compromised wallets:
 * - Attack timeline reconstruction
 * - Attack vector identification
 * - Threat actor attribution
 * - Asset inventory and risk classification
 * - Executive summary and recommendations
 *
 * Part of WalletShield Recovery - Phase 7
 */

import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

const RPC_ENDPOINTS =
  HELIUS_API_KEYS.length > 0
    ? HELIUS_API_KEYS.map(
        (apiKey) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
      )
    : ["https://api.mainnet-beta.solana.com"];

// Forensic analysis config
const FORENSIC_CONFIG = {
  maxTransactions: parseInt(process.env.FORENSIC_TX_LIMIT || "10"),
  maxTimelineEvents: 500,
};

// ============================================
// Interfaces
// ============================================

export interface ForensicReport {
  reportId: string;
  walletAddress: string;
  attackVector: string;
  firstCompromiseAt: string | null;
  lastDrainAt: string | null;
  totalStolen: number;
  totalAtRisk: number;
  threatActors: ThreatActor[];
  affectedAssets: AffectedAsset[];
  executiveSummary: string;
  recommendations: string[];
  confidenceScore: number;
  status: string;
  createdAt: string;
  timeline?: TimelineEvent[];
}

export interface TimelineEvent {
  id?: number;
  reportId: string;
  eventType: string;
  timestamp: string;
  signature: string | null;
  description: string;
  fromAddress: string | null;
  toAddress: string | null;
  amount: number | null;
  tokenMint: string | null;
  severity: string;
  metadata: any;
}

export interface ThreatActor {
  address: string;
  label: string | null;
  source: string;
  confidence: number;
}

export interface AffectedAsset {
  mint: string;
  symbol: string;
  amount: number;
  status: "stolen" | "at_risk" | "safe";
}

// ============================================
// ForensicAnalyzer Class
// ============================================

export class ForensicAnalyzer {
  private connections: Connection[];
  private currentConnectionIndex: number = 0;
  private threatIntel: ThreatIntelligenceService | null = null;
  private maliciousCache: Set<string> = new Set();
  private maliciousCacheLoaded: boolean = false;

  constructor() {
    this.connections = RPC_ENDPOINTS.map(
      (endpoint) => new Connection(endpoint, "confirmed")
    );
  }

  /**
   * Load all known malicious addresses into memory for fast lookup
   */
  private async ensureMaliciousCache(): Promise<void> {
    if (this.maliciousCacheLoaded) return;
    try {
      const result = await pool.executeQuery(
        `SELECT address FROM known_malicious_delegates`
      );
      for (const row of result.rows) {
        this.maliciousCache.add(row.address);
      }
      this.maliciousCacheLoaded = true;
      logger.info({ count: this.maliciousCache.size }, "Loaded malicious address cache for forensics");
    } catch {
      // Fall back to per-query checks
    }
  }

  /**
   * Set the threat intelligence service for enhanced attribution
   */
  setThreatIntel(service: ThreatIntelligenceService): void {
    this.threatIntel = service;
  }

  /**
   * Get next connection (round-robin)
   */
  private getConnection(): Connection {
    const connection = this.connections[this.currentConnectionIndex];
    this.currentConnectionIndex =
      (this.currentConnectionIndex + 1) % this.connections.length;
    return connection;
  }

  /**
   * Run full forensic analysis on a wallet
   */
  async analyzeWallet(walletAddress: string): Promise<ForensicReport> {
    const reportId = `fr_${uuidv4()}`;
    const connection = this.getConnection();

    logger.info(
      { reportId, walletAddress },
      "Starting forensic analysis"
    );

    try {
      // Load malicious addresses into memory for fast lookup
      await this.ensureMaliciousCache();

      // Create pending report
      await pool.executeQuery(
        `INSERT INTO forensic_reports (report_id, wallet_address, status)
         VALUES ($1, $2, 'analyzing')`,
        [reportId, walletAddress]
      );

      const pubkey = new PublicKey(walletAddress);

      // Step 1: Fetch recent transactions
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: FORENSIC_CONFIG.maxTransactions,
      });

      logger.info(
        { reportId, txCount: signatures.length },
        "Fetched transaction signatures"
      );

      // Step 2: Parse all transactions in a single parallel batch
      const parsedTxs: Array<{
        sig: ConfirmedSignatureInfo;
        tx: ParsedTransactionWithMeta;
      }> = [];
      const txResults = await Promise.allSettled(
        signatures.map((sig) =>
          connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          })
        )
      );
      txResults.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value) {
          parsedTxs.push({ sig: signatures[idx], tx: result.value });
        }
      });

      logger.info(
        { reportId, parsed: parsedTxs.length },
        "Parsed transactions"
      );

      // Step 3: Build timeline events
      const timeline = await this.buildTimeline(
        walletAddress,
        parsedTxs
      );

      logger.info(
        { reportId, timelineEvents: timeline.length },
        "Built timeline"
      );

      // Step 4: Identify attack vector
      const attackVector = this.identifyAttackVector(walletAddress, parsedTxs);

      // Step 5: Collect unique counterparties for attribution
      const counterparties = new Set<string>();
      for (const { tx } of parsedTxs) {
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if ("parsed" in ix && ix.parsed) {
            const parsed = ix.parsed as any;
            if (parsed.info?.destination) counterparties.add(parsed.info.destination);
            if (parsed.info?.authority) counterparties.add(parsed.info.authority);
            if (parsed.info?.newAuthority) counterparties.add(parsed.info.newAuthority);
            if (parsed.info?.delegate) counterparties.add(parsed.info.delegate);
          }
        }
      }
      counterparties.delete(walletAddress);

      // Step 6: Attribute threat actors
      const threatActors = await this.attributeThreatActors(
        Array.from(counterparties)
      );

      // Step 7: Inventory affected assets
      const affectedAssets = await this.inventoryAssets(
        connection,
        walletAddress,
        parsedTxs
      );

      // Step 8: Calculate totals
      const totalStolen = affectedAssets
        .filter((a) => a.status === "stolen")
        .reduce((sum, a) => sum + a.amount, 0);
      const totalAtRisk = affectedAssets
        .filter((a) => a.status === "at_risk")
        .reduce((sum, a) => sum + a.amount, 0);

      // Step 9: Determine timestamps
      const suspiciousEvents = timeline.filter(
        (e) =>
          e.severity === "critical" || e.severity === "high"
      );
      const firstCompromise =
        suspiciousEvents.length > 0
          ? suspiciousEvents[suspiciousEvents.length - 1].timestamp
          : null;
      const lastDrain =
        suspiciousEvents.length > 0 ? suspiciousEvents[0].timestamp : null;

      // Step 10: Confidence score
      const confidenceScore = this.calculateConfidence(
        threatActors,
        timeline,
        attackVector
      );

      // Step 11: Generate summary and recommendations
      const executiveSummary = this.generateSummary(
        walletAddress,
        attackVector,
        totalStolen,
        totalAtRisk,
        threatActors,
        timeline.length
      );
      const recommendations = this.generateRecommendations(
        attackVector,
        totalStolen,
        threatActors,
        affectedAssets
      );

      // Step 12: Store report
      await pool.executeQuery(
        `UPDATE forensic_reports SET
           attack_vector = $1,
           first_compromise_at = $2,
           last_drain_at = $3,
           total_stolen = $4,
           total_at_risk = $5,
           threat_actors = $6,
           affected_assets = $7,
           executive_summary = $8,
           recommendations = $9,
           confidence_score = $10,
           status = 'completed'
         WHERE report_id = $11`,
        [
          attackVector,
          firstCompromise,
          lastDrain,
          totalStolen,
          totalAtRisk,
          JSON.stringify(threatActors),
          JSON.stringify(affectedAssets),
          executiveSummary,
          JSON.stringify(recommendations),
          confidenceScore,
          reportId,
        ]
      );

      // Step 13: Store timeline events (batched INSERT)
      if (timeline.length > 0) {
        const COLS = 11;
        const values: any[] = [];
        const placeholders: string[] = [];
        for (let i = 0; i < timeline.length; i++) {
          const e = timeline[i];
          const offset = i * COLS;
          placeholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
          );
          values.push(
            reportId,
            e.eventType,
            e.timestamp,
            e.signature,
            e.description,
            e.fromAddress,
            e.toAddress,
            e.amount,
            e.tokenMint,
            e.severity,
            e.metadata ? JSON.stringify(e.metadata) : null
          );
        }
        await pool.executeQuery(
          `INSERT INTO attack_timeline_events
           (report_id, event_type, timestamp, signature, description, from_address, to_address, amount, token_mint, severity, metadata)
           VALUES ${placeholders.join(", ")}`,
          values
        );
      }

      const report: ForensicReport = {
        reportId,
        walletAddress,
        attackVector,
        firstCompromiseAt: firstCompromise,
        lastDrainAt: lastDrain,
        totalStolen,
        totalAtRisk,
        threatActors,
        affectedAssets,
        executiveSummary,
        recommendations,
        confidenceScore,
        status: "completed",
        createdAt: new Date().toISOString(),
        timeline,
      };

      logger.info(
        {
          reportId,
          attackVector,
          totalStolen,
          threatActorCount: threatActors.length,
          timelineEvents: timeline.length,
        },
        "Forensic analysis completed"
      );

      return report;
    } catch (error: any) {
      logger.error({ err: error, reportId }, "Forensic analysis failed");

      await pool.executeQuery(
        `UPDATE forensic_reports SET status = 'failed' WHERE report_id = $1`,
        [reportId]
      );

      throw error;
    }
  }

  /**
   * Get an existing report by ID
   */
  async getReport(reportId: string): Promise<ForensicReport | null> {
    const result = await pool.executeQuery(
      `SELECT * FROM forensic_reports WHERE report_id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      reportId: row.report_id,
      walletAddress: row.wallet_address,
      attackVector: row.attack_vector,
      firstCompromiseAt: row.first_compromise_at,
      lastDrainAt: row.last_drain_at,
      totalStolen: parseFloat(row.total_stolen) || 0,
      totalAtRisk: parseFloat(row.total_at_risk) || 0,
      threatActors: row.threat_actors || [],
      affectedAssets: row.affected_assets || [],
      executiveSummary: row.executive_summary,
      recommendations: row.recommendations || [],
      confidenceScore: parseFloat(row.confidence_score) || 0,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  /**
   * Get timeline events for a report
   */
  async getTimeline(reportId: string): Promise<TimelineEvent[]> {
    const result = await pool.executeQuery(
      `SELECT * FROM attack_timeline_events
       WHERE report_id = $1
       ORDER BY timestamp DESC`,
      [reportId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      reportId: row.report_id,
      eventType: row.event_type,
      timestamp: row.timestamp,
      signature: row.signature,
      description: row.description,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      amount: row.amount ? parseFloat(row.amount) : null,
      tokenMint: row.token_mint,
      severity: row.severity,
      metadata: row.metadata,
    }));
  }

  // ============================================
  // Internal Methods
  // ============================================

  /**
   * Build chronological timeline of events from parsed transactions
   */
  private async buildTimeline(
    walletAddress: string,
    parsedTxs: Array<{
      sig: ConfirmedSignatureInfo;
      tx: ParsedTransactionWithMeta;
    }>
  ): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // Also pull existing compromise alerts from DB
    const existingAlerts = await pool.executeQuery(
      `SELECT alert_type, severity, title, description, metadata, created_at
       FROM compromise_alerts WHERE wallet_address = $1
       ORDER BY created_at DESC LIMIT 50`,
      [walletAddress]
    );

    for (const row of existingAlerts.rows) {
      events.push({
        reportId: "",
        eventType: "threat_detected",
        timestamp: row.created_at,
        signature: null,
        description: `${row.title}: ${row.description}`,
        fromAddress: null,
        toAddress: null,
        amount: null,
        tokenMint: null,
        severity: row.severity || "medium",
        metadata: row.metadata,
      });
    }

    // Also pull existing fund trace data
    const fundTraces = await pool.executeQuery(
      `SELECT ft.trace_id, ft.initial_amount, ft.status,
              ftn.address, ftn.node_type, ftn.risk_level, ftn.total_received
       FROM fund_traces ft
       LEFT JOIN fund_trace_nodes ftn ON ft.trace_id = ftn.trace_id
       WHERE ft.source_wallet = $1
       LIMIT 100`,
      [walletAddress]
    );

    const traceNodesByTrace = new Map<string, any[]>();
    for (const row of fundTraces.rows) {
      if (!traceNodesByTrace.has(row.trace_id)) {
        traceNodesByTrace.set(row.trace_id, []);
      }
      if (row.address) {
        traceNodesByTrace.get(row.trace_id)!.push(row);
      }
    }

    for (const [traceId, nodes] of traceNodesByTrace) {
      for (const node of nodes) {
        if (
          node.node_type === "exchange" ||
          node.node_type === "bridge" ||
          node.node_type === "drainer"
        ) {
          events.push({
            reportId: "",
            eventType:
              node.node_type === "exchange"
                ? "exchange_deposit"
                : node.node_type === "bridge"
                ? "bridge_transfer"
                : "threat_detected",
            timestamp: new Date().toISOString(),
            signature: null,
            description: `Fund trace detected ${parseFloat(node.total_received || 0).toFixed(4)} SOL at ${node.node_type}: ${node.address}`,
            fromAddress: null,
            toAddress: node.address,
            amount: parseFloat(node.total_received) || null,
            tokenMint: null,
            severity:
              node.risk_level === "critical"
                ? "critical"
                : node.risk_level === "high"
                ? "high"
                : "medium",
            metadata: { traceId, nodeType: node.node_type },
          });
        }
      }
    }

    // Parse on-chain transactions into timeline events
    for (const { sig, tx } of parsedTxs) {
      const timestamp = new Date((sig.blockTime || 0) * 1000).toISOString();
      const instructions = tx.transaction.message.instructions;

      // Analyze balance changes
      const preBalance = tx.meta?.preBalances[0] || 0;
      const postBalance = tx.meta?.postBalances[0] || 0;
      const balanceChange = (postBalance - preBalance) / 1e9;

      for (const ix of instructions) {
        if (!("parsed" in ix) || !ix.parsed) continue;
        const parsed = ix.parsed as any;
        const ixType = parsed.type;
        const info = parsed.info || {};

        // Token approvals
        if (ixType === "approve" || ixType === "approveChecked") {
          const delegateAddr = info.delegate;
          const isMalicious = this.isKnownMalicious(delegateAddr);

          events.push({
            reportId: "",
            eventType: "approval_granted",
            timestamp,
            signature: sig.signature,
            description: `Token approval granted to ${delegateAddr}${isMalicious ? " (KNOWN MALICIOUS)" : ""}`,
            fromAddress: walletAddress,
            toAddress: delegateAddr,
            amount: info.amount ? parseFloat(info.amount) / 1e9 : null,
            tokenMint: info.mint || null,
            severity: isMalicious ? "critical" : "medium",
            metadata: { instructionType: ixType, delegate: delegateAddr },
          });
        }

        // Transfers out
        if (
          ixType === "transfer" ||
          ixType === "transferChecked"
        ) {
          const dest = info.destination || info.newAuthority;
          const amount = info.lamports
            ? parseFloat(info.lamports) / 1e9
            : info.amount
            ? parseFloat(info.amount) / 1e9
            : null;

          if (dest && dest !== walletAddress) {
            const isMalicious = this.isKnownMalicious(dest);
            events.push({
              reportId: "",
              eventType: "fund_drain",
              timestamp,
              signature: sig.signature,
              description: `${amount ? amount.toFixed(4) + " SOL" : "Tokens"} transferred to ${dest}${isMalicious ? " (KNOWN MALICIOUS)" : ""}`,
              fromAddress: walletAddress,
              toAddress: dest,
              amount,
              tokenMint: info.mint || null,
              severity: isMalicious ? "critical" : amount && amount > 1 ? "high" : "low",
              metadata: { instructionType: ixType },
            });
          }
        }

        // Authority changes
        if (ixType === "setAuthority") {
          events.push({
            reportId: "",
            eventType: "approval_granted",
            timestamp,
            signature: sig.signature,
            description: `Account authority changed to ${info.newAuthority}`,
            fromAddress: walletAddress,
            toAddress: info.newAuthority,
            amount: null,
            tokenMint: null,
            severity: "high",
            metadata: { instructionType: ixType, authorityType: info.authorityType },
          });
        }
      }

      // SOL outflows not captured by instruction parsing
      if (balanceChange < -0.01) {
        const existsInEvents = events.some(
          (e) => e.signature === sig.signature && e.eventType === "fund_drain"
        );
        if (!existsInEvents) {
          events.push({
            reportId: "",
            eventType: "fund_drain",
            timestamp,
            signature: sig.signature,
            description: `${Math.abs(balanceChange).toFixed(4)} SOL outflow`,
            fromAddress: walletAddress,
            toAddress: null,
            amount: Math.abs(balanceChange),
            tokenMint: null,
            severity: Math.abs(balanceChange) > 5 ? "high" : "low",
            metadata: { balanceChange },
          });
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return events.slice(0, FORENSIC_CONFIG.maxTimelineEvents);
  }

  /**
   * Identify the most likely attack vector
   */
  private identifyAttackVector(
    walletAddress: string,
    parsedTxs: Array<{
      sig: ConfirmedSignatureInfo;
      tx: ParsedTransactionWithMeta;
    }>
  ): string {
    // Check if the analyzed wallet itself is a known malicious address
    if (this.isKnownMalicious(walletAddress)) {
      return "known_drainer";
    }

    let hasApproval = false;
    let hasAuthorityChange = false;
    let hasLargeOutflow = false;
    let hasMaliciousInteraction = false;

    for (const { tx } of parsedTxs) {
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if (!("parsed" in ix) || !ix.parsed) continue;
        const parsed = ix.parsed as any;
        const ixType = parsed.type;
        const info = parsed.info || {};

        if (ixType === "approve" || ixType === "approveChecked") {
          hasApproval = true;
          if (info.delegate && this.isKnownMalicious(info.delegate)) {
            hasMaliciousInteraction = true;
          }
        }
        if (ixType === "setAuthority") {
          hasAuthorityChange = true;
        }
        // Check transfers to/from known malicious addresses
        if (ixType === "transfer" || ixType === "transferChecked") {
          const dest = info.destination || info.newAuthority;
          if (dest && this.isKnownMalicious(dest)) {
            hasMaliciousInteraction = true;
          }
        }
      }

      // Check for large outflow
      const preBalance = tx.meta?.preBalances[0] || 0;
      const postBalance = tx.meta?.postBalances[0] || 0;
      const change = (postBalance - preBalance) / 1e9;
      if (change < -5) {
        hasLargeOutflow = true;
      }
    }

    if (hasApproval && hasMaliciousInteraction) return "malicious_approval";
    if (hasApproval) return "malicious_approval";
    if (hasAuthorityChange) return "authority_exploit";
    if (hasMaliciousInteraction && hasLargeOutflow) return "drainer_interaction";
    if (hasMaliciousInteraction) return "drainer_interaction";
    if (hasLargeOutflow) return "private_key_compromise";
    return "unknown";
  }

  /**
   * Attribute threat actors by cross-referencing counterparties
   */
  private async attributeThreatActors(
    counterparties: string[]
  ): Promise<ThreatActor[]> {
    const actors: ThreatActor[] = [];

    if (counterparties.length === 0) return actors;

    // Batch query: check all counterparties against local DB in one query
    const placeholders = counterparties.map((_, i) => `$${i + 1}`).join(",");
    const localResult = await pool.executeQuery(
      `SELECT address, label, category, external_sources, confidence_score
       FROM known_malicious_delegates WHERE address IN (${placeholders})`,
      counterparties
    );

    const localHits = new Set<string>();
    for (const row of localResult.rows) {
      localHits.add(row.address);
      actors.push({
        address: row.address,
        label: row.label || row.category,
        source: (row.external_sources || []).join(", ") || "local_db",
        confidence: parseFloat(row.confidence_score) || 0.8,
      });
    }

    // Check GoPlus for up to 3 unknown counterparties in parallel (not in local DB)
    if (this.threatIntel) {
      const unknowns = counterparties.filter((a) => !localHits.has(a)).slice(0, 3);
      const goPlusResults = await Promise.allSettled(
        unknowns.map(async (address) => {
          const result = await this.threatIntel!.checkAddressGoPlus(address);
          return { address, result };
        })
      );
      for (const res of goPlusResults) {
        if (res.status === "fulfilled" && res.value.result.isRisky) {
          actors.push({
            address: res.value.address,
            label: res.value.result.riskFlags.join(", ") || "Flagged by GoPlus",
            source: "goplus",
            confidence: 0.6,
          });
        }
      }
    }

    // Sort by confidence descending
    actors.sort((a, b) => b.confidence - a.confidence);

    return actors;
  }

  /**
   * Inventory current assets and classify by risk
   */
  private async inventoryAssets(
    connection: Connection,
    walletAddress: string,
    parsedTxs: Array<{
      sig: ConfirmedSignatureInfo;
      tx: ParsedTransactionWithMeta;
    }>
  ): Promise<AffectedAsset[]> {
    const assets: AffectedAsset[] = [];

    try {
      const pubkey = new PublicKey(walletAddress);

      // Get current token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        pubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      for (const account of tokenAccounts.value) {
        const parsed = account.account.data.parsed;
        const info = parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount?.uiAmount || 0;
        const delegate = info.delegate;

        let status: "stolen" | "at_risk" | "safe" = "safe";

        if (delegate) {
          const isMalicious = this.isKnownMalicious(delegate);
          status = isMalicious ? "at_risk" : "at_risk";
        }

        if (amount > 0 || delegate) {
          assets.push({
            mint,
            symbol: mint.slice(0, 6), // Will be enriched if metadata available
            amount,
            status,
          });
        }
      }

      // Check SOL balance
      const solBalance = await connection.getBalance(pubkey);
      const solAmount = solBalance / 1e9;
      if (solAmount > 0) {
        assets.push({
          mint: "SOL",
          symbol: "SOL",
          amount: solAmount,
          status: "safe",
        });
      }

      // Identify stolen assets from transaction history (tokens that left the wallet)
      const outflowMints = new Set<string>();
      for (const { tx } of parsedTxs) {
        if (!tx.meta?.preTokenBalances || !tx.meta?.postTokenBalances) continue;
        for (const pre of tx.meta.preTokenBalances) {
          const post = tx.meta.postTokenBalances.find(
            (p) => p.accountIndex === pre.accountIndex
          );
          const preBal = pre.uiTokenAmount?.uiAmount || 0;
          const postBal = post?.uiTokenAmount?.uiAmount || 0;
          if (preBal > postBal && preBal - postBal > 0.001) {
            outflowMints.add(pre.mint);
          }
        }
      }

      // Mark assets with outflows that are now zero as stolen
      for (const asset of assets) {
        if (outflowMints.has(asset.mint) && asset.amount === 0) {
          asset.status = "stolen";
        }
      }
    } catch (error) {
      logger.error(
        { err: error, walletAddress },
        "Error inventorying assets"
      );
    }

    return assets;
  }

  /**
   * Check if an address is known malicious (uses in-memory cache)
   */
  private isKnownMalicious(address: string): boolean {
    return this.maliciousCache.has(address);
  }

  /**
   * Calculate confidence score based on evidence quality
   */
  private calculateConfidence(
    threatActors: ThreatActor[],
    timeline: TimelineEvent[],
    attackVector: string
  ): number {
    let score = 0;

    // Known threat actors boost confidence
    if (threatActors.length > 0) score += 30;
    if (threatActors.some((a) => a.confidence > 0.7)) score += 20;

    // Timeline evidence
    const criticalEvents = timeline.filter((e) => e.severity === "critical");
    const highEvents = timeline.filter((e) => e.severity === "high");
    if (criticalEvents.length > 0) score += 25;
    if (highEvents.length > 0) score += 10;

    // Known attack vector
    if (attackVector !== "unknown") score += 15;

    return Math.min(score, 100);
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    walletAddress: string,
    attackVector: string,
    totalStolen: number,
    totalAtRisk: number,
    threatActors: ThreatActor[],
    eventCount: number
  ): string {
    const vectorLabels: Record<string, string> = {
      known_drainer: "this wallet is a KNOWN DRAINER/MALICIOUS address",
      malicious_approval: "a malicious token approval exploit",
      drainer_interaction: "interaction with a known drainer address",
      authority_exploit: "an account authority change exploit",
      private_key_compromise: "a suspected private key compromise",
      unknown: "an unidentified attack vector",
    };

    const vectorDesc = vectorLabels[attackVector] || vectorLabels.unknown;

    let summary = `Forensic analysis of wallet ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)} identified ${vectorDesc}.`;

    if (totalStolen > 0) {
      summary += ` Approximately ${totalStolen.toFixed(4)} SOL equivalent in assets have been drained.`;
    }

    if (totalAtRisk > 0) {
      summary += ` An additional ${totalAtRisk.toFixed(4)} SOL equivalent remains at risk.`;
    }

    if (threatActors.length > 0) {
      summary += ` ${threatActors.length} threat actor(s) identified.`;
    }

    summary += ` Analysis based on ${eventCount} timeline events.`;

    return summary;
  }

  /**
   * Generate recovery recommendations
   */
  private generateRecommendations(
    attackVector: string,
    totalStolen: number,
    threatActors: ThreatActor[],
    affectedAssets: AffectedAsset[]
  ): string[] {
    const recommendations: string[] = [];

    // Universal recommendations
    const atRiskAssets = affectedAssets.filter((a) => a.status === "at_risk");
    if (atRiskAssets.length > 0) {
      recommendations.push(
        "Immediately revoke all suspicious token approvals using the Token Approvals tab."
      );
    }

    recommendations.push(
      "Create a new wallet and migrate remaining safe assets."
    );

    // Attack-vector-specific
    if (attackVector === "malicious_approval") {
      recommendations.push(
        "Review all recently approved delegates and revoke any unrecognized approvals."
      );
      recommendations.push(
        "Avoid interacting with unknown dApps that request token approvals."
      );
    }

    if (attackVector === "private_key_compromise") {
      recommendations.push(
        "Your private key may be compromised. Do NOT continue using this wallet under any circumstances."
      );
      recommendations.push(
        "Transfer all remaining assets to a new wallet immediately."
      );
    }

    if (attackVector === "authority_exploit") {
      recommendations.push(
        "Check all token account authorities for unauthorized changes."
      );
    }

    if (attackVector === "known_drainer") {
      recommendations.push(
        "This wallet has been identified as a known drainer/malicious address in our threat intelligence database."
      );
      recommendations.push(
        "If you received funds from this address, exercise extreme caution — it may be part of a dusting attack."
      );
    }

    if (attackVector === "drainer_interaction") {
      recommendations.push(
        "This wallet has interacted with known drainer addresses. Review all recent transactions carefully."
      );
    }

    // Fund recovery
    if (totalStolen > 0) {
      recommendations.push(
        "Start a fund trace from the Recovery tab to track where stolen funds went."
      );
      recommendations.push(
        "If funds reached a known exchange, create a freeze request to attempt recovery."
      );
    }

    // Threat actor reporting
    if (threatActors.length > 0) {
      recommendations.push(
        "Report identified threat actor addresses to help protect other users."
      );
    }

    recommendations.push(
      "Enable wallet monitoring for ongoing security alerts."
    );

    return recommendations;
  }
}

export const forensicAnalyzer = new ForensicAnalyzer();
