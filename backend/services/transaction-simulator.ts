/**
 * Transaction Simulator Service
 * Simulates Solana transactions to detect hidden malicious effects before signing
 */

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  SimulatedTransactionResponse,
  TransactionInstruction,
} from '@solana/web3.js';
import { Pool } from 'pg';

// Known program IDs
const KNOWN_PROGRAMS = {
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN_2022_PROGRAM: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  MEMO_PROGRAM: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  COMPUTE_BUDGET: 'ComputeBudget111111111111111111111111111111',
  METAPLEX_TOKEN_METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
};

// Known malicious patterns
const MALICIOUS_PATTERNS = {
  UNLIMITED_APPROVAL: 'unlimited_token_approval',
  UNKNOWN_PROGRAM: 'unknown_program_interaction',
  SUSPICIOUS_TRANSFER: 'suspicious_transfer_pattern',
  DRAINER_SIGNATURE: 'known_drainer_signature',
  HIDDEN_APPROVAL: 'hidden_approval_in_batch',
  AUTHORITY_CHANGE: 'token_authority_change',
  CLOSE_ACCOUNT: 'close_account_to_unknown',
};

// Risk levels
type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

// Simulation result types
export interface SimulationResult {
  simulationId: string;
  success: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  warnings: SimulationWarning[];
  effects: TransactionEffect[];
  balanceChanges: BalanceChange[];
  approvalChanges: ApprovalChange[];
  programsInvoked: ProgramInfo[];
  estimatedFee: number;
  computeUnits: number;
  simulatedAt: string;
  rawLogs?: string[];
}

export interface SimulationWarning {
  type: string;
  severity: RiskLevel;
  message: string;
  details?: Record<string, any>;
}

export interface TransactionEffect {
  type: 'transfer' | 'approval' | 'authority_change' | 'account_create' | 'account_close' | 'program_call';
  description: string;
  riskLevel: RiskLevel;
  data: Record<string, any>;
}

export interface BalanceChange {
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  beforeBalance: number;
  afterBalance: number;
  change: number;
  isNative: boolean;
}

export interface ApprovalChange {
  tokenAddress: string;
  tokenSymbol?: string;
  spenderAddress: string;
  spenderLabel?: string;
  previousAmount: number | null;
  newAmount: number | 'unlimited';
  isNewApproval: boolean;
  isRevocation: boolean;
  riskLevel: RiskLevel;
}

export interface ProgramInfo {
  programId: string;
  programName?: string;
  isKnown: boolean;
  isVerified: boolean;
  riskLevel: RiskLevel;
  instructionCount: number;
}

export class TransactionSimulator {
  private connection: Connection;
  private pool: Pool;
  private maliciousAddresses: Set<string> = new Set();
  private verifiedPrograms: Map<string, string> = new Map();

  constructor(connection: Connection, pool: Pool) {
    this.connection = connection;
    this.pool = pool;
    this.initializeKnownData();
  }

  private async initializeKnownData(): Promise<void> {
    // Load malicious addresses from database
    try {
      const result = await this.pool.query(
        'SELECT address FROM malicious_delegates WHERE is_confirmed = true'
      );
      result.rows.forEach(row => this.maliciousAddresses.add(row.address));
    } catch (error) {
      console.error('Failed to load malicious addresses:', error);
    }

    // Initialize verified programs
    Object.entries(KNOWN_PROGRAMS).forEach(([name, id]) => {
      this.verifiedPrograms.set(id, name);
    });
  }

