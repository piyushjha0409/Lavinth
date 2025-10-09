/**
 * Adaptive Thresholds for Dust Detection
 * Dynamically adjusts thresholds based on network conditions and historical data
 */

import * as web3 from '@solana/web3.js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import db from './db/db-utils';

export class AdaptiveThresholds {
  private historicalDustAmounts: number[] = [];
  private networkCongestionLevels: number[] = [];
  private lastUpdateTimestamp: number = 0;
  private updateInterval: number = 3600000; // 1 hour
  private connection: Connection;

  private currentThresholds = {
    dustAmountThreshold: 0.001, // in SOL
    transferCountThreshold: 3,
    timeWindowThreshold: 86400000, // 24 hours in ms
    networkFeeMultiplier: 10,
  };

  constructor(
    connection: Connection,
    initialThresholds?: Partial<typeof this.currentThresholds>
  ) {
    this.connection = connection;
    if (initialThresholds) {
      this.currentThresholds = { ...this.currentThresholds, ...initialThresholds };
    }

    this.loadHistoricalData();
  }

  private async loadHistoricalData(): Promise<void> {
    try {
      const result = await db.pool.query(
        `SELECT amount FROM dust_transactions 
         WHERE is_potential_dust = true 
         ORDER BY timestamp DESC 
         LIMIT 1000`
      );

      this.historicalDustAmounts = result.rows.map(
        (row: { amount: string | number }) => parseFloat(String(row.amount))
      );

      console.log(`Loaded ${this.historicalDustAmounts.length} historical dust amounts`);
    } catch (error) {
      console.error('Failed to load historical dust data:', error);
    }
  }

  private async getNetworkCongestion(): Promise<number> {
    try {
      const perfSamples = await this.connection.getRecentPerformanceSamples(10);

      if (!perfSamples.length) return 1.0;

      const avgTps =
        perfSamples.reduce((sum, s) => sum + s.numTransactions / s.samplePeriodSecs, 0) /
        perfSamples.length;

      const normalizedCongestion = Math.min(1.0, avgTps / 20000); // Normalize to ~1 at 20k TPS

      this.networkCongestionLevels.push(normalizedCongestion);
      if (this.networkCongestionLevels.length > 24) {
        this.networkCongestionLevels.shift();
      }

      return normalizedCongestion;
    } catch (error) {
      console.error('Failed to fetch network congestion:', error);
      return 1.0;
    }
  }

  /**
   * Dynamically updates thresholds based on network fees and congestion
   */
  async updateThresholds(): Promise<{
    dustAmountThreshold: number;
    transferCountThreshold: number;
    timeWindowThreshold: number;
  }> {
    const now = Date.now();
    if (now - this.lastUpdateTimestamp < this.updateInterval) {
      return this.getCurrentThresholds();
    }

    this.lastUpdateTimestamp = now;

    try {
      // Enhanced threshold calculation with multiple factors
      const networkMetrics = await this.getEnhancedNetworkMetrics();
      const historicalAnalysis = await this.analyzeHistoricalPatterns();
      const falsePositiveRate = await this.calculateFalsePositiveRate();
      
      // Calculate base dust threshold from network fees
      const baseDustThreshold = await this.calculateBaseDustThreshold();
      
      // Apply multiple adjustment factors
      const adjustments = this.calculateAdjustmentFactors(
        networkMetrics, 
        historicalAnalysis, 
        falsePositiveRate
      );
      
      // Update thresholds with enhanced logic
      const newDustAmountThreshold = this.calculateNewDustThreshold(
        baseDustThreshold, 
        adjustments
      );
      
      const newTransferCountThreshold = this.calculateNewTransferThreshold(
        networkMetrics, 
        adjustments
      );
      
      const newTimeWindowThreshold = this.calculateNewTimeWindowThreshold(
        networkMetrics, 
        adjustments
      );

      // Validate thresholds are within reasonable bounds
      const validatedThresholds = this.validateThresholds({
        dustAmountThreshold: newDustAmountThreshold,
        transferCountThreshold: newTransferCountThreshold,
        timeWindowThreshold: newTimeWindowThreshold,
      });

      this.currentThresholds = {
        ...this.currentThresholds,
        ...validatedThresholds,
      };

      // Log threshold changes for monitoring
      await this.logThresholdChanges(validatedThresholds, adjustments);

      console.log('Enhanced adaptive thresholds updated:', this.currentThresholds);

      return this.currentThresholds;
    } catch (err) {
      console.error('Threshold update error:', err);
      return this.getCurrentThresholds();
    }
  }

