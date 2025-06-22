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
          console.log(`Network fee retrieved: ${currentFee} SOL`);
        } else {
          console.warn('Fee response is empty, using fallback');
        }
      } catch (err: any) {
        console.warn(`Fee estimation error: ${err?.message || 'unknown error'}`);
      }

      const currentCongestion = await this.getNetworkCongestion();

      const baseDustThreshold =
        currentFee * this.currentThresholds.networkFeeMultiplier;
      const congestionAdjustment = 1 + currentCongestion * 0.5;

      let statisticalThreshold = 0.001;
      if (this.historicalDustAmounts.length > 10) {
        const sorted = [...this.historicalDustAmounts].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * 0.1); // 10th percentile
        statisticalThreshold = sorted[index];
      }

      const newDustAmountThreshold =
        0.6 * baseDustThreshold * congestionAdjustment +
        0.4 * statisticalThreshold;

      const newTransferCountThreshold = Math.max(
        2,
        Math.round(this.currentThresholds.transferCountThreshold * (1 + currentCongestion * 0.3))
      );

      const newTimeWindowThreshold = Math.max(
        3600000,
        Math.round(this.currentThresholds.timeWindowThreshold * (1 - currentCongestion * 0.2))
      );

      this.currentThresholds = {
        ...this.currentThresholds,
        dustAmountThreshold: newDustAmountThreshold,
        transferCountThreshold: newTransferCountThreshold,
        timeWindowThreshold: newTimeWindowThreshold,
      };

      console.log('Adaptive thresholds updated:', this.currentThresholds);

      return this.currentThresholds;
    } catch (err) {
      console.error('Threshold update error:', err);
      return this.getCurrentThresholds();
    }
  }

  getCurrentThresholds() {
    return { ...this.currentThresholds };
  }
}