  /**
   * Simulate a transaction and analyze its effects
   */
  async simulateTransaction(
    serializedTransaction: string,
    walletAddress: string
  ): Promise<SimulationResult> {
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const warnings: SimulationWarning[] = [];
    const effects: TransactionEffect[] = [];
    const balanceChanges: BalanceChange[] = [];
    const approvalChanges: ApprovalChange[] = [];
    const programsInvoked: ProgramInfo[] = [];

    try {
      // Decode the transaction
      const txBuffer = Buffer.from(serializedTransaction, 'base64');
      let transaction: Transaction | VersionedTransaction;
      let instructions: TransactionInstruction[] = [];

      try {
        // Try to decode as versioned transaction first
        transaction = VersionedTransaction.deserialize(txBuffer);
        const message = transaction.message;

        // Extract instructions from versioned transaction
        const accountKeys = message.staticAccountKeys;
        instructions = message.compiledInstructions.map(ix => ({
          programId: accountKeys[ix.programIdIndex],
          keys: ix.accountKeyIndexes.map(idx => ({
            pubkey: accountKeys[idx],
            isSigner: message.isAccountSigner(idx),
            isWritable: message.isAccountWritable(idx),
          })),
          data: Buffer.from(ix.data),
        }));
      } catch {
        // Fall back to legacy transaction
        transaction = Transaction.from(txBuffer);
        instructions = transaction.instructions;
      }

      // Analyze each instruction
      for (const instruction of instructions) {
        const programId = instruction.programId.toBase58();
        const programInfo = await this.analyzeProgramCall(programId, instruction);
        programsInvoked.push(programInfo);

        // Check for specific instruction types
        if (programId === KNOWN_PROGRAMS.TOKEN_PROGRAM || programId === KNOWN_PROGRAMS.TOKEN_2022_PROGRAM) {
          await this.analyzeTokenInstruction(instruction, warnings, effects, approvalChanges, walletAddress);
        } else if (programId === KNOWN_PROGRAMS.SYSTEM_PROGRAM) {
          await this.analyzeSystemInstruction(instruction, warnings, effects, walletAddress);
        } else if (!this.verifiedPrograms.has(programId)) {
          // Unknown program - add warning
          warnings.push({
            type: MALICIOUS_PATTERNS.UNKNOWN_PROGRAM,
            severity: 'medium',
            message: `Transaction interacts with unverified program: ${programId.slice(0, 8)}...`,
            details: { programId },
          });
        }
      }

      // Simulate on chain
      const simulationResponse = await this.simulateOnChain(serializedTransaction);

      if (simulationResponse) {
        // Extract balance changes from simulation
        await this.extractBalanceChanges(simulationResponse, walletAddress, balanceChanges);

        // Check logs for suspicious patterns
        if (simulationResponse.logs) {
          this.analyzeLogs(simulationResponse.logs, warnings);
        }
      }

      // Check for hidden approvals in batch transactions
      if (approvalChanges.length > 0 && instructions.length > 1) {
        const hasNonApprovalInstructions = instructions.some(ix => {
          const pid = ix.programId.toBase58();
          return pid !== KNOWN_PROGRAMS.TOKEN_PROGRAM && pid !== KNOWN_PROGRAMS.TOKEN_2022_PROGRAM;
        });

        if (hasNonApprovalInstructions) {
          warnings.push({
            type: MALICIOUS_PATTERNS.HIDDEN_APPROVAL,
            severity: 'high',
            message: 'Token approval hidden within batch transaction',
            details: { approvalCount: approvalChanges.length },
          });
        }
      }

      // Calculate risk score
      const { riskLevel, riskScore } = this.calculateRiskScore(warnings, programsInvoked, approvalChanges);

      // Store simulation result
      await this.storeSimulationResult(simulationId, walletAddress, {
        success: true,
        riskLevel,
        riskScore,
        warnings,
        effects,
        balanceChanges,
        approvalChanges,
        programsInvoked,
      });

      return {
        simulationId,
        success: true,
        riskLevel,
        riskScore,
        warnings,
        effects,
        balanceChanges,
        approvalChanges,
        programsInvoked,
        estimatedFee: 5000, // Base fee in lamports
        computeUnits: simulationResponse?.unitsConsumed || 200000,
        simulatedAt: new Date().toISOString(),
        rawLogs: simulationResponse?.logs,
      };
    } catch (error: any) {
      console.error('Simulation failed:', error);

      warnings.push({
        type: 'simulation_error',
        severity: 'high',
        message: `Transaction simulation failed: ${error.message}`,
      });

      return {
        simulationId,
        success: false,
        riskLevel: 'high',
        riskScore: 75,
        warnings,
        effects,
        balanceChanges,
        approvalChanges,
        programsInvoked,
        estimatedFee: 0,
        computeUnits: 0,
        simulatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Analyze a program call
   */
  private async analyzeProgramCall(
    programId: string,
    instruction: TransactionInstruction
  ): Promise<ProgramInfo> {
    const isKnown = this.verifiedPrograms.has(programId);
    const programName = this.verifiedPrograms.get(programId);

    // Check if program is in malicious list
    const isMalicious = this.maliciousAddresses.has(programId);

    let riskLevel: RiskLevel = 'safe';
    if (isMalicious) {
      riskLevel = 'critical';
    } else if (!isKnown) {
      riskLevel = 'medium';
    }

    return {
      programId,
      programName,
      isKnown,
      isVerified: isKnown && !isMalicious,
      riskLevel,
      instructionCount: 1,
    };
  }

  /**
   * Analyze SPL Token instructions
   */
  private async analyzeTokenInstruction(
    instruction: TransactionInstruction,
    warnings: SimulationWarning[],
    effects: TransactionEffect[],
    approvalChanges: ApprovalChange[],
    walletAddress: string
  ): Promise<void> {
    const data = instruction.data;
    if (data.length === 0) return;

    const instructionType = data[0];

    // Token instruction types (from spl-token)
    // 0: InitializeMint, 1: InitializeAccount, 2: InitializeMultisig
    // 3: Transfer, 4: Approve, 5: Revoke, 6: SetAuthority
    // 7: MintTo, 8: Burn, 9: CloseAccount, etc.

    switch (instructionType) {
      case 3: // Transfer
        await this.analyzeTransfer(instruction, warnings, effects, walletAddress);
        break;

      case 4: // Approve
        await this.analyzeApproval(instruction, warnings, effects, approvalChanges, walletAddress);
        break;

      case 5: // Revoke
        effects.push({
          type: 'approval',
          description: 'Revoking token approval',
          riskLevel: 'safe',
          data: { action: 'revoke' },
        });
        break;

      case 6: // SetAuthority
        await this.analyzeAuthorityChange(instruction, warnings, effects, walletAddress);
        break;

      case 9: // CloseAccount
        await this.analyzeAccountClose(instruction, warnings, effects, walletAddress);
        break;
    }
  }

  /**
   * Analyze token transfer
   */
  private async analyzeTransfer(
    instruction: TransactionInstruction,
    warnings: SimulationWarning[],
    effects: TransactionEffect[],
    walletAddress: string
  ): Promise<void> {
    const keys = instruction.keys;
    if (keys.length < 3) return;

    const source = keys[0].pubkey.toBase58();
    const destination = keys[1].pubkey.toBase58();

    // Check if destination is malicious
    if (this.maliciousAddresses.has(destination)) {
      warnings.push({
        type: MALICIOUS_PATTERNS.SUSPICIOUS_TRANSFER,
        severity: 'critical',
        message: 'Transfer to known malicious address detected',
        details: { destination },
      });
    }

    effects.push({
      type: 'transfer',
      description: `Token transfer from ${source.slice(0, 8)}... to ${destination.slice(0, 8)}...`,
      riskLevel: this.maliciousAddresses.has(destination) ? 'critical' : 'safe',
      data: { source, destination },
    });
  }

  /**
   * Analyze token approval
   */
  private async analyzeApproval(
    instruction: TransactionInstruction,
    warnings: SimulationWarning[],
    effects: TransactionEffect[],
    approvalChanges: ApprovalChange[],
    walletAddress: string
  ): Promise<void> {
    const keys = instruction.keys;
    if (keys.length < 3) return;

    const tokenAccount = keys[0].pubkey.toBase58();
    const delegate = keys[1].pubkey.toBase58();
    const data = instruction.data;

    // Parse approval amount (u64 at offset 1)
    let amount: number | 'unlimited' = 0;
    if (data.length >= 9) {
      const amountBuffer = data.slice(1, 9);
      const amountBigInt = amountBuffer.readBigUInt64LE(0);
      // Check for max u64 (unlimited)
      if (amountBigInt === BigInt('18446744073709551615')) {
        amount = 'unlimited';
      } else {
        amount = Number(amountBigInt);
      }
    }

    // Check if delegate is malicious
    const isMalicious = this.maliciousAddresses.has(delegate);
    let riskLevel: RiskLevel = 'low';

    if (isMalicious) {
      riskLevel = 'critical';
      warnings.push({
        type: MALICIOUS_PATTERNS.DRAINER_SIGNATURE,
        severity: 'critical',
        message: 'Approval to known drainer address detected!',
        details: { delegate },
      });
    } else if (amount === 'unlimited') {
      riskLevel = 'high';
      warnings.push({
        type: MALICIOUS_PATTERNS.UNLIMITED_APPROVAL,
        severity: 'high',
        message: 'Unlimited token approval detected - allows spender to transfer all tokens',
        details: { delegate },
      });
    }

    effects.push({
      type: 'approval',
      description: `Token approval to ${delegate.slice(0, 8)}... for ${amount === 'unlimited' ? 'unlimited' : amount} tokens`,
      riskLevel,
      data: { delegate, amount },
    });

    approvalChanges.push({
      tokenAddress: tokenAccount,
      spenderAddress: delegate,
      previousAmount: null,
      newAmount: amount,
      isNewApproval: true,
      isRevocation: false,
      riskLevel,
    });
  }

  /**
   * Analyze authority change
   */
  private async analyzeAuthorityChange(
    instruction: TransactionInstruction,
    warnings: SimulationWarning[],
    effects: TransactionEffect[],
    walletAddress: string
  ): Promise<void> {
    const keys = instruction.keys;
    if (keys.length < 2) return;

    const account = keys[0].pubkey.toBase58();
    const newAuthority = keys.length > 2 ? keys[2]?.pubkey.toBase58() : null;

    warnings.push({
      type: MALICIOUS_PATTERNS.AUTHORITY_CHANGE,
      severity: 'high',
      message: 'Token account authority is being changed',
      details: { account, newAuthority },
    });

    effects.push({
      type: 'authority_change',
      description: `Changing authority of ${account.slice(0, 8)}...`,
      riskLevel: 'high',
      data: { account, newAuthority },
    });
  }

  /**
   * Analyze account close
   */
  private async analyzeAccountClose(
    instruction: TransactionInstruction,
    warnings: SimulationWarning[],
    effects: TransactionEffect[],
    walletAddress: string
  ): Promise<void> {
    const keys = instruction.keys;
    if (keys.length < 3) return;

    const account = keys[0].pubkey.toBase58();
    const destination = keys[1].pubkey.toBase58();

    // Check if rent is being sent to wallet owner
    if (destination !== walletAddress) {
      warnings.push({
        type: MALICIOUS_PATTERNS.CLOSE_ACCOUNT,
        severity: 'medium',
        message: 'Account being closed with rent sent to different address',
        details: { account, destination },
      });
    }

    effects.push({
      type: 'account_close',
      description: `Closing account ${account.slice(0, 8)}..., rent to ${destination.slice(0, 8)}...`,
      riskLevel: destination !== walletAddress ? 'medium' : 'safe',
      data: { account, destination },
    });
  }

  /**
   * Analyze system program instructions
   */
  private async analyzeSystemInstruction(
    instruction: TransactionInstruction,
    warnings: SimulationWarning[],
    effects: TransactionEffect[],
    walletAddress: string
  ): Promise<void> {
    const data = instruction.data;
    if (data.length < 4) return;

    const instructionType = data.readUInt32LE(0);

    // System instruction types
    // 0: CreateAccount, 1: Assign, 2: Transfer, 3: CreateAccountWithSeed
    // 4: AdvanceNonceAccount, 5: WithdrawNonceAccount, etc.

    if (instructionType === 2) {
      // Transfer SOL
      const keys = instruction.keys;
      if (keys.length >= 2) {
        const destination = keys[1].pubkey.toBase58();

        if (this.maliciousAddresses.has(destination)) {
          warnings.push({
            type: MALICIOUS_PATTERNS.SUSPICIOUS_TRANSFER,
            severity: 'critical',
            message: 'SOL transfer to known malicious address',
            details: { destination },
          });
        }

        effects.push({
          type: 'transfer',
          description: `SOL transfer to ${destination.slice(0, 8)}...`,
          riskLevel: this.maliciousAddresses.has(destination) ? 'critical' : 'safe',
          data: { destination, isNative: true },
        });
      }
    }
  }

  /**
   * Simulate transaction on chain
   */
  private async simulateOnChain(
    serializedTransaction: string
  ): Promise<SimulatedTransactionResponse | null> {
    try {
      const txBuffer = Buffer.from(serializedTransaction, 'base64');

      let transaction: Transaction | VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(txBuffer);
      } catch {
        transaction = Transaction.from(txBuffer);
      }

      const result = await this.connection.simulateTransaction(
        transaction as VersionedTransaction,
        {
          sigVerify: false,
          replaceRecentBlockhash: true,
        }
      );

      return result.value;
    } catch (error) {
      console.error('On-chain simulation failed:', error);
      return null;
    }
  }

  /**
   * Extract balance changes from simulation response
   */
  private async extractBalanceChanges(
    simulation: SimulatedTransactionResponse,
    walletAddress: string,
    balanceChanges: BalanceChange[]
  ): Promise<void> {
    // Note: Full balance change extraction would require pre/post account data
    // This is a simplified version that extracts from logs
    if (simulation.logs) {
      for (const log of simulation.logs) {
        // Look for transfer-related logs
        if (log.includes('Transfer')) {
          // Parse transfer amount from log if possible
          const match = log.match(/Transfer (\d+)/);
          if (match) {
            balanceChanges.push({
              tokenAddress: 'unknown',
              beforeBalance: 0,
              afterBalance: 0,
              change: -parseInt(match[1]),
              isNative: log.includes('lamports'),
            });
          }
        }
      }
    }
  }

  /**
   * Analyze transaction logs for suspicious patterns
   */
  private analyzeLogs(logs: string[], warnings: SimulationWarning[]): void {
    for (const log of logs) {
      // Check for common error patterns that might indicate issues
      if (log.includes('insufficient funds')) {
        warnings.push({
          type: 'insufficient_funds',
          severity: 'medium',
          message: 'Transaction may fail due to insufficient funds',
        });
      }

      if (log.includes('Error') || log.includes('failed')) {
        warnings.push({
          type: 'potential_failure',
          severity: 'medium',
          message: `Potential issue detected: ${log.slice(0, 100)}`,
        });
      }
    }
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    warnings: SimulationWarning[],
    programs: ProgramInfo[],
    approvals: ApprovalChange[]
  ): { riskLevel: RiskLevel; riskScore: number } {
    let score = 0;

    // Score based on warnings
    for (const warning of warnings) {
      switch (warning.severity) {
        case 'critical':
          score += 40;
          break;
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 5;
          break;
      }
    }

    // Score based on unverified programs
    for (const program of programs) {
      if (!program.isVerified) {
        score += 15;
      }
      if (program.riskLevel === 'critical') {
        score += 50;
      }
    }

    // Score based on approvals
    for (const approval of approvals) {
      if (approval.newAmount === 'unlimited') {
        score += 20;
      }
      if (approval.riskLevel === 'critical') {
        score += 40;
      }
    }

    // Cap at 100
    score = Math.min(score, 100);

    // Determine risk level
    let riskLevel: RiskLevel;
    if (score >= 80) {
      riskLevel = 'critical';
    } else if (score >= 50) {
      riskLevel = 'high';
    } else if (score >= 25) {
      riskLevel = 'medium';
    } else if (score > 0) {
      riskLevel = 'low';
    } else {
      riskLevel = 'safe';
    }

    return { riskLevel, riskScore: score };
  }

  /**
   * Store simulation result in database
   */
  private async storeSimulationResult(
    simulationId: string,
    walletAddress: string,
    result: Partial<SimulationResult>
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO transaction_simulations
         (simulation_id, wallet_address, success, risk_level, risk_score, warnings, effects, simulated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          simulationId,
          walletAddress,
          result.success,
          result.riskLevel,
          result.riskScore,
          JSON.stringify(result.warnings),
          JSON.stringify(result.effects),
        ]
      );
    } catch (error) {
      console.error('Failed to store simulation result:', error);
    }
  }