  /**
   * Get enhanced network metrics including TPS, congestion, and fee trends
   */
  private async getEnhancedNetworkMetrics(): Promise<{
    congestion: number;
    avgTps: number;
    feePercentile: number;
    volatility: number;
  }> {
    try {
      const perfSamples = await this.connection.getRecentPerformanceSamples(20);
      
      if (!perfSamples.length) {
        return { congestion: 1.0, avgTps: 1000, feePercentile: 0.5, volatility: 0.1 };
      }

      // Calculate TPS metrics
      const tpsValues = perfSamples.map(s => s.numTransactions / s.samplePeriodSecs);
      const avgTps = tpsValues.reduce((sum, tps) => sum + tps, 0) / tpsValues.length;
      const maxTps = Math.max(...tpsValues);
      const congestion = Math.min(1.0, avgTps / 20000); // Normalize to ~1 at 20k TPS
      
      // Calculate volatility
      const tpsMean = avgTps;
      const tpsVariance = tpsValues.reduce((sum, tps) => sum + Math.pow(tps - tpsMean, 2), 0) / tpsValues.length;
      const volatility = Math.sqrt(tpsVariance) / tpsMean;
      
      // Estimate fee percentile (simplified)
      const feePercentile = Math.min(1.0, congestion * 1.2);
      
      this.networkCongestionLevels.push(congestion);
      if (this.networkCongestionLevels.length > 48) { // Keep 48 hours of data
        this.networkCongestionLevels.shift();
      }

      return { congestion, avgTps, feePercentile, volatility };
    } catch (error) {
      console.error('Failed to fetch enhanced network metrics:', error);
      return { congestion: 1.0, avgTps: 1000, feePercentile: 0.5, volatility: 0.1 };
    }
  }

