/**
 * Fund Tracker Service
 *
 * Tracks stolen funds across the Solana blockchain, builds transaction graphs,
 * and calculates recovery probability.
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

// Tracking configuration
const TRACKING_CONFIG = {
  maxDepth: parseInt(process.env.TRACKING_MAX_DEPTH || "10"),
  maxTransactionsPerHop: parseInt(process.env.MAX_TX_PER_HOP || "50"),
  minTrackableAmountSol: parseFloat(process.env.MIN_TRACKABLE_SOL || "0.01"),
  exchangeFreezeWindow: parseInt(process.env.EXCHANGE_FREEZE_WINDOW || "24"), // hours
};

// Interfaces
export interface FundTrace {
  traceId: string;
  sourceWallet: string;
  initialAmount: number;
  tokenMint?: string;
  status: TraceStatus;
  currentDepth: number;
  startedAt: Date;
  completedAt?: Date;
  recoveryProbability: number;
  totalTracked: number;
  totalRecoverable: number;
}

export type TraceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "partial"
  | "funds_recovered"
  | "funds_lost";

export interface FundNode {
  address: string;
  nodeType: NodeType;
  label?: string;
  totalReceived: number;
  totalSent: number;
  currentBalance: number;
  firstSeen: Date;
  lastSeen: Date;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export type NodeType =
  | "source"
  | "intermediate"
  | "exchange"
  | "bridge"
  | "mixer"
  | "drainer"
  | "unknown";

export interface FundEdge {
  fromAddress: string;
  toAddress: string;
  signature: string;
  amount: number;
  tokenMint?: string;
  timestamp: Date;
  hopNumber: number;
}

export interface FundGraph {
  traceId: string;
  nodes: Map<string, FundNode>;
  edges: FundEdge[];
  exchangeDeposits: ExchangeDeposit[];
  bridgeTransfers: BridgeTransfer[];
  totalAmount: number;
  recoverableAmount: number;
  lostAmount: number;
}

export interface ExchangeDeposit {
  exchangeName: string;
  exchangeAddress: string;
  amount: number;
  tokenMint?: string;
  signature: string;
  timestamp: Date;
  freezeRequestSent: boolean;
  freezeRequestId?: string;
}

export interface BridgeTransfer {
  bridgeName: string;
  bridgeAddress: string;
  amount: number;
  tokenMint?: string;
  signature: string;
  timestamp: Date;
  destinationChain?: string;
  destinationAddress?: string;
}

export interface FreezeRequest {
  requestId: string;
  traceId: string;
  exchangeName: string;
  exchangeAddress: string;
  depositAddress: string;
  amount: number;
  tokenMint?: string;
  status: FreezeStatus;
  createdAt: Date;
  submittedAt?: Date;
  responseAt?: Date;
  responseNotes?: string;
}

export type FreezeStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "acknowledged"
  | "frozen"
  | "rejected"
  | "expired";

export interface RecoveryReport {
  traceId: string;
  sourceWallet: string;
  totalStolen: number;
  tokenMint?: string;
  tracingDepth: number;
  uniqueAddresses: number;
  totalTransactions: number;
  fundDistribution: {
    inExchanges: number;
    inBridges: number;
    inUnknown: number;
    remaining: number;
  };
  exchangeDeposits: ExchangeDeposit[];
  bridgeTransfers: BridgeTransfer[];
  recoveryProbability: number;
  recommendedActions: string[];
  generatedAt: Date;
}

/**
 * FundTracker class
 * Tracks stolen funds and builds transaction graphs
 */
export class FundTracker {
  private connections: Connection[];
  private currentConnectionIndex: number = 0;
  private knownExchanges: Map<string, string> = new Map();
  private knownBridges: Map<string, string> = new Map();
  private knownMixers: Set<string> = new Set();
  private knownDrainers: Set<string> = new Set();
  private threatIntel: ThreatIntelligenceService | null = null;

  constructor() {
    this.connections = RPC_ENDPOINTS.map(
      (endpoint) => new Connection(endpoint, "confirmed")
    );
    this.loadKnownAddresses();
  }

