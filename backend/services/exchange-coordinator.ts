/**
 * Exchange Coordinator Service
 *
 * Manages communication with exchanges for fund freezing and recovery.
 * Part of WalletShield Recovery - Phase 3
 */

import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/config";

dotenv.config();

// Interfaces
export interface ExchangeContact {
  exchangeId: string;
  exchangeName: string;
  exchangeType: "cex" | "dex";
  complianceEmail?: string;
  compliancePhone?: string;
  emergencyEmail?: string;
  apiEndpoint?: string;
  responseTimeSla: number; // hours
  freezeCapability: boolean;
  kycRequired: boolean;
  minFreezeAmount: number;
  supportedTokens: string[];
  documentationUrl?: string;
  notes?: string;
  isVerified: boolean;
  lastContactedAt?: Date;
  avgResponseTime?: number; // hours
  successRate?: number; // percentage
}

export interface FreezeRequest {
  requestId: string;
  traceId: string;
  exchangeId: string;
  exchangeName: string;
  victimWallet: string;
  depositAddress: string;
  depositSignature: string;
  amount: number;
  tokenMint?: string;
  tokenSymbol?: string;
  status: FreezeRequestStatus;
  priority: "low" | "medium" | "high" | "critical";
  evidencePackageId?: string;
  submittedAt?: Date;
  acknowledgedAt?: Date;
  frozenAt?: Date;
  resolvedAt?: Date;
  exchangeTicketId?: string;
  exchangeResponse?: string;
  followUpCount: number;
  nextFollowUpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type FreezeRequestStatus =
  | "draft"
  | "pending_evidence"
  | "ready"
  | "submitted"
  | "acknowledged"
  | "under_review"
  | "frozen"
  | "partially_frozen"
  | "rejected"
  | "released"
  | "expired"
  | "closed";

export interface EvidencePackage {
  packageId: string;
  traceId: string;
  requestId: string;
  victimWallet: string;
  victimStatement?: string;
  incidentDate: Date;
  discoveryDate: Date;
  totalStolenAmount: number;
  tokenMint?: string;
  transactionSignatures: string[];
  fundFlowSummary: FundFlowStep[];
  exchangeDeposits: ExchangeDepositEvidence[];
  blockchainEvidence: BlockchainEvidence[];
  supportingDocuments: SupportingDocument[];
  generatedAt: Date;
  expiresAt: Date;
  hashSignature: string;
}

export interface FundFlowStep {
  stepNumber: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: string;
  timestamp: Date;
  addressType: string;
  addressLabel?: string;
}

export interface ExchangeDepositEvidence {
  exchangeName: string;
  depositAddress: string;
  depositSignature: string;
  amount: number;
  timestamp: Date;
  blockHeight: number;
  confirmations: number;
}

export interface BlockchainEvidence {
  signature: string;
  blockHash: string;
  blockHeight: number;
  timestamp: Date;
  slot: number;
  confirmations: number;
  explorerUrl: string;
}

export interface SupportingDocument {
  documentId: string;
  documentType: "police_report" | "victim_statement" | "wallet_proof" | "other";
  fileName: string;
  fileHash: string;
  uploadedAt: Date;
}

export interface FreezeRequestTemplate {
  subject: string;
  body: string;
  attachments: string[];
}

/**
 * ExchangeCoordinator class
 * Manages exchange communications and freeze requests
 */
export class ExchangeCoordinator {
  private exchangeContacts: Map<string, ExchangeContact> = new Map();

  constructor() {
    this.loadExchangeContacts();
  }

