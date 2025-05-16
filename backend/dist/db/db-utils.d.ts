import { Pool, QueryResult } from 'pg';
export interface DustTransaction {
    signature: string;
    timestamp: Date;
    slot: number;
    success: boolean;
    sender: string | null;
    recipient: string | null;
    amount: number;
    fee: number;
    tokenType: string;
    tokenAddress?: string;
    isPotentialDust: boolean;
    isPotentialPoisoning: boolean;
    riskScore?: number;
    isScamUrl?: boolean;
    memoContent?: string;
}
export interface TimePattern {
    hourlyDistribution: number[];
    weekdayDistribution: number[];
    burstDetection: {
        burstThreshold: number;
        burstWindows: Array<{
            start: number;
            end: number;
        }>;
    };
}
export interface BehavioralIndicators {
    usesNewAccounts: boolean;
    hasAbnormalFundingPattern: boolean;
    targetsPremiumWallets: boolean;
    usesScriptedTransactions: boolean;
}
export interface MLFeatures {
    transactionFrequency: number;
    averageAmount: number;
    recipientCount: number;
    timePatternFeatures: number[];
    networkFeatures: number[];
}
export interface MLPrediction {
    attackerScore: number;
    victimScore: number;
    confidence: number;
}
export interface VulnerabilityAssessment {
    walletActivity: 'high' | 'medium' | 'low';
    assetValue: 'high' | 'medium' | 'low';
    previousInteractions: boolean;
    riskExposure: number;
}
export interface DustingAttacker {
    address: string;
    smallTransfersCount: number;
    uniqueVictimsCount: number;
    uniqueVictims: string[];
    timestamps: number[];
    riskScore: number;
    walletAgeDays?: number;
    totalTransactionVolume?: number;
    knownLabels?: string[];
    relatedAddresses?: string[];
    previousAttackPatterns?: {
        timestamp: number;
        victimCount: number;
        pattern: string;
    }[];
    timePatterns?: TimePattern;
    temporalPattern: {
        burstCount: number;
        averageTimeBetweenTransfers: number;
        regularityScore: number;
    };
    networkPattern: {
        clusterSize: number;
        centralityScore: number;
        recipientOverlap: number;
        betweennessCentrality?: number;
    };
    behavioralIndicators?: BehavioralIndicators;
    mlFeatures?: MLFeatures;
    mlPrediction?: MLPrediction;
    lastUpdated?: Date;
}
export interface DustingVictim {
    address: string;
    dustTransactionsCount: number;
    uniqueAttackersCount: number;
    uniqueAttackers: string[];
    timestamps: number[];
    riskScore: number;
    walletAgeDays?: number;
    walletValueEstimate?: number;
    timePatterns?: TimePattern;
    vulnerabilityAssessment?: VulnerabilityAssessment;
    mlFeatures?: MLFeatures;
    mlPrediction?: MLPrediction;
    lastUpdated?: Date;
}
export interface RiskAnalysis {
    address: string;
    riskScore: number;
    chainAnalysisData?: any;
    trmLabsData?: any;
    temporalPattern: {
        burstCount: number;
        averageTimeBetweenTransfers: number;
        regularityScore: number;
    };
    networkPattern: {
        clusterSize: number;
        centralityScore: number;
        recipientOverlap: number;
    };
}
export declare class DatabaseUtils {
    pool: Pool;
    constructor();
    initializeDatabase(): Promise<void>;
    insertDustTransaction(transaction: DustTransaction, maxRetries?: number): Promise<QueryResult>;
    updateRiskAnalysis(analysis: RiskAnalysis): Promise<QueryResult>;
    getHighRiskAddresses(minRiskScore?: number): Promise<QueryResult>;
    getAddressTransactions(address: string): Promise<QueryResult>;
    close(): Promise<void>;
    /**
     * Find transaction by signature and timestamp
     */
    findTransactionBySignature(signature: string, timestamp?: Date | null): Promise<any>;
    /**
     * Update existing transaction
     */
    updateTransaction(signature: string, updateFields: Partial<DustTransaction>): Promise<boolean>;
    insertOrUpdateDustingAttacker(attacker: DustingAttacker): Promise<QueryResult>;
    insertOrUpdateDustingVictim(victim: DustingVictim): Promise<QueryResult>;
    getDustingAttackers(minRiskScore?: number): Promise<QueryResult>;
    getDustingVictims(minRiskScore?: number): Promise<QueryResult>;
}
declare const _default: DatabaseUtils;
export default _default;
