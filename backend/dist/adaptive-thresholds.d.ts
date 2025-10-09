/**
 * Adaptive Thresholds for Dust Detection
 * Dynamically adjusts thresholds based on network conditions and historical data
 */
import { Connection } from '@solana/web3.js';
export declare class AdaptiveThresholds {
    private historicalDustAmounts;
    private networkCongestionLevels;
    private lastUpdateTimestamp;
    private updateInterval;
    private connection;
    private currentThresholds;
    constructor(connection: Connection, initialThresholds?: Partial<typeof this.currentThresholds>);
    private loadHistoricalData;
    private getNetworkCongestion;
    /**
     * Dynamically updates thresholds based on network fees and congestion
     */
    updateThresholds(): Promise<{
        dustAmountThreshold: number;
        transferCountThreshold: number;
        timeWindowThreshold: number;
    }>;
    /**
     * Get enhanced network metrics including TPS, congestion, and fee trends
     */
    private getEnhancedNetworkMetrics;
    /**
     * Analyze historical dust detection patterns
     */
    private analyzeHistoricalPatterns;
    /**
     * Calculate false positive rate from recent detections
     */
    private calculateFalsePositiveRate;
    /**
     * Calculate base dust threshold from network fees
     */
    private calculateBaseDustThreshold;
    /**
     * Calculate adjustment factors based on various metrics
     */
    private calculateAdjustmentFactors;
    /**
     * Calculate new dust threshold with enhanced logic
     */
    private calculateNewDustThreshold;
    /**
     * Calculate new transfer count threshold
     */
    private calculateNewTransferThreshold;
    /**
     * Calculate new time window threshold
     */
    private calculateNewTimeWindowThreshold;
    /**
     * Validate thresholds are within reasonable bounds
     */
    private validateThresholds;
    /**
     * Log threshold changes for monitoring
     */
    private logThresholdChanges;
    getCurrentThresholds(): {
        dustAmountThreshold: number;
        transferCountThreshold: number;
        timeWindowThreshold: number;
        networkFeeMultiplier: number;
    };
}
