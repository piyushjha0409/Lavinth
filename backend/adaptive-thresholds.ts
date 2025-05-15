/**
 * Adaptive Thresholds for Dust Detection
 * This module provides dynamic threshold adjustment based on network conditions
 */

import * as web3 from '@solana/web3.js';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import db from './db/db-utils';

export class AdaptiveThresholds {
  private historicalDustAmounts: number[] = [];
  private networkCongestionLevels: number[] = [];
  private lastUpdateTimestamp: number = 0;
  private updateInterval: number = 3600000; // 1 hour in milliseconds
  private connection: Connection;
  
  // Current thresholds
  private currentThresholds = {
    dustAmountThreshold: 0.001, // SOL
    transferCountThreshold: 3,
    timeWindowThreshold: 86400000, // 24 hours in milliseconds
    networkFeeMultiplier: 10
  };

  constructor(connection: Connection, initialThresholds?: {
    dustAmountThreshold?: number,
    transferCountThreshold?: number,
    timeWindowThreshold?: number,
    networkFeeMultiplier?: number
  }) {
    this.connection = connection;
    
    if (initialThresholds) {
      this.currentThresholds = {
        ...this.currentThresholds,
        ...initialThresholds
      };
    }
    
    // Load historical data from database
    this.loadHistoricalData();
  }

  private async loadHistoricalData(): Promise<void> {
    try {
      // Load historical dust transaction amounts from database
      const result = await db.pool.query(
        `SELECT amount FROM dust_transactions 
         WHERE is_potential_dust = true 
         ORDER BY timestamp DESC LIMIT 1000`
      );
      
      this.historicalDustAmounts = result.rows.map((row: { amount: string }) => parseFloat(row.amount));
      console.log(`Loaded ${this.historicalDustAmounts.length} historical dust amounts`);
    } catch (error) {
      console.error('Error loading historical dust data:', error);
    }
  }

  private async calculateNetworkCongestion(): Promise<number> {
    try {
      // Get average transaction count per slot in the last hour
      const result = await (db as any).query(
        `SELECT AVG(transaction_count) as avg_tx_count
         FROM network_stats
         WHERE timestamp > NOW() - INTERVAL '1 hour'`
      );
      
      // Get baseline transaction count (average over the last week)
      const baselineResult = await (db as any).query(
        `SELECT AVG(transaction_count) as avg_tx_count
         FROM network_stats
         WHERE timestamp > NOW() - INTERVAL '1 week'`
      );
      
      const currentAvg = parseFloat(result.rows[0]?.avg_tx_count) || 0;
      const baselineAvg = parseFloat(baselineResult.rows[0]?.avg_tx_count) || 1;
      
      // Calculate congestion as a ratio of current to baseline
      // Normalize to a value between 0 and 1
      return Math.min(1, currentAvg / baselineAvg);
    } catch (error) {
      console.error('Error calculating network congestion:', error);
      return 0.5; // Default to medium congestion on error
    }
  }

  private async getNetworkCongestion(): Promise<number> {
    try {
      // Get recent performance samples
      const perfSamples = await this.connection.getRecentPerformanceSamples(10);
      
      if (perfSamples.length === 0) {
        return 1.0; // Default congestion level
      }
      
      // Calculate average TPS
      const avgTps = perfSamples.reduce((sum, sample) => sum + sample.numTransactions / sample.samplePeriodSecs, 0) / perfSamples.length;
      
      // Normalize congestion (higher TPS = higher congestion)
      // Typical Solana TPS ranges from 1,000 to 50,000
      const normalizedCongestion = Math.min(1.0, avgTps / 20000);
      
      this.networkCongestionLevels.push(normalizedCongestion);
      // Keep only the last 24 samples
      if (this.networkCongestionLevels.length > 24) {
        this.networkCongestionLevels.shift();
      }
      
      return normalizedCongestion;
    } catch (error) {
      console.error('Error getting network congestion:', error);
      return 1.0; // Default congestion level on error
    }
  }

  async updateThresholds(): Promise<{
    dustAmountThreshold: number;
    transferCountThreshold: number;
    timeWindowThreshold: number;
  }> {
    const now = Date.now();
    
    // Only update if enough time has passed since last update
    if (now - this.lastUpdateTimestamp < this.updateInterval) {
      return this.currentThresholds;
    }
    
    this.lastUpdateTimestamp = now;
    
    try {
      // Get current network fee using the newer getFeeForMessage API
      // Create a dummy transaction to estimate fees
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create a dummy keypair for fee calculation
      const payer = web3.Keypair.generate();
      
      // Create a simple transfer transaction
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: payer.publicKey,
          lamports: 1000,
        })
      );
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer.publicKey;
      
      // Get the message from the transaction
      const message = transaction.compileMessage();
      
      // Get the fee for this message
      let currentFee = 0.000005; // Default fallback fee (5000 lamports) if API call fails
      
      try {
        const feeResponse = await this.connection.getFeeForMessage(message);
        
        if (feeResponse && feeResponse.value) {
          currentFee = feeResponse.value / LAMPORTS_PER_SOL;
          console.log(`Successfully retrieved current network fee: ${currentFee} SOL`);
        } else {
          console.warn('Fee response value is null or undefined, using fallback fee');
        }
      } catch (error: any) {
        console.warn(`Error getting fee for message, using fallback fee: ${error?.message || 'Unknown error'}`);
      }
      
      // Get current network congestion
      const currentCongestion = await this.getNetworkCongestion();
      
      // Calculate adaptive dust threshold based on network fee and congestion
      const baseDustThreshold = currentFee * this.currentThresholds.networkFeeMultiplier;
      
      // Adjust based on congestion (higher congestion = higher threshold)
      const congestionAdjustment = 1 + (currentCongestion * 0.5); // Up to 50% increase
      
      // Calculate statistical threshold from historical data
      let statisticalThreshold = 0.001; // Default
      if (this.historicalDustAmounts.length > 10) {
        // Sort amounts
        const sortedAmounts = [...this.historicalDustAmounts].sort((a, b) => a - b);
        // Use 10th percentile as a baseline
        const percentileIndex = Math.floor(sortedAmounts.length * 0.1);
        statisticalThreshold = sortedAmounts[percentileIndex];
      }
      
      // Combine thresholds (weighted average)
      const newDustAmountThreshold = (
        0.6 * baseDustThreshold * congestionAdjustment +
        0.4 * statisticalThreshold
      );
      
      // Adjust transfer count threshold based on congestion
      // Higher congestion = require more transfers to reduce false positives
      const newTransferCountThreshold = Math.max(
        2,
        Math.round(this.currentThresholds.transferCountThreshold * (1 + (currentCongestion * 0.3)))
      );
      
      // Adjust time window threshold
      // Higher congestion = shorter time window (attackers might act faster)
      const newTimeWindowThreshold = Math.max(
        3600000, // Minimum 1 hour
        Math.round(this.currentThresholds.timeWindowThreshold * (1 - (currentCongestion * 0.2)))
      );
      
      // Update current thresholds
      this.currentThresholds = {
        ...this.currentThresholds,
        dustAmountThreshold: newDustAmountThreshold,
        transferCountThreshold: newTransferCountThreshold,
        timeWindowThreshold: newTimeWindowThreshold
      };
      
      console.log('Updated adaptive thresholds:', this.currentThresholds);
      
      return this.currentThresholds;
    } catch (error) {
      console.error('Error updating thresholds:', error);
      return this.currentThresholds;
    }
  }

  getCurrentThresholds() {
    return { ...this.currentThresholds };
  }
}
