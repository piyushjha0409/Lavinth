"use strict";
/**
 * Fund Tracker Service
 *
 * Tracks stolen funds across the Solana blockchain, builds transaction graphs,
 * and calculates recovery probability.
 * Part of WalletShield Recovery - Phase 2
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fundTracker = exports.FundTracker = void 0;
const web3_js_1 = require("@solana/web3.js");
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
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
/**
 * FundTracker class
 * Tracks stolen funds and builds transaction graphs
 */
class FundTracker {
    constructor() {
        this.currentConnectionIndex = 0;
        this.knownExchanges = new Map();
        this.knownBridges = new Map();
        this.knownMixers = new Set();
        this.knownDrainers = new Set();
        this.threatIntel = null;
        this.connections = RPC_ENDPOINTS.map((endpoint) => new web3_js_1.Connection(endpoint, "confirmed"));
        this.loadKnownAddresses();
    }
    /**
     * Set the threat intelligence service for enhanced classification
     */
    setThreatIntel(service) {
        this.threatIntel = service;
    }
    /**
     * Refresh known addresses from database (public wrapper)
     */
    refreshKnownAddresses() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadKnownAddresses();
        });
    }
    /**
     * Enhanced address classification using Arkham entity lookup as fallback
     */
    classifyAddressEnhanced(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // Try local classification first
            const localType = this.classifyAddress(address);
            if (localType !== "intermediate")
                return localType;
            // Try Arkham entity lookup for unclassified addresses
            if (this.threatIntel) {
                try {
                    const entity = yield this.threatIntel.lookupEntityCached(address);
                    if (entity === null || entity === void 0 ? void 0 : entity.entityType) {
                        const type = entity.entityType.toLowerCase();
                        if (type.includes("exchange") || type.includes("cex"))
                            return "exchange";
                        if (type.includes("bridge"))
                            return "bridge";
                        if (type.includes("mixer") || type.includes("tornado"))
                            return "mixer";
                        if (type.includes("drainer") || type.includes("scam") || type.includes("phish"))
                            return "drainer";
                    }
                }
                catch (err) {
                    // Arkham lookup failed, fall back to local
                }
            }
            return "intermediate";
        });
    }
    /**
     * Enhanced address label using Arkham entity name as fallback
     */
    getAddressLabelEnhanced(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // Try local label first
            const localLabel = this.getAddressLabel(address);
            if (localLabel)
                return localLabel;
            // Try Arkham
            if (this.threatIntel) {
                try {
                    const entity = yield this.threatIntel.lookupEntityCached(address);
                    if (entity === null || entity === void 0 ? void 0 : entity.entityName)
                        return entity.entityName;
                }
                catch (err) {
                    // Arkham lookup failed
                }
            }
            return undefined;
        });
    }
    /**
     * Get next connection (round-robin)
     */
    getConnection() {
        const connection = this.connections[this.currentConnectionIndex];
        this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
        return connection;
    }
    /**
     * Load known addresses from database
     */
    loadKnownAddresses() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Load exchanges
                const exchanges = yield config_1.default.executeQuery(`SELECT address, exchange_name FROM known_exchanges`);
                exchanges.rows.forEach((row) => this.knownExchanges.set(row.address, row.exchange_name));
                // Load bridges
                const bridges = yield config_1.default.executeQuery(`SELECT address, bridge_name FROM known_bridges`);
                bridges.rows.forEach((row) => this.knownBridges.set(row.address, row.bridge_name));
                // Load drainers
                const drainers = yield config_1.default.executeQuery(`SELECT address FROM known_malicious_delegates`);
                drainers.rows.forEach((row) => this.knownDrainers.add(row.address));
                logger_1.default.info({ source: 'FundTracker', exchanges: this.knownExchanges.size, bridges: this.knownBridges.size }, 'Loaded known addresses');
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'FundTracker' }, 'Error loading known addresses');
            }
        });
    }
    /**
     * Start tracing funds from a compromised wallet
     */
    startTrace(sourceWallet, initialAmount, tokenMint) {
        return __awaiter(this, void 0, void 0, function* () {
            const traceId = (0, uuid_1.v4)();
            const trace = {
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
            yield config_1.default.executeQuery(`INSERT INTO fund_traces (
        trace_id, source_wallet, initial_amount, token_mint, status, current_depth
      ) VALUES ($1, $2, $3, $4, $5, $6)`, [traceId, sourceWallet, initialAmount, tokenMint, "in_progress", 0]);
            // Start async tracing
            this.performTrace(trace).catch((err) => {
                logger_1.default.error({ err, source: 'FundTracker', traceId }, 'Trace failed');
                this.updateTraceStatus(traceId, "partial");
            });
            return trace;
        });
    }
    /**
     * Perform the fund tracing
     */
    performTrace(trace) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = {
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
            const sourceNode = {
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
            const queue = [
                { address: trace.sourceWallet, depth: 0, amount: trace.initialAmount },
            ];
            const visited = new Set();
            while (queue.length > 0 && trace.currentDepth < TRACKING_CONFIG.maxDepth) {
                const current = queue.shift();
                if (visited.has(current.address))
                    continue;
                visited.add(current.address);
                // Update trace depth
                if (current.depth > trace.currentDepth) {
                    trace.currentDepth = current.depth;
                    yield this.updateTraceDepth(trace.traceId, current.depth);
                }
                // Get outgoing transactions
                const outflows = yield this.getOutgoingTransactions(current.address, trace.startedAt, trace.tokenMint);
                for (const outflow of outflows) {
                    if (outflow.amount < TRACKING_CONFIG.minTrackableAmountSol)
                        continue;
                    // Add edge
                    const edge = {
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
                        ? yield this.classifyAddressEnhanced(outflow.toAddress)
                        : this.classifyAddress(outflow.toAddress);
                    // Add or update node
                    if (!graph.nodes.has(outflow.toAddress)) {
                        const label = this.threatIntel
                            ? yield this.getAddressLabelEnhanced(outflow.toAddress)
                            : this.getAddressLabel(outflow.toAddress);
                        const node = {
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
                    }
                    else {
                        const node = graph.nodes.get(outflow.toAddress);
                        node.totalReceived += outflow.amount;
                        node.lastSeen = outflow.timestamp;
                    }
                    // Handle special destinations
                    if (nodeType === "exchange") {
                        const deposit = {
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
                    }
                    else if (nodeType === "bridge") {
                        const transfer = {
                            bridgeName: this.knownBridges.get(outflow.toAddress) || "Unknown Bridge",
                            bridgeAddress: outflow.toAddress,
                            amount: outflow.amount,
                            tokenMint: trace.tokenMint,
                            signature: outflow.signature,
                            timestamp: outflow.timestamp,
                        };
                        graph.bridgeTransfers.push(transfer);
                        graph.lostAmount += outflow.amount; // Bridge transfers are harder to recover
                    }
                    else if (current.depth < TRACKING_CONFIG.maxDepth - 1) {
                        // Continue tracing through intermediate nodes (non-exchange, non-bridge)
                        queue.push({
                            address: outflow.toAddress,
                            depth: current.depth + 1,
                            amount: outflow.amount,
                        });
                    }
                }
                // Rate limiting between iterations
                yield this.sleep(100);
            }
            // Store graph in database
            yield this.storeGraph(graph);
            // Calculate final recovery probability
            trace.totalTracked = graph.edges.reduce((sum, e) => sum + e.amount, 0);
            trace.totalRecoverable = graph.recoverableAmount;
            trace.recoveryProbability = this.calculateRecoveryProbability(graph);
            trace.status = "completed";
            yield this.updateTraceCompletion(trace);
            return graph;
        });
    }
    /**
     * Get outgoing transactions from an address
     */
    getOutgoingTransactions(address, since, tokenMint) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const connection = this.getConnection();
            const pubkey = new web3_js_1.PublicKey(address);
            const results = [];
            try {
                const signatures = yield connection.getSignaturesForAddress(pubkey, {
                    limit: TRACKING_CONFIG.maxTransactionsPerHop,
                });
                for (const sig of signatures) {
                    if (sig.blockTime && new Date(sig.blockTime * 1000) < since) {
                        continue; // Skip transactions before the compromise
                    }
                    const tx = yield connection.getParsedTransaction(sig.signature, {
                        maxSupportedTransactionVersion: 0,
                    });
                    if (!tx || !tx.meta)
                        continue;
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
                                const preToken = (_a = tx.meta.preTokenBalances) === null || _a === void 0 ? void 0 : _a.find((t) => t.accountIndex === postToken.accountIndex);
                                if (preToken && preToken.uiTokenAmount && postToken.uiTokenAmount) {
                                    const tokenChange = (postToken.uiTokenAmount.uiAmount || 0) -
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'FundTracker', address }, 'Error getting transactions');
            }
            return results;
        });
    }
    /**
     * Extract destination address from transaction
     */
    extractDestination(tx, sourceAddress) {
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
            if ("parsed" in ix && ix.parsed) {
                const parsed = ix.parsed;
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
    classifyAddress(address) {
        if (this.knownExchanges.has(address))
            return "exchange";
        if (this.knownBridges.has(address))
            return "bridge";
        if (this.knownMixers.has(address))
            return "mixer";
        if (this.knownDrainers.has(address))
            return "drainer";
        return "intermediate";
    }
    /**
     * Get human-readable label for address
     */
    getAddressLabel(address) {
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
    calculateNodeRisk(nodeType) {
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
    calculateRecoveryProbability(graph) {
        if (graph.totalAmount === 0)
            return 0;
        // Base probability from exchange deposits
        const exchangeRecoveryRate = 0.7; // 70% chance of recovery from exchanges with freeze request
        const bridgeRecoveryRate = 0.1; // 10% chance once bridged
        const unknownRecoveryRate = 0.3; // 30% for unknown destinations
        const exchangeAmount = graph.exchangeDeposits.reduce((sum, d) => sum + d.amount, 0);
        const bridgeAmount = graph.bridgeTransfers.reduce((sum, t) => sum + t.amount, 0);
        const unknownAmount = graph.totalAmount - exchangeAmount - bridgeAmount;
        const weightedRecovery = (exchangeAmount * exchangeRecoveryRate +
            bridgeAmount * bridgeRecoveryRate +
            unknownAmount * unknownRecoveryRate) /
            graph.totalAmount;
        return Math.round(weightedRecovery * 100);
    }
    /**
     * Store fund graph in database
     */
    storeGraph(graph) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Store nodes
                for (const [address, node] of graph.nodes) {
                    yield config_1.default.executeQuery(`INSERT INTO fund_trace_nodes (
            trace_id, address, node_type, label, total_received, total_sent,
            current_balance, first_seen, last_seen, risk_level
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (trace_id, address) DO UPDATE SET
            total_received = EXCLUDED.total_received,
            total_sent = EXCLUDED.total_sent,
            current_balance = EXCLUDED.current_balance,
            last_seen = EXCLUDED.last_seen`, [
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
                    ]);
                }
                // Store edges
                for (const edge of graph.edges) {
                    yield config_1.default.executeQuery(`INSERT INTO fund_trace_edges (
            trace_id, from_address, to_address, signature, amount,
            token_mint, timestamp, hop_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (trace_id, signature) DO NOTHING`, [
                        graph.traceId,
                        edge.fromAddress,
                        edge.toAddress,
                        edge.signature,
                        edge.amount,
                        edge.tokenMint,
                        edge.timestamp,
                        edge.hopNumber,
                    ]);
                }
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'FundTracker' }, 'Error storing graph');
            }
        });
    }
    /**
     * Create a freeze request for an exchange
     */
    createFreezeRequest(traceId, exchangeDeposit) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestId = (0, uuid_1.v4)();
            const request = {
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
            yield config_1.default.executeQuery(`INSERT INTO freeze_requests (
        request_id, trace_id, exchange_name, exchange_address,
        deposit_address, amount, token_mint, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                requestId,
                traceId,
                exchangeDeposit.exchangeName,
                exchangeDeposit.exchangeAddress,
                exchangeDeposit.exchangeAddress,
                exchangeDeposit.amount,
                exchangeDeposit.tokenMint,
                "draft",
            ]);
            return request;
        });
    }
    /**
     * Generate freeze request template for an exchange
     */
    generateFreezeRequestTemplate(request, victimInfo) {
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
    generateRecoveryReport(traceId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get trace info
                const traceResult = yield config_1.default.executeQuery(`SELECT * FROM fund_traces WHERE trace_id = $1`, [traceId]);
                if (traceResult.rows.length === 0)
                    return null;
                const trace = traceResult.rows[0];
                // Get nodes
                const nodesResult = yield config_1.default.executeQuery(`SELECT * FROM fund_trace_nodes WHERE trace_id = $1`, [traceId]);
                // Get edges
                const edgesResult = yield config_1.default.executeQuery(`SELECT * FROM fund_trace_edges WHERE trace_id = $1`, [traceId]);
                // Calculate fund distribution
                const exchangeNodes = nodesResult.rows.filter((n) => n.node_type === "exchange");
                const bridgeNodes = nodesResult.rows.filter((n) => n.node_type === "bridge");
                const unknownNodes = nodesResult.rows.filter((n) => !["exchange", "bridge", "source"].includes(n.node_type));
                const inExchanges = exchangeNodes.reduce((sum, n) => sum + parseFloat(n.total_received || 0), 0);
                const inBridges = bridgeNodes.reduce((sum, n) => sum + parseFloat(n.total_received || 0), 0);
                const inUnknown = unknownNodes.reduce((sum, n) => sum + parseFloat(n.current_balance || 0), 0);
                // Build exchange deposits list
                const exchangeDeposits = exchangeNodes.map((n) => ({
                    exchangeName: n.label || "Unknown Exchange",
                    exchangeAddress: n.address,
                    amount: parseFloat(n.total_received || 0),
                    signature: "",
                    timestamp: new Date(n.first_seen),
                    freezeRequestSent: false,
                }));
                // Build bridge transfers list
                const bridgeTransfers = bridgeNodes.map((n) => ({
                    bridgeName: n.label || "Unknown Bridge",
                    bridgeAddress: n.address,
                    amount: parseFloat(n.total_received || 0),
                    signature: "",
                    timestamp: new Date(n.first_seen),
                }));
                // Generate recommended actions
                const recommendedActions = [];
                if (exchangeDeposits.length > 0) {
                    recommendedActions.push(`Submit freeze requests to ${exchangeDeposits.length} exchange(s) immediately`);
                    for (const deposit of exchangeDeposits) {
                        recommendedActions.push(`- ${deposit.exchangeName}: ${deposit.amount.toFixed(4)} SOL deposited`);
                    }
                }
                if (bridgeTransfers.length > 0) {
                    recommendedActions.push(`Monitor ${bridgeTransfers.length} bridge transfer(s) - funds may have left Solana`);
                }
                if (inUnknown > 0) {
                    recommendedActions.push(`Continue monitoring ${inUnknown.toFixed(4)} SOL in intermediate wallets`);
                }
                const recoveryProbability = this.calculateRecoveryProbabilityFromAmounts(inExchanges, inBridges, inUnknown, parseFloat(trace.initial_amount));
                const report = {
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'FundTracker' }, 'Error generating recovery report');
                return null;
            }
        });
    }
    /**
     * Calculate recovery probability from fund distribution
     */
    calculateRecoveryProbabilityFromAmounts(inExchanges, inBridges, inUnknown, total) {
        if (total === 0)
            return 0;
        const exchangeRecoveryRate = 0.7;
        const bridgeRecoveryRate = 0.1;
        const unknownRecoveryRate = 0.3;
        const weighted = (inExchanges * exchangeRecoveryRate +
            inBridges * bridgeRecoveryRate +
            inUnknown * unknownRecoveryRate) /
            total;
        return Math.round(weighted * 100);
    }
    /**
     * Get trace by ID
     */
    getTrace(traceId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM fund_traces WHERE trace_id = $1`, [traceId]);
                if (result.rows.length === 0)
                    return null;
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'FundTracker' }, 'Error getting trace');
                return null;
            }
        });
    }
    /**
     * Get all traces for a wallet
     */
    getTracesForWallet(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM fund_traces WHERE source_wallet = $1 ORDER BY created_at DESC`, [walletAddress]);
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'FundTracker' }, 'Error getting traces');
                return [];
            }
        });
    }
    /**
     * Update trace depth
     */
    updateTraceDepth(traceId, depth) {
        return __awaiter(this, void 0, void 0, function* () {
            yield config_1.default.executeQuery(`UPDATE fund_traces SET current_depth = $2, updated_at = CURRENT_TIMESTAMP WHERE trace_id = $1`, [traceId, depth]);
        });
    }
    /**
     * Update trace status
     */
    updateTraceStatus(traceId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield config_1.default.executeQuery(`UPDATE fund_traces SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE trace_id = $1`, [traceId, status]);
        });
    }
    /**
     * Update trace completion
     */
    updateTraceCompletion(trace) {
        return __awaiter(this, void 0, void 0, function* () {
            yield config_1.default.executeQuery(`UPDATE fund_traces SET
        status = $2,
        current_depth = $3,
        recovery_probability = $4,
        total_tracked = $5,
        total_recoverable = $6,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE trace_id = $1`, [
                trace.traceId,
                trace.status,
                trace.currentDepth,
                trace.recoveryProbability,
                trace.totalTracked,
                trace.totalRecoverable,
            ]);
        });
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.FundTracker = FundTracker;
// Export singleton instance
exports.fundTracker = new FundTracker();
exports.default = exports.fundTracker;