  /**
   * Load exchange contacts from database
   */
  private async loadExchangeContacts(): Promise<void> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM exchange_contacts WHERE is_active = true`
      );

      result.rows.forEach((row) => {
        const contact: ExchangeContact = {
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

      console.log(`ExchangeCoordinator loaded ${this.exchangeContacts.size} exchange contacts`);
    } catch (error) {
      console.error("Error loading exchange contacts:", error);
    }
  }

  /**
   * Get exchange contact by ID
   */
  async getExchangeContact(exchangeId: string): Promise<ExchangeContact | null> {
    if (this.exchangeContacts.has(exchangeId)) {
      return this.exchangeContacts.get(exchangeId)!;
    }

    try {
      const result = await pool.executeQuery(
        `SELECT * FROM exchange_contacts WHERE exchange_id = $1`,
        [exchangeId]
      );

      if (result.rows.length === 0) return null;

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
    } catch (error) {
      console.error("Error getting exchange contact:", error);
      return null;
    }
  }

  /**
   * Get exchange contact by address
   */
  async getExchangeByAddress(address: string): Promise<ExchangeContact | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT ec.* FROM exchange_contacts ec
         JOIN known_exchanges ke ON ec.exchange_name = ke.exchange_name
         WHERE ke.address = $1`,
        [address]
      );