  /**
   * Analyze historical dust detection patterns
   */
  private async analyzeHistoricalPatterns(): Promise<{
    detectionRate: number;
    avgDustAmount: number;
    patternStability: number;
  }> {
    try {
      const result = await db.pool.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(*) FILTER (WHERE is_potential_dust = true) as dust_transactions,
          AVG(amount) FILTER (WHERE is_potential_dust = true) as avg_dust_amount,
          STDDEV(amount) FILTER (WHERE is_potential_dust = true) as dust_amount_stddev
        FROM dust_transactions 
        WHERE timestamp > NOW() - INTERVAL '7 days'
      `);

      const row = result.rows[0];
      const detectionRate = row.total_transactions > 0 ? 
        row.dust_transactions / row.total_transactions : 0;
      const avgDustAmount = parseFloat(row.avg_dust_amount || '0.001');
      const dustStddev = parseFloat(row.dust_amount_stddev || '0');
      
      // Calculate pattern stability (lower stddev = more stable)
      const patternStability = avgDustAmount > 0 ? 
        Math.max(0, 1 - (dustStddev / avgDustAmount)) : 0.5;

      return { detectionRate, avgDustAmount, patternStability };
    } catch (error) {
      console.error('Failed to analyze historical patterns:', error);
      return { detectionRate: 0.1, avgDustAmount: 0.001, patternStability: 0.5 };
    }
  }

  /**
   * Calculate false positive rate from recent detections
   */
  private async calculateFalsePositiveRate(): Promise<number> {
    try {
      // This would ideally use manual verification data
      // For now, use heuristics based on detection patterns
      const result = await db.pool.query(`
        SELECT 
          COUNT(*) as total_dust,
          COUNT(*) FILTER (WHERE amount > $1) as potentially_false
        FROM dust_transactions 
        WHERE is_potential_dust = true 
          AND timestamp > NOW() - INTERVAL '24 hours'
      `, [this.currentThresholds.dustAmountThreshold * 2]);

      const row = result.rows[0];
      const falsePositiveRate = row.total_dust > 0 ? 
        row.potentially_false / row.total_dust : 0;

      return Math.min(0.5, falsePositiveRate); // Cap at 50%
    } catch (error) {
      console.error('Failed to calculate false positive rate:', error);
      return 0.1; // Default 10%
    }
  }

  /**
   * Calculate base dust threshold from network fees
   */
  private async calculateBaseDustThreshold(): Promise<number> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash();
      const payer = web3.Keypair.generate();

      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: payer.publicKey,
          lamports: 1000,
        })
      );
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer.publicKey;

      const message = transaction.compileMessage();
      let currentFee = 0.000005; // 5000 lamports default fallback

      try {
        const feeResponse = await this.connection.getFeeForMessage(message);
        if (feeResponse?.value) {
          currentFee = feeResponse.value / LAMPORTS_PER_SOL;
        }
      } catch (err: any) {
        console.warn(`Fee estimation error: ${err?.message || 'unknown error'}`);
      }

      return currentFee * this.currentThresholds.networkFeeMultiplier;
    } catch (error) {
      console.error('Failed to calculate base dust threshold:', error);
      return 0.001; // Fallback
    }
  }

  /**
   * Calculate adjustment factors based on various metrics
   */
  private calculateAdjustmentFactors(
    networkMetrics: any,
    historicalAnalysis: any,
    falsePositiveRate: number
  ): {
    congestionFactor: number;
    stabilityFactor: number;
    accuracyFactor: number;
  } {
    // Congestion adjustment (higher congestion = higher thresholds)
    const congestionFactor = 1 + networkMetrics.congestion * 0.3;
    
    // Stability adjustment (more stable patterns = tighter thresholds)
    const stabilityFactor = 0.7 + historicalAnalysis.patternStability * 0.6;
    
    // Accuracy adjustment (high false positives = higher thresholds)
    const accuracyFactor = 1 + falsePositiveRate * 0.5;
    
    return { congestionFactor, stabilityFactor, accuracyFactor };
  }

  /**
   * Calculate new dust threshold with enhanced logic
   */
  private calculateNewDustThreshold(
    baseDustThreshold: number,
    adjustments: any
  ): number {
    let newThreshold = baseDustThreshold;
    
    // Apply adjustment factors
    newThreshold *= adjustments.congestionFactor;
    newThreshold *= adjustments.stabilityFactor;
    newThreshold *= adjustments.accuracyFactor;
    
    // Blend with historical data
    if (this.historicalDustAmounts.length > 10) {
      const sorted = [...this.historicalDustAmounts].sort((a, b) => a - b);
      const percentile10 = sorted[Math.floor(sorted.length * 0.1)];
      const percentile25 = sorted[Math.floor(sorted.length * 0.25)];
      
      // Use weighted average of calculated threshold and historical percentiles
      newThreshold = 0.5 * newThreshold + 0.3 * percentile10 + 0.2 * percentile25;
    }
    
    return newThreshold;
  }

  /**
   * Calculate new transfer count threshold
   */
  private calculateNewTransferThreshold(networkMetrics: any, adjustments: any): number {
    const baseThreshold = this.currentThresholds.transferCountThreshold;
    const congestionAdjustment = 1 + networkMetrics.congestion * 0.4;
    const accuracyAdjustment = adjustments.accuracyFactor;
    
    return Math.max(2, Math.round(baseThreshold * congestionAdjustment * accuracyAdjustment));
  }

  /**
   * Calculate new time window threshold
   */
  private calculateNewTimeWindowThreshold(networkMetrics: any, adjustments: any): number {
    const baseThreshold = this.currentThresholds.timeWindowThreshold;
    const volatilityAdjustment = 1 - networkMetrics.volatility * 0.3;
    const stabilityAdjustment = adjustments.stabilityFactor;
    
    return Math.max(3600000, Math.round(baseThreshold * volatilityAdjustment * stabilityAdjustment));
  }

  /**
   * Validate thresholds are within reasonable bounds
   */
  private validateThresholds(thresholds: any): any {
    return {
      dustAmountThreshold: Math.max(0.0001, Math.min(0.01, thresholds.dustAmountThreshold)),
      transferCountThreshold: Math.max(2, Math.min(20, thresholds.transferCountThreshold)),
      timeWindowThreshold: Math.max(1800000, Math.min(172800000, thresholds.timeWindowThreshold)), // 30min to 48h
    };
  }

  /**
   * Log threshold changes for monitoring
   */
  private async logThresholdChanges(thresholds: any, adjustments: any): Promise<void> {
    try {
      await db.pool.query(`
        INSERT INTO threshold_history (
          timestamp, dust_threshold, transfer_threshold, time_window_threshold,
          congestion_factor, stability_factor, accuracy_factor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        new Date(),
        thresholds.dustAmountThreshold,
        thresholds.transferCountThreshold,
        thresholds.timeWindowThreshold,
        adjustments.congestionFactor,
        adjustments.stabilityFactor,
        adjustments.accuracyFactor
      ]);
    } catch (error) {
      // Don't fail threshold update if logging fails
      console.error('Failed to log threshold changes:', error);
    }
  }

  getCurrentThresholds() {
    return { ...this.currentThresholds };
  }
}
