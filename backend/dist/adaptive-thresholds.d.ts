/**
 * Adaptive Thresholds for Dust Detection
 * This module provides dynamic threshold adjustment based on network conditions
 */
import { Connection } from '@solana/web3.js';
export declare class AdaptiveThresholds {
    private historicalDustAmounts;
    private networkCongestionLevels;
    private lastUpdateTimestamp;
    private updateInterval;
    private connection;
    private currentThresholds;
    constructor(connection: Connection, initialThresholds?: {
        dustAmountThreshold?: number;
        transferCountThreshold?: number;
        timeWindowThreshold?: number;
        networkFeeMultiplier?: number;
    });
    private loadHistoricalData;
    private calculateNetworkCongestion;
    private getNetworkCongestion;
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