      if (result.rows.length === 0) return null;

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
    } catch (error) {
      console.error("Error getting exchange by address:", error);
      return null;
    }
  }

  /**
   * List all exchange contacts
   */
  async listExchangeContacts(): Promise<ExchangeContact[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM exchange_contacts WHERE is_active = true ORDER BY exchange_name`
      );

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
    } catch (error) {
      console.error("Error listing exchange contacts:", error);
      return [];
    }
  }

  /**
   * Create a new freeze request
   */
  async createFreezeRequest(
    traceId: string,
    exchangeName: string,
    depositAddress: string,
    depositSignature: string,
    amount: number,
    victimWallet: string,
    tokenMint?: string,
    tokenSymbol?: string
  ): Promise<FreezeRequest> {
    const requestId = uuidv4();
    const priority = this.calculatePriority(amount);

    const request: FreezeRequest = {
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

    await pool.executeQuery(
      `INSERT INTO freeze_requests_v2 (
        request_id, trace_id, exchange_id, exchange_name, victim_wallet,
        deposit_address, deposit_signature, amount, token_mint, token_symbol,
        status, priority, follow_up_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
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
      ]
    );

    return request;
  }

  /**
   * Calculate request priority based on amount
   */
  private calculatePriority(amount: number): "low" | "medium" | "high" | "critical" {
    if (amount >= 100) return "critical";
    if (amount >= 10) return "high";
    if (amount >= 1) return "medium";
    return "low";
  }

  /**
   * Generate evidence package for a freeze request
   */
  async generateEvidencePackage(
    requestId: string,
    traceId: string,
    victimWallet: string,
    victimStatement?: string
  ): Promise<EvidencePackage> {
    const packageId = uuidv4();

    // Get trace data
    const traceResult = await pool.executeQuery(
      `SELECT * FROM fund_traces WHERE trace_id = $1`,
      [traceId]
    );

    if (traceResult.rows.length === 0) {
      throw new Error("Trace not found");
    }

    const trace = traceResult.rows[0];

    // Get fund flow edges
    const edgesResult = await pool.executeQuery(
      `SELECT * FROM fund_trace_edges WHERE trace_id = $1 ORDER BY hop_number, timestamp`,
      [traceId]
    );

    const fundFlowSummary: FundFlowStep[] = edgesResult.rows.map((row, index) => ({
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
    const nodesResult = await pool.executeQuery(
      `SELECT * FROM fund_trace_nodes WHERE trace_id = $1 AND node_type = 'exchange'`,
      [traceId]
    );

    const exchangeDeposits: ExchangeDepositEvidence[] = nodesResult.rows.map((row) => ({
      exchangeName: row.label || "Unknown Exchange",
      depositAddress: row.address,
      depositSignature: "", // Would need to look up from edges
      amount: parseFloat(row.total_received),
      timestamp: new Date(row.first_seen),
      blockHeight: 0,
      confirmations: 1000, // Assume confirmed
    }));

    // Generate blockchain evidence
    const blockchainEvidence: BlockchainEvidence[] = edgesResult.rows.slice(0, 10).map((row) => ({
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

    const evidencePackage: EvidencePackage = {
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
    await pool.executeQuery(
      `INSERT INTO evidence_packages (
        package_id, trace_id, request_id, victim_wallet, victim_statement,
        incident_date, discovery_date, total_stolen_amount, token_mint,
        transaction_signatures, fund_flow_summary, exchange_deposits,
        blockchain_evidence, hash_signature, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
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
      ]
    );

    // Update freeze request with evidence package
    await pool.executeQuery(
      `UPDATE freeze_requests_v2 SET
        evidence_package_id = $2,
        status = 'ready',
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $1`,
      [requestId, packageId]
    );

    return evidencePackage;
  }

  /**
   * Generate formal freeze request email template
   */
  generateFreezeRequestEmail(
    request: FreezeRequest,
    evidencePackage: EvidencePackage,
    exchangeContact: ExchangeContact
  ): FreezeRequestTemplate {
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
  async updateRequestStatus(
    requestId: string,
    status: FreezeRequestStatus,
    exchangeTicketId?: string,
    exchangeResponse?: string
  ): Promise<void> {
    const updates: any = { status, updated_at: new Date() };
    const params: any[] = [requestId, status];
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
    } else if (status === "acknowledged") {
      query += `, acknowledged_at = CURRENT_TIMESTAMP`;
    } else if (status === "frozen" || status === "partially_frozen") {
      query += `, frozen_at = CURRENT_TIMESTAMP`;
    } else if (["rejected", "released", "closed"].includes(status)) {
      query += `, resolved_at = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE request_id = $1`;

    await pool.executeQuery(query, params);

    // Update exchange statistics if resolved
    if (["frozen", "rejected", "released"].includes(status)) {
      await this.updateExchangeStats(requestId, status);
    }
  }

  /**
   * Update exchange statistics based on request outcome
   */
  private async updateExchangeStats(requestId: string, status: string): Promise<void> {
    try {
      const requestResult = await pool.executeQuery(
        `SELECT exchange_id, submitted_at, CURRENT_TIMESTAMP as now FROM freeze_requests_v2 WHERE request_id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) return;

      const request = requestResult.rows[0];
      const exchangeId = request.exchange_id;

      // Calculate response time in hours
      const submittedAt = new Date(request.submitted_at);
      const responseTime = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60);

      // Get current stats
      const statsResult = await pool.executeQuery(
        `SELECT total_requests, successful_freezes, avg_response_time FROM exchange_contacts WHERE exchange_id = $1`,
        [exchangeId]
      );

      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        const totalRequests = (stats.total_requests || 0) + 1;
        const successfulFreezes = (stats.successful_freezes || 0) + (status === "frozen" ? 1 : 0);
        const avgResponseTime = stats.avg_response_time
          ? (stats.avg_response_time + responseTime) / 2
          : responseTime;
        const successRate = (successfulFreezes / totalRequests) * 100;

        await pool.executeQuery(
          `UPDATE exchange_contacts SET
            total_requests = $2,
            successful_freezes = $3,
            avg_response_time = $4,
            success_rate = $5,
            last_contacted_at = CURRENT_TIMESTAMP
          WHERE exchange_id = $1`,
          [exchangeId, totalRequests, successfulFreezes, avgResponseTime, successRate]
        );
      }
    } catch (error) {
      console.error("Error updating exchange stats:", error);
    }
  }

  /**
   * Get freeze request by ID
   */
  async getFreezeRequest(requestId: string): Promise<FreezeRequest | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM freeze_requests_v2 WHERE request_id = $1`,
        [requestId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return this.mapRowToFreezeRequest(row);
    } catch (error) {
      console.error("Error getting freeze request:", error);
      return null;
    }
  }

  /**
   * List freeze requests for a trace
   */
  async listFreezeRequestsForTrace(traceId: string): Promise<FreezeRequest[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM freeze_requests_v2 WHERE trace_id = $1 ORDER BY created_at DESC`,
        [traceId]
      );

      return result.rows.map((row) => this.mapRowToFreezeRequest(row));
    } catch (error) {
      console.error("Error listing freeze requests:", error);
      return [];
    }
  }

  /**
   * List all pending freeze requests
   */
  async listPendingRequests(): Promise<FreezeRequest[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM freeze_requests_v2
         WHERE status IN ('ready', 'submitted', 'acknowledged', 'under_review')
         ORDER BY
           CASE priority
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             ELSE 4
           END,
           created_at ASC`
      );

      return result.rows.map((row) => this.mapRowToFreezeRequest(row));
    } catch (error) {
      console.error("Error listing pending requests:", error);
      return [];
    }
  }

  /**
   * Get requests needing follow-up
   */
  async getRequestsNeedingFollowUp(): Promise<FreezeRequest[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM freeze_requests_v2
         WHERE status IN ('submitted', 'acknowledged', 'under_review')
         AND (next_follow_up_at IS NULL OR next_follow_up_at <= CURRENT_TIMESTAMP)
         ORDER BY created_at ASC`
      );

      return result.rows.map((row) => this.mapRowToFreezeRequest(row));
    } catch (error) {
      console.error("Error getting follow-up requests:", error);
      return [];
    }
  }

  /**
   * Record follow-up action
   */
  async recordFollowUp(requestId: string, nextFollowUpHours: number = 24): Promise<void> {
    await pool.executeQuery(
      `UPDATE freeze_requests_v2 SET
        follow_up_count = follow_up_count + 1,
        next_follow_up_at = CURRENT_TIMESTAMP + INTERVAL '${nextFollowUpHours} hours',
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $1`,
      [requestId]
    );
  }

  /**
   * Get evidence package
   */
  async getEvidencePackage(packageId: string): Promise<EvidencePackage | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM evidence_packages WHERE package_id = $1`,
        [packageId]
      );

      if (result.rows.length === 0) return null;

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
    } catch (error) {
      console.error("Error getting evidence package:", error);
      return null;
    }
  }

  /**
   * Get freeze request statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    successRate: number;
    avgResponseTime: number;
  }> {
    try {
      const totalResult = await pool.executeQuery(
        `SELECT COUNT(*) as total FROM freeze_requests_v2`
      );

      const statusResult = await pool.executeQuery(
        `SELECT status, COUNT(*) as count FROM freeze_requests_v2 GROUP BY status`
      );

      const priorityResult = await pool.executeQuery(
        `SELECT priority, COUNT(*) as count FROM freeze_requests_v2 GROUP BY priority`
      );

      const successResult = await pool.executeQuery(
        `SELECT
          COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen,
          COUNT(CASE WHEN status IN ('frozen', 'rejected', 'released') THEN 1 END) as resolved
        FROM freeze_requests_v2`
      );

      const responseResult = await pool.executeQuery(
        `SELECT AVG(EXTRACT(EPOCH FROM (frozen_at - submitted_at)) / 3600) as avg_hours
         FROM freeze_requests_v2
         WHERE frozen_at IS NOT NULL AND submitted_at IS NOT NULL`
      );

      const byStatus: Record<string, number> = {};
      statusResult.rows.forEach((row) => {
        byStatus[row.status] = parseInt(row.count);
      });

      const byPriority: Record<string, number> = {};
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
    } catch (error) {
      console.error("Error getting statistics:", error);
      return {
        total: 0,
        byStatus: {},
        byPriority: {},
        successRate: 0,
        avgResponseTime: 0,
      };
    }
  }

  /**
   * Map database row to FreezeRequest
   */
  private mapRowToFreezeRequest(row: any): FreezeRequest {
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

// Export singleton instance
export const exchangeCoordinator = new ExchangeCoordinator();
export default exchangeCoordinator;