  /**
   * Set the threat intelligence service for enhanced classification
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
   * Enhanced address classification using Arkham entity lookup as fallback
   */
  async classifyAddressEnhanced(address: string): Promise<NodeType> {
    // Try local classification first
    const localType = this.classifyAddress(address);
    if (localType !== "intermediate") return localType;

    // Try Arkham entity lookup for unclassified addresses
    if (this.threatIntel) {
      try {
        const entity = await this.threatIntel.lookupEntityCached(address);
        if (entity?.entityType) {
          const type = entity.entityType.toLowerCase();
          if (type.includes("exchange") || type.includes("cex")) return "exchange";
          if (type.includes("bridge")) return "bridge";
          if (type.includes("mixer") || type.includes("tornado")) return "mixer";
          if (type.includes("drainer") || type.includes("scam") || type.includes("phish")) return "drainer";
        }
      } catch (err) {
        // Arkham lookup failed, fall back to local
      }
    }

    return "intermediate";
  }

  /**
   * Enhanced address label using Arkham entity name as fallback
   */
  async getAddressLabelEnhanced(address: string): Promise<string | undefined> {
    // Try local label first
    const localLabel = this.getAddressLabel(address);
    if (localLabel) return localLabel;

    // Try Arkham
    if (this.threatIntel) {
      try {
        const entity = await this.threatIntel.lookupEntityCached(address);
        if (entity?.entityName) return entity.entityName;
      } catch (err) {
        // Arkham lookup failed
      }
    }

    return undefined;
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
   * Load known addresses from database
   */
  private async loadKnownAddresses(): Promise<void> {
    try {
      // Load exchanges
      const exchanges = await pool.executeQuery(
        `SELECT address, exchange_name FROM known_exchanges`
      );
      exchanges.rows.forEach((row) =>
        this.knownExchanges.set(row.address, row.exchange_name)
      );

      // Load bridges
      const bridges = await pool.executeQuery(
        `SELECT address, bridge_name FROM known_bridges`
      );
      bridges.rows.forEach((row) =>
        this.knownBridges.set(row.address, row.bridge_name)
      );

      // Load drainers
      const drainers = await pool.executeQuery(
        `SELECT address FROM known_malicious_delegates`
      );
      drainers.rows.forEach((row) => this.knownDrainers.add(row.address));

      console.log(`FundTracker loaded: ${this.knownExchanges.size} exchanges, ${this.knownBridges.size} bridges`);
    } catch (error) {
      console.error("Error loading known addresses:", error);
    }
  }

  /**
   * Start tracing funds from a compromised wallet
   */
  async startTrace(
    sourceWallet: string,
    initialAmount: number,
    tokenMint?: string
  ): Promise<FundTrace> {
    const traceId = uuidv4();

    const trace: FundTrace = {
      traceId,
      sourceWallet,
      initialAmount,
      tokenMint,
      status: "in_progress",
      currentDepth: 0,
      startedAt: new Date(),
      recoveryProbability: 100,
      totalTracked: 0,
      totalRecoverable: 0,
    };

    // Store trace in database
    await pool.executeQuery(
      `INSERT INTO fund_traces (
        trace_id, source_wallet, initial_amount, token_mint, status, current_depth
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [traceId, sourceWallet, initialAmount, tokenMint, "in_progress", 0]
    );

    // Start async tracing
    this.performTrace(trace).catch((err) => {
      console.error(`Trace ${traceId} failed:`, err);
      this.updateTraceStatus(traceId, "partial");
    });

    return trace;
  }

  /**
   * Perform the fund tracing
   */
  private async performTrace(trace: FundTrace): Promise<FundGraph> {
    const graph: FundGraph = {
      traceId: trace.traceId,
      nodes: new Map(),
      edges: [],
      exchangeDeposits: [],
      bridgeTransfers: [],
      totalAmount: trace.initialAmount,
      recoverableAmount: 0,
      lostAmount: 0,
    };

    // Add source node
    const sourceNode: FundNode = {
      address: trace.sourceWallet,
      nodeType: "source",
      label: "Compromised Wallet",
      totalReceived: 0,
      totalSent: trace.initialAmount,
      currentBalance: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      riskLevel: "critical",
    };
    graph.nodes.set(trace.sourceWallet, sourceNode);

    // BFS to trace funds
    const queue: { address: string; depth: number; amount: number }[] = [
      { address: trace.sourceWallet, depth: 0, amount: trace.initialAmount },
    ];
    const visited = new Set<string>();

    while (queue.length > 0 && trace.currentDepth < TRACKING_CONFIG.maxDepth) {
      const current = queue.shift()!;

      if (visited.has(current.address)) continue;
      visited.add(current.address);

      // Update trace depth
      if (current.depth > trace.currentDepth) {
        trace.currentDepth = current.depth;
        await this.updateTraceDepth(trace.traceId, current.depth);
      }

      // Get outgoing transactions
      const outflows = await this.getOutgoingTransactions(
        current.address,
        trace.startedAt,
        trace.tokenMint
      );

      for (const outflow of outflows) {
        if (outflow.amount < TRACKING_CONFIG.minTrackableAmountSol) continue;

        // Add edge
        const edge: FundEdge = {
          fromAddress: current.address,
          toAddress: outflow.toAddress,
          signature: outflow.signature,
          amount: outflow.amount,
          tokenMint: trace.tokenMint,
          timestamp: outflow.timestamp,
          hopNumber: current.depth + 1,
        };
        graph.edges.push(edge);

        // Classify destination (enhanced with Arkham fallback)
        const nodeType = this.threatIntel
          ? await this.classifyAddressEnhanced(outflow.toAddress)
          : this.classifyAddress(outflow.toAddress);

        // Add or update node
        if (!graph.nodes.has(outflow.toAddress)) {
          const label = this.threatIntel
            ? await this.getAddressLabelEnhanced(outflow.toAddress)
            : this.getAddressLabel(outflow.toAddress);
          const node: FundNode = {
            address: outflow.toAddress,
            nodeType,
            label,
            totalReceived: outflow.amount,
            totalSent: 0,
            currentBalance: outflow.amount,
            firstSeen: outflow.timestamp,
            lastSeen: outflow.timestamp,
            riskLevel: this.calculateNodeRisk(nodeType),
          };
          graph.nodes.set(outflow.toAddress, node);
        } else {
          const node = graph.nodes.get(outflow.toAddress)!;
          node.totalReceived += outflow.amount;
          node.lastSeen = outflow.timestamp;
        }

        // Handle special destinations
        if (nodeType === "exchange") {
          const deposit: ExchangeDeposit = {
            exchangeName: this.knownExchanges.get(outflow.toAddress) || "Unknown Exchange",
            exchangeAddress: outflow.toAddress,
            amount: outflow.amount,
            tokenMint: trace.tokenMint,
            signature: outflow.signature,
            timestamp: outflow.timestamp,
            freezeRequestSent: false,
          };
          graph.exchangeDeposits.push(deposit);
          graph.recoverableAmount += outflow.amount;
        } else if (nodeType === "bridge") {
          const transfer: BridgeTransfer = {
            bridgeName: this.knownBridges.get(outflow.toAddress) || "Unknown Bridge",
            bridgeAddress: outflow.toAddress,
            amount: outflow.amount,
            tokenMint: trace.tokenMint,
            signature: outflow.signature,
            timestamp: outflow.timestamp,
          };
          graph.bridgeTransfers.push(transfer);
          graph.lostAmount += outflow.amount; // Bridge transfers are harder to recover
        } else if (current.depth < TRACKING_CONFIG.maxDepth - 1) {
          // Continue tracing through intermediate nodes (non-exchange, non-bridge)
          queue.push({
            address: outflow.toAddress,
            depth: current.depth + 1,
            amount: outflow.amount,
          });
        }
      }

      // Rate limiting between iterations
      await this.sleep(100);
    }

    // Store graph in database
    await this.storeGraph(graph);

    // Calculate final recovery probability
    trace.totalTracked = graph.edges.reduce((sum, e) => sum + e.amount, 0);
    trace.totalRecoverable = graph.recoverableAmount;
    trace.recoveryProbability = this.calculateRecoveryProbability(graph);
    trace.status = "completed";

    await this.updateTraceCompletion(trace);

    return graph;
  }

  /**
   * Get outgoing transactions from an address
   */
  private async getOutgoingTransactions(
    address: string,
    since: Date,
    tokenMint?: string
  ): Promise<{ toAddress: string; amount: number; signature: string; timestamp: Date }[]> {
    const connection = this.getConnection();
    const pubkey = new PublicKey(address);
    const results: { toAddress: string; amount: number; signature: string; timestamp: Date }[] = [];

    try {
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: TRACKING_CONFIG.maxTransactionsPerHop,
      });

      for (const sig of signatures) {
        if (sig.blockTime && new Date(sig.blockTime * 1000) < since) {
          continue; // Skip transactions before the compromise
        }

        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.meta) continue;

        // Analyze SOL transfers
        const preBalance = tx.meta.preBalances[0] || 0;
        const postBalance = tx.meta.postBalances[0] || 0;
        const balanceChange = postBalance - preBalance;

        if (balanceChange < 0) {
          // This is an outgoing transfer
          const amount = Math.abs(balanceChange) / 1e9;

          // Find the destination
          const destination = this.extractDestination(tx, address);
          if (destination && destination !== address) {
            results.push({
              toAddress: destination,
              amount,
              signature: sig.signature,
              timestamp: new Date((sig.blockTime || 0) * 1000),
            });
          }
        }

        // Analyze token transfers if tokenMint specified
        if (tokenMint && tx.meta.postTokenBalances) {
          for (const postToken of tx.meta.postTokenBalances) {
            if (postToken.mint === tokenMint) {
              const preToken = tx.meta.preTokenBalances?.find(
                (t) => t.accountIndex === postToken.accountIndex
              );
              if (preToken && preToken.uiTokenAmount && postToken.uiTokenAmount) {
                const tokenChange =
                  (postToken.uiTokenAmount.uiAmount || 0) -
                  (preToken.uiTokenAmount.uiAmount || 0);
                if (tokenChange > 0 && postToken.owner) {
                  results.push({
                    toAddress: postToken.owner,
                    amount: tokenChange,
                    signature: sig.signature,
                    timestamp: new Date((sig.blockTime || 0) * 1000),
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error getting transactions for ${address}:`, error);
    }

    return results;
  }

