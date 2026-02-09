"use strict";
/**
 * Exchange Coordinator Service
 *
 * Manages communication with exchanges for fund freezing and recovery.
 * Part of WalletShield Recovery - Phase 3
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
exports.exchangeCoordinator = exports.ExchangeCoordinator = void 0;
const dotenv = __importStar(require("dotenv"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
/**
 * ExchangeCoordinator class
 * Manages exchange communications and freeze requests
 */
class ExchangeCoordinator {
    constructor() {
        this.exchangeContacts = new Map();
        this.threatIntel = null;
        this.loadExchangeContacts();
    }
    /**
     * Set the threat intelligence service for Arkham entity fallback
     */
    setThreatIntel(service) {
        this.threatIntel = service;
    }
    /**
     * Load exchange contacts from database
     */
    loadExchangeContacts() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM exchange_contacts WHERE is_active = true`);
                result.rows.forEach((row) => {
                    const contact = {
                        exchangeId: row.exchange_id,
                        exchangeName: row.exchange_name,
                        exchangeType: row.exchange_type,
                        complianceEmail: row.compliance_email,
                        compliancePhone: row.compliance_phone,
                        emergencyEmail: row.emergency_email,
                        apiEndpoint: row.api_endpoint,
                        responseTimeSla: row.response_time_sla || 24,
                        freezeCapability: row.freeze_capability,
                        kycRequired: row.kyc_required,
                        minFreezeAmount: parseFloat(row.min_freeze_amount || 0),
                        supportedTokens: row.supported_tokens || [],
                        documentationUrl: row.documentation_url,
                        notes: row.notes,
                        isVerified: row.is_verified,
                        avgResponseTime: row.avg_response_time,
                        successRate: row.success_rate,
                    };
                    this.exchangeContacts.set(row.exchange_id, contact);
                });
                logger_1.default.info({ source: 'ExchangeCoordinator', count: this.exchangeContacts.size }, 'Loaded exchange contacts');
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error loading exchange contacts');
            }
        });
    }
    /**
     * Get exchange contact by ID
     */
    getExchangeContact(exchangeId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.exchangeContacts.has(exchangeId)) {
                return this.exchangeContacts.get(exchangeId);
            }
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM exchange_contacts WHERE exchange_id = $1`, [exchangeId]);
                if (result.rows.length === 0)
                    return null;
                const row = result.rows[0];
                return {
                    exchangeId: row.exchange_id,
                    exchangeName: row.exchange_name,
                    exchangeType: row.exchange_type,
                    complianceEmail: row.compliance_email,
                    compliancePhone: row.compliance_phone,
                    emergencyEmail: row.emergency_email,
                    apiEndpoint: row.api_endpoint,
                    responseTimeSla: row.response_time_sla || 24,
                    freezeCapability: row.freeze_capability,
                    kycRequired: row.kyc_required,
                    minFreezeAmount: parseFloat(row.min_freeze_amount || 0),
                    supportedTokens: row.supported_tokens || [],
                    documentationUrl: row.documentation_url,
                    notes: row.notes,
                    isVerified: row.is_verified,
                    avgResponseTime: row.avg_response_time,
                    successRate: row.success_rate,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error getting exchange contact');
                return null;
            }
        });
    }
    /**
     * Get exchange contact by address
     */
    getExchangeByAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const result = yield config_1.default.executeQuery(`SELECT ec.* FROM exchange_contacts ec
         JOIN known_exchanges ke ON ec.exchange_name = ke.exchange_name
         WHERE ke.address = $1`, [address]);
                if (result.rows.length > 0) {
                    const row = result.rows[0];
                    return {
                        exchangeId: row.exchange_id,
                        exchangeName: row.exchange_name,
                        exchangeType: row.exchange_type,
                        complianceEmail: row.compliance_email,
                        compliancePhone: row.compliance_phone,
                        emergencyEmail: row.emergency_email,
                        apiEndpoint: row.api_endpoint,
                        responseTimeSla: row.response_time_sla || 24,
                        freezeCapability: row.freeze_capability,
                        kycRequired: row.kyc_required,
                        minFreezeAmount: parseFloat(row.min_freeze_amount || 0),
                        supportedTokens: row.supported_tokens || [],
                        documentationUrl: row.documentation_url,
                        notes: row.notes,
                        isVerified: row.is_verified,
                        avgResponseTime: row.avg_response_time,
                        successRate: row.success_rate,
                    };
                }
                // Arkham fallback: try entity resolution for unknown addresses
                if (this.threatIntel) {
                    try {
                        const entity = yield this.threatIntel.lookupEntityCached(address);
                        if (((_a = entity === null || entity === void 0 ? void 0 : entity.entityType) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("exchange")) && entity.entityName) {
                            // Check if we have this exchange by name
                            const byName = yield config_1.default.executeQuery(`SELECT * FROM exchange_contacts WHERE LOWER(exchange_name) = LOWER($1)`, [entity.entityName]);
                            if (byName.rows.length > 0) {
                                const row = byName.rows[0];
                                return {
                                    exchangeId: row.exchange_id,
                                    exchangeName: row.exchange_name,
                                    exchangeType: row.exchange_type,
                                    complianceEmail: row.compliance_email,
                                    compliancePhone: row.compliance_phone,
                                    emergencyEmail: row.emergency_email,
                                    apiEndpoint: row.api_endpoint,
                                    responseTimeSla: row.response_time_sla || 24,
                                    freezeCapability: row.freeze_capability,
                                    kycRequired: row.kyc_required,
                                    minFreezeAmount: parseFloat(row.min_freeze_amount || 0),
                                    supportedTokens: row.supported_tokens || [],
                                    documentationUrl: row.documentation_url,
                                    notes: row.notes,
                                    isVerified: row.is_verified,
                                    avgResponseTime: row.avg_response_time,
                                    successRate: row.success_rate,
                                };
                            }
                        }
                    }
                    catch (err) {
                        // Arkham fallback failed, return null
                    }
                }
                return null;
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error getting exchange by address');
                return null;
            }
        });
    }
    /**
     * List all exchange contacts
     */
    listExchangeContacts() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM exchange_contacts WHERE is_active = true ORDER BY exchange_name`);
                return result.rows.map((row) => ({
                    exchangeId: row.exchange_id,
                    exchangeName: row.exchange_name,
                    exchangeType: row.exchange_type,
                    complianceEmail: row.compliance_email,
                    compliancePhone: row.compliance_phone,
                    emergencyEmail: row.emergency_email,
                    apiEndpoint: row.api_endpoint,
                    responseTimeSla: row.response_time_sla || 24,
                    freezeCapability: row.freeze_capability,
                    kycRequired: row.kyc_required,
                    minFreezeAmount: parseFloat(row.min_freeze_amount || 0),
                    supportedTokens: row.supported_tokens || [],
                    documentationUrl: row.documentation_url,
                    notes: row.notes,
                    isVerified: row.is_verified,
                    avgResponseTime: row.avg_response_time,
                    successRate: row.success_rate,
                }));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error listing exchange contacts');
                return [];
            }
        });
    }
    /**
     * Create a new freeze request
     */
    createFreezeRequest(traceId, exchangeName, depositAddress, depositSignature, amount, victimWallet, tokenMint, tokenSymbol) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestId = (0, uuid_1.v4)();
            const priority = this.calculatePriority(amount);
            const request = {
                requestId,
                traceId,
                exchangeId: exchangeName.toLowerCase().replace(/\s+/g, "-"),
                exchangeName,
                victimWallet,
                depositAddress,
                depositSignature,
                amount,
                tokenMint,
                tokenSymbol,
                status: "draft",
                priority,
                followUpCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            yield config_1.default.executeQuery(`INSERT INTO freeze_requests_v2 (
        request_id, trace_id, exchange_id, exchange_name, victim_wallet,
        deposit_address, deposit_signature, amount, token_mint, token_symbol,
        status, priority, follow_up_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                requestId,
                traceId,
                request.exchangeId,
                exchangeName,
                victimWallet,
                depositAddress,
                depositSignature,
                amount,
                tokenMint,
                tokenSymbol,
                "draft",
                priority,
                0,
            ]);
            return request;
        });
    }
    /**
     * Calculate request priority based on amount
     */
    calculatePriority(amount) {
        if (amount >= 100)
            return "critical";
        if (amount >= 10)
            return "high";
        if (amount >= 1)
            return "medium";
        return "low";
    }
    /**
     * Generate evidence package for a freeze request
     */
    generateEvidencePackage(requestId, traceId, victimWallet, victimStatement) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageId = (0, uuid_1.v4)();
            // Get trace data
            const traceResult = yield config_1.default.executeQuery(`SELECT * FROM fund_traces WHERE trace_id = $1`, [traceId]);
            if (traceResult.rows.length === 0) {
                throw new Error("Trace not found");
            }
            const trace = traceResult.rows[0];
            // Get fund flow edges
            const edgesResult = yield config_1.default.executeQuery(`SELECT * FROM fund_trace_edges WHERE trace_id = $1 ORDER BY hop_number, timestamp`, [traceId]);
            const fundFlowSummary = edgesResult.rows.map((row, index) => ({
                stepNumber: index + 1,
                fromAddress: row.from_address,
                toAddress: row.to_address,
                amount: parseFloat(row.amount),
                signature: row.signature,
                timestamp: new Date(row.timestamp),
                addressType: "wallet",
                addressLabel: undefined,
            }));
            // Get exchange deposits
            const nodesResult = yield config_1.default.executeQuery(`SELECT * FROM fund_trace_nodes WHERE trace_id = $1 AND node_type = 'exchange'`, [traceId]);
            const exchangeDeposits = nodesResult.rows.map((row) => ({
                exchangeName: row.label || "Unknown Exchange",
                depositAddress: row.address,
                depositSignature: "", // Would need to look up from edges
                amount: parseFloat(row.total_received),
                timestamp: new Date(row.first_seen),
                blockHeight: 0,
                confirmations: 1000, // Assume confirmed
            }));
            // Generate blockchain evidence
            const blockchainEvidence = edgesResult.rows.slice(0, 10).map((row) => ({
                signature: row.signature,
                blockHash: "",
                blockHeight: 0,
                timestamp: new Date(row.timestamp),
                slot: 0,
                confirmations: 1000,
                explorerUrl: `https://solscan.io/tx/${row.signature}`,
            }));
            // Generate hash signature for integrity
            const crypto = require("crypto");
            const hashData = JSON.stringify({
                packageId,
                traceId,
                victimWallet,
                totalAmount: parseFloat(trace.initial_amount),
                signatures: edgesResult.rows.map((r) => r.signature),
            });
            const hashSignature = crypto.createHash("sha256").update(hashData).digest("hex");
            const evidencePackage = {
                packageId,
                traceId,
                requestId,
                victimWallet,
                victimStatement,
                incidentDate: new Date(trace.created_at),
                discoveryDate: new Date(),
                totalStolenAmount: parseFloat(trace.initial_amount),
                tokenMint: trace.token_mint,
                transactionSignatures: edgesResult.rows.map((r) => r.signature),
                fundFlowSummary,
                exchangeDeposits,
                blockchainEvidence,
                supportingDocuments: [],
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                hashSignature,
            };
            // Store evidence package
            yield config_1.default.executeQuery(`INSERT INTO evidence_packages (
        package_id, trace_id, request_id, victim_wallet, victim_statement,
        incident_date, discovery_date, total_stolen_amount, token_mint,
        transaction_signatures, fund_flow_summary, exchange_deposits,
        blockchain_evidence, hash_signature, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
                packageId,
                traceId,
                requestId,
                victimWallet,
                victimStatement,
                evidencePackage.incidentDate,
                evidencePackage.discoveryDate,
                evidencePackage.totalStolenAmount,
                evidencePackage.tokenMint,
                JSON.stringify(evidencePackage.transactionSignatures),
                JSON.stringify(fundFlowSummary),
                JSON.stringify(exchangeDeposits),
                JSON.stringify(blockchainEvidence),
                hashSignature,
                evidencePackage.expiresAt,
            ]);
            // Update freeze request with evidence package
            yield config_1.default.executeQuery(`UPDATE freeze_requests_v2 SET
        evidence_package_id = $2,
        status = 'ready',
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $1`, [requestId, packageId]);
            return evidencePackage;
        });
    }
    /**
     * Generate formal freeze request email template
     */
    generateFreezeRequestEmail(request, evidencePackage, exchangeContact) {
        const priorityLabel = request.priority.toUpperCase();
        const amountStr = request.tokenSymbol
            ? `${request.amount.toFixed(4)} ${request.tokenSymbol}`
            : `${request.amount.toFixed(4)} SOL`;
        const subject = `[${priorityLabel}] Urgent Freeze Request - Stolen Cryptocurrency - Ref: ${request.requestId.slice(0, 8)}`;
        const body = `
Dear ${exchangeContact.exchangeName} Compliance Team,

We are writing to formally request an urgent freeze on funds that have been traced to your platform following a cryptocurrency theft on the Solana blockchain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCIDENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reference ID: ${request.requestId}
Priority Level: ${priorityLabel}
Incident Date: ${evidencePackage.incidentDate.toISOString().split("T")[0]}
Discovery Date: ${evidencePackage.discoveryDate.toISOString().split("T")[0]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VICTIM INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Victim Wallet Address: ${request.victimWallet}
Total Amount Stolen: ${evidencePackage.totalStolenAmount.toFixed(4)} SOL
${evidencePackage.tokenMint ? `Token Contract: ${evidencePackage.tokenMint}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPOSIT ON YOUR PLATFORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deposit Address: ${request.depositAddress}
Deposit Amount: ${amountStr}
Deposit Transaction: ${request.depositSignature}
Solscan Link: https://solscan.io/tx/${request.depositSignature}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOCKCHAIN EVIDENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We have compiled comprehensive blockchain evidence documenting the fund flow from the victim's wallet to your platform:

• Total Transactions Traced: ${evidencePackage.transactionSignatures.length}
• Number of Intermediary Addresses: ${evidencePackage.fundFlowSummary.length}
• Evidence Package ID: ${evidencePackage.packageId}
• Evidence Hash (SHA-256): ${evidencePackage.hashSignature}

The attached evidence package includes:
1. Complete transaction trace with signatures
2. Fund flow diagram
3. Blockchain verification data
4. Timestamp analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUESTED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. IMMEDIATE: Freeze any accounts associated with the deposit address
2. Preserve all transaction records and account information
3. Provide a case/ticket number for tracking
4. Notify us of account holder information as permitted by law
5. Coordinate with law enforcement upon request

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE REQUESTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please acknowledge receipt of this request within 24 hours and provide:
• Confirmation of freeze action
• Case/ticket reference number
• Estimated timeline for resolution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This request is made in good faith based on verified blockchain evidence. We are prepared to provide additional documentation, coordinate with law enforcement, or participate in any investigation as required.

Time is critical in cryptocurrency theft cases. We appreciate your prompt attention to this matter.

Best regards,
WalletShield Recovery Platform
Reference: ${request.requestId}

---
Evidence Package Attached
Integrity Hash: ${evidencePackage.hashSignature}
Valid Until: ${evidencePackage.expiresAt.toISOString().split("T")[0]}
`.trim();
        return {
            subject,
            body,
            attachments: [`evidence_package_${evidencePackage.packageId}.pdf`],
        };
    }
    /**
     * Update freeze request status
     */
    updateRequestStatus(requestId, status, exchangeTicketId, exchangeResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            const updates = { status, updated_at: new Date() };
            const params = [requestId, status];
            let paramIndex = 3;
            let query = `UPDATE freeze_requests_v2 SET status = $2, updated_at = CURRENT_TIMESTAMP`;
            if (exchangeTicketId) {
                query += `, exchange_ticket_id = $${paramIndex++}`;
                params.push(exchangeTicketId);
            }
            if (exchangeResponse) {
                query += `, exchange_response = $${paramIndex++}`;
                params.push(exchangeResponse);
            }
            // Set timestamps based on status
            if (status === "submitted") {
                query += `, submitted_at = CURRENT_TIMESTAMP`;
            }
            else if (status === "acknowledged") {
                query += `, acknowledged_at = CURRENT_TIMESTAMP`;
            }
            else if (status === "frozen" || status === "partially_frozen") {
                query += `, frozen_at = CURRENT_TIMESTAMP`;
            }
            else if (["rejected", "released", "closed"].includes(status)) {
                query += `, resolved_at = CURRENT_TIMESTAMP`;
            }
            query += ` WHERE request_id = $1`;
            yield config_1.default.executeQuery(query, params);
            // Update exchange statistics if resolved
            if (["frozen", "rejected", "released"].includes(status)) {
                yield this.updateExchangeStats(requestId, status);
            }
        });
    }
    /**
     * Update exchange statistics based on request outcome
     */
    updateExchangeStats(requestId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requestResult = yield config_1.default.executeQuery(`SELECT exchange_id, submitted_at, CURRENT_TIMESTAMP as now FROM freeze_requests_v2 WHERE request_id = $1`, [requestId]);
                if (requestResult.rows.length === 0)
                    return;
                const request = requestResult.rows[0];
                const exchangeId = request.exchange_id;
                // Calculate response time in hours
                const submittedAt = new Date(request.submitted_at);
                const responseTime = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60);
                // Get current stats
                const statsResult = yield config_1.default.executeQuery(`SELECT total_requests, successful_freezes, avg_response_time FROM exchange_contacts WHERE exchange_id = $1`, [exchangeId]);
                if (statsResult.rows.length > 0) {
                    const stats = statsResult.rows[0];
                    const totalRequests = (stats.total_requests || 0) + 1;
                    const successfulFreezes = (stats.successful_freezes || 0) + (status === "frozen" ? 1 : 0);
                    const avgResponseTime = stats.avg_response_time
                        ? (stats.avg_response_time + responseTime) / 2
                        : responseTime;
                    const successRate = (successfulFreezes / totalRequests) * 100;
                    yield config_1.default.executeQuery(`UPDATE exchange_contacts SET
            total_requests = $2,
            successful_freezes = $3,
            avg_response_time = $4,
            success_rate = $5,
            last_contacted_at = CURRENT_TIMESTAMP
          WHERE exchange_id = $1`, [exchangeId, totalRequests, successfulFreezes, avgResponseTime, successRate]);
                }
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error updating exchange stats');
            }
        });
    }
    /**
     * Get freeze request by ID
     */
    getFreezeRequest(requestId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM freeze_requests_v2 WHERE request_id = $1`, [requestId]);
                if (result.rows.length === 0)
                    return null;
                const row = result.rows[0];
                return this.mapRowToFreezeRequest(row);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error getting freeze request');
                return null;
            }
        });
    }
    /**
     * List freeze requests for a trace
     */
    listFreezeRequestsForTrace(traceId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM freeze_requests_v2 WHERE trace_id = $1 ORDER BY created_at DESC`, [traceId]);
                return result.rows.map((row) => this.mapRowToFreezeRequest(row));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error listing freeze requests');
                return [];
            }
        });
    }
    /**
     * List all pending freeze requests
     */
    listPendingRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM freeze_requests_v2
         WHERE status IN ('ready', 'submitted', 'acknowledged', 'under_review')
         ORDER BY
           CASE priority
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             ELSE 4
           END,
           created_at ASC`);
                return result.rows.map((row) => this.mapRowToFreezeRequest(row));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error listing pending requests');
                return [];
            }
        });
    }
    /**
     * Get requests needing follow-up
     */
    getRequestsNeedingFollowUp() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM freeze_requests_v2
         WHERE status IN ('submitted', 'acknowledged', 'under_review')
         AND (next_follow_up_at IS NULL OR next_follow_up_at <= CURRENT_TIMESTAMP)
         ORDER BY created_at ASC`);
                return result.rows.map((row) => this.mapRowToFreezeRequest(row));
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error getting follow-up requests');
                return [];
            }
        });
    }
    /**
     * Record follow-up action
     */
    recordFollowUp(requestId_1) {
        return __awaiter(this, arguments, void 0, function* (requestId, nextFollowUpHours = 24) {
            yield config_1.default.executeQuery(`UPDATE freeze_requests_v2 SET
        follow_up_count = follow_up_count + 1,
        next_follow_up_at = CURRENT_TIMESTAMP + INTERVAL '${nextFollowUpHours} hours',
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $1`, [requestId]);
        });
    }
    /**
     * Get evidence package
     */
    getEvidencePackage(packageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM evidence_packages WHERE package_id = $1`, [packageId]);
                if (result.rows.length === 0)
                    return null;
                const row = result.rows[0];
                return {
                    packageId: row.package_id,
                    traceId: row.trace_id,
                    requestId: row.request_id,
                    victimWallet: row.victim_wallet,
                    victimStatement: row.victim_statement,
                    incidentDate: new Date(row.incident_date),
                    discoveryDate: new Date(row.discovery_date),
                    totalStolenAmount: parseFloat(row.total_stolen_amount),
                    tokenMint: row.token_mint,
                    transactionSignatures: row.transaction_signatures,
                    fundFlowSummary: row.fund_flow_summary,
                    exchangeDeposits: row.exchange_deposits,
                    blockchainEvidence: row.blockchain_evidence,
                    supportingDocuments: row.supporting_documents || [],
                    generatedAt: new Date(row.created_at),
                    expiresAt: new Date(row.expires_at),
                    hashSignature: row.hash_signature,
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error getting evidence package');
                return null;
            }
        });
    }
    /**
     * Get freeze request statistics
     */
    getStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const totalResult = yield config_1.default.executeQuery(`SELECT COUNT(*) as total FROM freeze_requests_v2`);
                const statusResult = yield config_1.default.executeQuery(`SELECT status, COUNT(*) as count FROM freeze_requests_v2 GROUP BY status`);
                const priorityResult = yield config_1.default.executeQuery(`SELECT priority, COUNT(*) as count FROM freeze_requests_v2 GROUP BY priority`);
                const successResult = yield config_1.default.executeQuery(`SELECT
          COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen,
          COUNT(CASE WHEN status IN ('frozen', 'rejected', 'released') THEN 1 END) as resolved
        FROM freeze_requests_v2`);
                const responseResult = yield config_1.default.executeQuery(`SELECT AVG(EXTRACT(EPOCH FROM (frozen_at - submitted_at)) / 3600) as avg_hours
         FROM freeze_requests_v2
         WHERE frozen_at IS NOT NULL AND submitted_at IS NOT NULL`);
                const byStatus = {};
                statusResult.rows.forEach((row) => {
                    byStatus[row.status] = parseInt(row.count);
                });
                const byPriority = {};
                priorityResult.rows.forEach((row) => {
                    byPriority[row.priority] = parseInt(row.count);
                });
                const frozen = parseInt(successResult.rows[0].frozen || 0);
                const resolved = parseInt(successResult.rows[0].resolved || 0);
                const successRate = resolved > 0 ? (frozen / resolved) * 100 : 0;
                return {
                    total: parseInt(totalResult.rows[0].total),
                    byStatus,
                    byPriority,
                    successRate,
                    avgResponseTime: parseFloat(responseResult.rows[0].avg_hours || 0),
                };
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'ExchangeCoordinator' }, 'Error getting statistics');
                return {
                    total: 0,
                    byStatus: {},
                    byPriority: {},
                    successRate: 0,
                    avgResponseTime: 0,
                };
            }
        });
    }
    /**
     * Map database row to FreezeRequest
     */
    mapRowToFreezeRequest(row) {
        return {
            requestId: row.request_id,
            traceId: row.trace_id,
            exchangeId: row.exchange_id,
            exchangeName: row.exchange_name,
            victimWallet: row.victim_wallet,
            depositAddress: row.deposit_address,
            depositSignature: row.deposit_signature,
            amount: parseFloat(row.amount),
            tokenMint: row.token_mint,
            tokenSymbol: row.token_symbol,
            status: row.status,
            priority: row.priority,
            evidencePackageId: row.evidence_package_id,
            submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
            acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
            frozenAt: row.frozen_at ? new Date(row.frozen_at) : undefined,
            resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
            exchangeTicketId: row.exchange_ticket_id,
            exchangeResponse: row.exchange_response,
            followUpCount: row.follow_up_count || 0,
            nextFollowUpAt: row.next_follow_up_at ? new Date(row.next_follow_up_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
exports.ExchangeCoordinator = ExchangeCoordinator;
// Export singleton instance
exports.exchangeCoordinator = new ExchangeCoordinator();
exports.default = exports.exchangeCoordinator;
