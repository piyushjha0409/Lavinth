import { QueryResult } from 'pg';
import { CustomPool } from './config';
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
    previousAttackPatterns?: any;
    timePatterns?: any;
    temporalPattern: any;
    networkPattern: any;
    behavioralIndicators?: any;
    mlFeatures?: any;
    mlPrediction?: any;
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
    timePatterns?: any;
    vulnerabilityAssessment?: any;
    mlFeatures?: any;
    mlPrediction?: any;
    lastUpdated?: Date;
}
export interface RiskAnalysis {
    address: string;
    riskScore: number;
    chainAnalysisData?: any;
    trmLabsData?: any;
    temporalPattern: any;
    networkPattern: any;
}
export declare class DatabaseUtils {
    pool: CustomPool;
    constructor();
    initializeDatabase(): Promise<void>;
    insertDustTransaction(tx: DustTransaction): Promise<QueryResult>;
    insertOrUpdateDustingAttacker(attacker: DustingAttacker): Promise<QueryResult>;
    insertOrUpdateDustingVictim(victim: DustingVictim): Promise<QueryResult>;
    updateRiskAnalysis(analysis: RiskAnalysis): Promise<QueryResult>;
    getAddressTransactions(address: string): Promise<QueryResult>;
    getHighRiskAddresses(minRiskScore?: number): Promise<QueryResult>;
    getDustingAttackers(minRiskScore?: number): Promise<QueryResult>;
    getDustingVictims(minRiskScore?: number): Promise<QueryResult>;
    close(): Promise<void>;
    getOverviewStatistics(): Promise<any>;
}
declare const _default: DatabaseUtils;
export default _default;
