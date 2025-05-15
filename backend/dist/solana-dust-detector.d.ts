import { ConfirmedSignatureInfo, ParsedTransactionWithMeta } from "@solana/web3.js";
interface TransactionData {
    signature: string;
    timestamp: number;
    slot: number;
    success: boolean;
    sender: string | null;
    recipient: string | null;
    amount: number;
    fee: number;
    tokenType: string;
    tokenAddress?: string;
    tokenMetadata?: TokenMetadata;
    hasMemo: boolean;
    memoContent?: string;
    isPotentialDust: boolean;
    isPotentialPoisoning: boolean;
    riskScore?: number;
    isScamUrl?: boolean;
}
interface TokenMetadata {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    dustThreshold?: number;
}
interface TimePattern {
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
interface BehavioralIndicators {
    usesNewAccounts: boolean;
    hasAbnormalFundingPattern: boolean;
    targetsPremiumWallets: boolean;
    usesScriptedTransactions: boolean;
}
interface MLFeatures {
    transactionFrequency: number;
    averageAmount: number;
    recipientCount: number;
    timePatternFeatures: number[];
    networkFeatures: number[];
}
interface MLPrediction {
    attackerScore: number;
    victimScore: number;
    confidence: number;
}
interface VulnerabilityAssessment {
    walletActivity: 'high' | 'medium' | 'low';
    assetValue: 'high' | 'medium' | 'low';
    previousInteractions: boolean;
    riskExposure: number;
}
interface DustingAttacker {
    address: string;
    smallTransfersCount: number;
    uniqueVictims: Set<string>;
    timestamps: number[];
    riskScore: number;
    walletAge?: number;
    totalTransactionVolume?: number;
    knownLabels?: string[];
    relatedAddresses?: string[];
    previousAttackPatterns?: {
        timestamp: number;
        victimCount: number;
        pattern: string;
    }[];
    timePatterns?: TimePattern;
    patterns: {
        temporal: TemporalPattern;
        network: NetworkPattern;
    };
    behavioralIndicators?: BehavioralIndicators;
    mlFeatures?: MLFeatures;
    mlPrediction?: MLPrediction;
}
interface DustingVictim {
    address: string;
    dustTransactionsCount: number;
    uniqueAttackers: Set<string>;
    timestamps: number[];
    riskScore: number;
    walletAge?: number;
    walletValueEstimate?: number;
    timePatterns?: TimePattern;
    vulnerabilityAssessment?: VulnerabilityAssessment;
    mlFeatures?: MLFeatures;
    mlPrediction?: MLPrediction;
}
interface TemporalPattern {
    burstCount: number;
    averageTimeBetweenTransfers: number;
    regularityScore: number;
}
interface NetworkPattern {
    clusterSize: number;
    centralityScore: number;
    recipientOverlap: number;
}
/**
 * Process transaction data to extract relevant information
 */
declare function processTransaction(tx: ParsedTransactionWithMeta, sigInfo: ConfirmedSignatureInfo): Promise<TransactionData | null>;
/**
 * Analyze transaction patterns to identify potential dusting or poisoning campaigns
 */
declare function analyzeTransactions(transactions: TransactionData[]): {
    potentialAttackers: DustingAttacker[];
    potentialVictims: DustingVictim[];
    addressSimilarities: Record<string, string[]>;
    dustTransactionCount: number;
    totalTransactions: number;
    dustingTimestampPatterns: Record<string, number[]>;
    suspiciousPatterns: Record<string, {
        burstCount: number;
        averageTimeBetweenTransfers: number;
    }>;
};
export { analyzeTransactions, processTransaction };
