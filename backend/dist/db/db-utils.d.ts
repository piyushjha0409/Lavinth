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
}
export interface DustingCandidate {
    address: string;
    smallTransfersCount: number;
    uniqueRecipientsCount: number;
    uniqueRecipients: string[];
    timestamps: number[];
    riskScore: number;
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
    insertDustTransaction(transaction: DustTransaction): Promise<QueryResult>;
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
    insertOrUpdateDustingCandidate(candidate: DustingCandidate): Promise<QueryResult>;
    getDustingCandidates(minRiskScore?: number): Promise<QueryResult>;
}
declare const _default: DatabaseUtils;
export default _default;
