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
    getCurrentThresholds(): {
        dustAmountThreshold: number;
        transferCountThreshold: number;
        timeWindowThreshold: number;
        networkFeeMultiplier: number;
    };
}