  /**
   * Extract destination address from transaction
   */
  private extractDestination(
    tx: ParsedTransactionWithMeta,
    sourceAddress: string
  ): string | null {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      if ("parsed" in ix && ix.parsed) {
        const parsed = ix.parsed as any;
        if (parsed.type === "transfer" && parsed.info) {
          if (parsed.info.source === sourceAddress && parsed.info.destination) {
            return parsed.info.destination;
          }
        }
      }
    }

    // Fallback: check account keys
    const accountKeys = tx.transaction.message.accountKeys;
    if (accountKeys.length > 1) {
      for (const key of accountKeys) {
        const addr = key.pubkey.toBase58();
        if (addr !== sourceAddress) {
          return addr;
        }
      }
    }

    return null;
  }

  /**
   * Classify an address based on known lists
   */
  private classifyAddress(address: string): NodeType {
    if (this.knownExchanges.has(address)) return "exchange";
    if (this.knownBridges.has(address)) return "bridge";
    if (this.knownMixers.has(address)) return "mixer";
    if (this.knownDrainers.has(address)) return "drainer";
    return "intermediate";
  }

  /**
   * Get human-readable label for address
   */
  private getAddressLabel(address: string): string | undefined {
    if (this.knownExchanges.has(address)) {
      return this.knownExchanges.get(address);
    }
    if (this.knownBridges.has(address)) {
      return this.knownBridges.get(address);
    }
    return undefined;
  }

  /**
   * Calculate risk level based on node type
   */
  private calculateNodeRisk(nodeType: NodeType): "low" | "medium" | "high" | "critical" {
    switch (nodeType) {
      case "exchange":
        return "medium"; // Recoverable but needs action
      case "bridge":
        return "high"; // Funds leaving Solana
      case "mixer":
        return "critical"; // Obfuscation attempt
      case "drainer":
        return "critical";
      default:
        return "low";
    }
  }

  /**
   * Calculate overall recovery probability
   */
  private calculateRecoveryProbability(graph: FundGraph): number {
    if (graph.totalAmount === 0) return 0;

    // Base probability from exchange deposits
    const exchangeRecoveryRate = 0.7; // 70% chance of recovery from exchanges with freeze request
    const bridgeRecoveryRate = 0.1; // 10% chance once bridged
    const unknownRecoveryRate = 0.3; // 30% for unknown destinations

    const exchangeAmount = graph.exchangeDeposits.reduce((sum, d) => sum + d.amount, 0);
    const bridgeAmount = graph.bridgeTransfers.reduce((sum, t) => sum + t.amount, 0);
    const unknownAmount = graph.totalAmount - exchangeAmount - bridgeAmount;

    const weightedRecovery =
      (exchangeAmount * exchangeRecoveryRate +
        bridgeAmount * bridgeRecoveryRate +
        unknownAmount * unknownRecoveryRate) /
      graph.totalAmount;

    return Math.round(weightedRecovery * 100);
  }

  /**
   * Store fund graph in database
   */
  private async storeGraph(graph: FundGraph): Promise<void> {
    try {
      // Store nodes
      for (const [address, node] of graph.nodes) {
        await pool.executeQuery(
          `INSERT INTO fund_trace_nodes (
            trace_id, address, node_type, label, total_received, total_sent,
            current_balance, first_seen, last_seen, risk_level
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (trace_id, address) DO UPDATE SET
            total_received = EXCLUDED.total_received,
            total_sent = EXCLUDED.total_sent,
            current_balance = EXCLUDED.current_balance,
            last_seen = EXCLUDED.last_seen`,
          [
            graph.traceId,
            address,
            node.nodeType,
            node.label,
            node.totalReceived,
            node.totalSent,
            node.currentBalance,
            node.firstSeen,
            node.lastSeen,
            node.riskLevel,
          ]
        );
      }

      // Store edges
      for (const edge of graph.edges) {
        await pool.executeQuery(
          `INSERT INTO fund_trace_edges (
            trace_id, from_address, to_address, signature, amount,
            token_mint, timestamp, hop_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (trace_id, signature) DO NOTHING`,
          [
            graph.traceId,
            edge.fromAddress,
            edge.toAddress,
            edge.signature,
            edge.amount,
            edge.tokenMint,
            edge.timestamp,
            edge.hopNumber,
          ]
        );
      }
    } catch (error) {
      console.error("Error storing graph:", error);
    }
  }

  /**
   * Create a freeze request for an exchange
   */
  async createFreezeRequest(
    traceId: string,
    exchangeDeposit: ExchangeDeposit
  ): Promise<FreezeRequest> {
    const requestId = uuidv4();

    const request: FreezeRequest = {
      requestId,
      traceId,
      exchangeName: exchangeDeposit.exchangeName,
      exchangeAddress: exchangeDeposit.exchangeAddress,
      depositAddress: exchangeDeposit.exchangeAddress,
      amount: exchangeDeposit.amount,
      tokenMint: exchangeDeposit.tokenMint,
      status: "draft",
      createdAt: new Date(),
    };

    await pool.executeQuery(
      `INSERT INTO freeze_requests (
        request_id, trace_id, exchange_name, exchange_address,
        deposit_address, amount, token_mint, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        requestId,
        traceId,
        exchangeDeposit.exchangeName,
        exchangeDeposit.exchangeAddress,
        exchangeDeposit.exchangeAddress,
        exchangeDeposit.amount,
        exchangeDeposit.tokenMint,
        "draft",
      ]
    );

    return request;
  }

  /**
   * Generate freeze request template for an exchange
   */
  generateFreezeRequestTemplate(
    request: FreezeRequest,
    victimInfo: { name?: string; email?: string; walletAddress: string }
  ): string {
    const template = `
URGENT: Stolen Cryptocurrency Freeze Request

Exchange: ${request.exchangeName}
Date: ${new Date().toISOString()}

Dear Compliance Team,

We are writing to request an urgent freeze on funds deposited to your platform that have been traced to a cryptocurrency theft.

INCIDENT DETAILS:
- Victim Wallet: ${victimInfo.walletAddress}
- Stolen Amount: ${request.amount} ${request.tokenMint ? `(Token: ${request.tokenMint})` : 'SOL'}
- Deposit Transaction: [Transaction signature from blockchain]
- Deposit Address on Your Platform: ${request.depositAddress}
- Date of Theft: [Insert date]
- Trace ID: ${request.traceId}

BLOCKCHAIN EVIDENCE:
The attached documentation includes:
1. Complete transaction trace from victim wallet to your platform
2. Blockchain transaction signatures proving fund flow
3. Timeline of the theft and subsequent transfers

REQUESTED ACTIONS:
1. Immediately freeze any accounts associated with the deposited funds
2. Preserve all relevant account information and transaction records
3. Contact us to coordinate with law enforcement if necessary

CONTACT INFORMATION:
- Victim Name: ${victimInfo.name || 'To be provided'}
- Email: ${victimInfo.email || 'To be provided'}
- Platform: WalletShield Recovery

This request is made in good faith based on blockchain evidence of theft. We are prepared to provide additional documentation or work with law enforcement as needed.

Time is of the essence. Please respond within 24 hours.

Regards,
WalletShield Recovery Team
    `.trim();

    return template;
  }

  /**
   * Generate recovery report
   */
  async generateRecoveryReport(traceId: string): Promise<RecoveryReport | null> {
    try {
      // Get trace info
      const traceResult = await pool.executeQuery(
        `SELECT * FROM fund_traces WHERE trace_id = $1`,
        [traceId]
      );

      if (traceResult.rows.length === 0) return null;
      const trace = traceResult.rows[0];

      // Get nodes
      const nodesResult = await pool.executeQuery(
        `SELECT * FROM fund_trace_nodes WHERE trace_id = $1`,
        [traceId]
      );

      // Get edges
      const edgesResult = await pool.executeQuery(
        `SELECT * FROM fund_trace_edges WHERE trace_id = $1`,
        [traceId]
      );

      // Calculate fund distribution
      const exchangeNodes = nodesResult.rows.filter((n) => n.node_type === "exchange");
      const bridgeNodes = nodesResult.rows.filter((n) => n.node_type === "bridge");
      const unknownNodes = nodesResult.rows.filter(
        (n) => !["exchange", "bridge", "source"].includes(n.node_type)
      );

      const inExchanges = exchangeNodes.reduce(
        (sum, n) => sum + parseFloat(n.total_received || 0),
        0
      );
      const inBridges = bridgeNodes.reduce(
        (sum, n) => sum + parseFloat(n.total_received || 0),
        0
      );
      const inUnknown = unknownNodes.reduce(
        (sum, n) => sum + parseFloat(n.current_balance || 0),
        0
      );

      // Build exchange deposits list
      const exchangeDeposits: ExchangeDeposit[] = exchangeNodes.map((n) => ({
        exchangeName: n.label || "Unknown Exchange",
        exchangeAddress: n.address,
        amount: parseFloat(n.total_received || 0),
        signature: "",
        timestamp: new Date(n.first_seen),
        freezeRequestSent: false,
      }));

      // Build bridge transfers list
      const bridgeTransfers: BridgeTransfer[] = bridgeNodes.map((n) => ({
        bridgeName: n.label || "Unknown Bridge",
        bridgeAddress: n.address,
        amount: parseFloat(n.total_received || 0),
        signature: "",
        timestamp: new Date(n.first_seen),
      }));

      // Generate recommended actions
      const recommendedActions: string[] = [];

      if (exchangeDeposits.length > 0) {
        recommendedActions.push(
          `Submit freeze requests to ${exchangeDeposits.length} exchange(s) immediately`
        );
        for (const deposit of exchangeDeposits) {
          recommendedActions.push(
            `- ${deposit.exchangeName}: ${deposit.amount.toFixed(4)} SOL deposited`
          );
        }
      }

      if (bridgeTransfers.length > 0) {
        recommendedActions.push(
          `Monitor ${bridgeTransfers.length} bridge transfer(s) - funds may have left Solana`
        );
      }

      if (inUnknown > 0) {
        recommendedActions.push(
          `Continue monitoring ${inUnknown.toFixed(4)} SOL in intermediate wallets`
        );
      }

      const recoveryProbability = this.calculateRecoveryProbabilityFromAmounts(
        inExchanges,
        inBridges,
        inUnknown,
        parseFloat(trace.initial_amount)
      );

      const report: RecoveryReport = {
        traceId,
        sourceWallet: trace.source_wallet,
        totalStolen: parseFloat(trace.initial_amount),
        tokenMint: trace.token_mint,
        tracingDepth: trace.current_depth,
        uniqueAddresses: nodesResult.rows.length,
        totalTransactions: edgesResult.rows.length,
        fundDistribution: {
          inExchanges,
          inBridges,
          inUnknown,
          remaining: parseFloat(trace.initial_amount) - inExchanges - inBridges,
        },
        exchangeDeposits,
        bridgeTransfers,
        recoveryProbability,
        recommendedActions,
        generatedAt: new Date(),
      };

      return report;
    } catch (error) {
      console.error("Error generating recovery report:", error);
      return null;
    }
  }

  /**
   * Calculate recovery probability from fund distribution
   */
  private calculateRecoveryProbabilityFromAmounts(
    inExchanges: number,
    inBridges: number,
    inUnknown: number,
    total: number
  ): number {
    if (total === 0) return 0;

    const exchangeRecoveryRate = 0.7;
    const bridgeRecoveryRate = 0.1;
    const unknownRecoveryRate = 0.3;

    const weighted =
      (inExchanges * exchangeRecoveryRate +
        inBridges * bridgeRecoveryRate +
        inUnknown * unknownRecoveryRate) /
      total;

    return Math.round(weighted * 100);
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<FundTrace | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM fund_traces WHERE trace_id = $1`,
        [traceId]
      );

      if (result.rows.length === 0) return null;
      const row = result.rows[0];

      return {
        traceId: row.trace_id,
        sourceWallet: row.source_wallet,
        initialAmount: parseFloat(row.initial_amount),
        tokenMint: row.token_mint,
        status: row.status,
        currentDepth: row.current_depth,
        startedAt: new Date(row.created_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        recoveryProbability: row.recovery_probability || 0,
        totalTracked: parseFloat(row.total_tracked || 0),
        totalRecoverable: parseFloat(row.total_recoverable || 0),
      };
    } catch (error) {
      console.error("Error getting trace:", error);
      return null;
    }
  }

  /**
   * Get all traces for a wallet
   */
  async getTracesForWallet(walletAddress: string): Promise<FundTrace[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM fund_traces WHERE source_wallet = $1 ORDER BY created_at DESC`,
        [walletAddress]
      );

      return result.rows.map((row) => ({
        traceId: row.trace_id,
        sourceWallet: row.source_wallet,
        initialAmount: parseFloat(row.initial_amount),
        tokenMint: row.token_mint,
        status: row.status,
        currentDepth: row.current_depth,
        startedAt: new Date(row.created_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        recoveryProbability: row.recovery_probability || 0,
        totalTracked: parseFloat(row.total_tracked || 0),
        totalRecoverable: parseFloat(row.total_recoverable || 0),
      }));
    } catch (error) {
      console.error("Error getting traces:", error);
      return [];
    }
  }

  /**
   * Update trace depth
   */
  private async updateTraceDepth(traceId: string, depth: number): Promise<void> {
    await pool.executeQuery(
      `UPDATE fund_traces SET current_depth = $2, updated_at = CURRENT_TIMESTAMP WHERE trace_id = $1`,
      [traceId, depth]
    );
  }

  /**
   * Update trace status
   */
  private async updateTraceStatus(traceId: string, status: TraceStatus): Promise<void> {
    await pool.executeQuery(
      `UPDATE fund_traces SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE trace_id = $1`,
      [traceId, status]
    );
  }

  /**
   * Update trace completion
   */
  private async updateTraceCompletion(trace: FundTrace): Promise<void> {
    await pool.executeQuery(
      `UPDATE fund_traces SET
        status = $2,
        current_depth = $3,
        recovery_probability = $4,
        total_tracked = $5,
        total_recoverable = $6,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE trace_id = $1`,
      [
        trace.traceId,
        trace.status,
        trace.currentDepth,
        trace.recoveryProbability,
        trace.totalTracked,
        trace.totalRecoverable,
      ]
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const fundTracker = new FundTracker();
export default fundTracker;