  /**
   * Get simulation history for a wallet
   */
  async getSimulationHistory(
    walletAddress: string,
    limit: number = 20
  ): Promise<SimulationResult[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM transaction_simulations
         WHERE wallet_address = $1
         ORDER BY simulated_at DESC
         LIMIT $2`,
        [walletAddress, limit]
      );

      return result.rows.map(row => ({
        simulationId: row.simulation_id,
        success: row.success,
        riskLevel: row.risk_level,
        riskScore: row.risk_score,
        warnings: row.warnings || [],
        effects: row.effects || [],
        balanceChanges: [],
        approvalChanges: [],
        programsInvoked: [],
        estimatedFee: 0,
        computeUnits: 0,
        simulatedAt: row.simulated_at,
      }));
    } catch (error) {
      console.error('Failed to get simulation history:', error);
      return [];
    }
  }

  /**
   * Quick risk check for a transaction without full simulation
   */
  async quickRiskCheck(
    serializedTransaction: string
  ): Promise<{ riskLevel: RiskLevel; warnings: string[] }> {
    const warnings: string[] = [];
    let highestRisk: RiskLevel = 'safe';

    try {
      const txBuffer = Buffer.from(serializedTransaction, 'base64');
      let instructions: TransactionInstruction[] = [];

      try {
        const transaction = VersionedTransaction.deserialize(txBuffer);
        const message = transaction.message;
        const accountKeys = message.staticAccountKeys;

        instructions = message.compiledInstructions.map(ix => ({
          programId: accountKeys[ix.programIdIndex],
          keys: ix.accountKeyIndexes.map(idx => ({
            pubkey: accountKeys[idx],
            isSigner: message.isAccountSigner(idx),
            isWritable: message.isAccountWritable(idx),
          })),
          data: Buffer.from(ix.data),
        }));
      } catch {
        const transaction = Transaction.from(txBuffer);
        instructions = transaction.instructions;
      }

      for (const ix of instructions) {
        const programId = ix.programId.toBase58();

        // Check for malicious program
        if (this.maliciousAddresses.has(programId)) {
          warnings.push('Interacts with known malicious program');
          highestRisk = 'critical';
        }

        // Check for unknown program
        if (!this.verifiedPrograms.has(programId)) {
          warnings.push('Interacts with unverified program');
          if (highestRisk === 'safe' || highestRisk === 'low') {
            highestRisk = 'medium';
          }
        }

        // Check for approval instruction in token program
        if (
          (programId === KNOWN_PROGRAMS.TOKEN_PROGRAM || programId === KNOWN_PROGRAMS.TOKEN_2022_PROGRAM) &&
          ix.data.length > 0 &&
          ix.data[0] === 4
        ) {
          warnings.push('Contains token approval');
          if (highestRisk !== 'critical') {
            highestRisk = 'high';
          }
        }
      }

      return { riskLevel: highestRisk, warnings };
    } catch (error) {
      return { riskLevel: 'high', warnings: ['Failed to parse transaction'] };
    }
  }
}

// Export singleton creator
export function createTransactionSimulator(connection: Connection, pool: Pool): TransactionSimulator {
  return new TransactionSimulator(connection, pool);
}
