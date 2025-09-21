/**
 * ML Model Integration for Lavinth Detection Pipeline
 * Integrates trained ML models with the existing TypeScript detection system
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DustTransaction } from '../db/db-utils';

export interface MLPrediction {
  attackerScore: number;
  victimScore: number;
  confidence: number;
  modelVersion: string;
  features: Record<string, number>;
  explanation?: string;
}

export interface MLModelConfig {
  modelPath: string;
  pythonPath: string;
  scriptPath: string;
  timeout: number;
  enableShadowMode: boolean;
  confidenceThreshold: number;
}

export class MLModelIntegration {
  private config: MLModelConfig;
  private isModelLoaded: boolean = false;
  private modelMetadata: any = null;
  private predictionCache: Map<string, MLPrediction> = new Map();
  private shadowModeResults: Array<{
    transaction: DustTransaction;
    ruleBasedResult: boolean;
    mlResult: MLPrediction;
    timestamp: Date;
  }> = [];

  constructor(config?: Partial<MLModelConfig>) {
    this.config = {
      modelPath: config?.modelPath || path.join(__dirname, 'models', 'lavinth_model_latest.joblib'),
      pythonPath: config?.pythonPath || 'python3',
      scriptPath: config?.scriptPath || path.join(__dirname, 'inference_service.py'),
      timeout: config?.timeout || 5000, // 5 seconds
      enableShadowMode: config?.enableShadowMode || true,
      confidenceThreshold: config?.confidenceThreshold || 0.7,
      ...config
    };

    this.initializeModel();
  }

  /**
   * Initialize the ML model
   */
  private async initializeModel(): Promise<void> {
    try {
      // Check if model file exists
      if (!fs.existsSync(this.config.modelPath)) {
        console.warn(`ML model not found at ${this.config.modelPath}. ML predictions disabled.`);
        return;
      }

      // Load model metadata
      const metadataPath = this.config.modelPath.replace('.joblib', '_metadata.json');
      if (fs.existsSync(metadataPath)) {
        this.modelMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`ML model loaded: ${this.modelMetadata.model_path}`);
        console.log(`Training time: ${this.modelMetadata.training_time}`);
        console.log(`Features: ${this.modelMetadata.feature_columns?.length || 'unknown'}`);
      }

      this.isModelLoaded = true;
      console.log('ML model integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
      this.isModelLoaded = false;
    }
  }

  /**
   * Get ML prediction for a transaction
   */
  async predictTransaction(transaction: DustTransaction): Promise<MLPrediction | null> {
    if (!this.isModelLoaded) {
      return null;
    }

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(transaction);
      if (this.predictionCache.has(cacheKey)) {
        return this.predictionCache.get(cacheKey)!;
      }

      // Prepare transaction data for ML model
      const transactionData = this.prepareTransactionData(transaction);

      // Call Python inference service
      const prediction = await this.callPythonInference(transactionData);

      // Cache the result
      if (prediction) {
        this.predictionCache.set(cacheKey, prediction);
        
        // Limit cache size
        if (this.predictionCache.size > 1000) {
          const firstKey = this.predictionCache.keys().next().value;
          this.predictionCache.delete(firstKey as string);
        }
      }

      return prediction;
    } catch (error) {
      console.error('ML prediction failed:', error);
      return null;
    }
  }

  /**
   * Enhanced dust detection with ML integration
   */
  async enhancedDustDetection(
    transaction: DustTransaction,
    ruleBasedResult: boolean
  ): Promise<{
    isDust: boolean;
    confidence: number;
    method: 'rule-based' | 'ml-enhanced' | 'ml-only';
    mlPrediction?: MLPrediction;
  }> {
    // Get ML prediction
    const mlPrediction = await this.predictTransaction(transaction);

    if (!mlPrediction) {
      // Fallback to rule-based detection
      return {
        isDust: ruleBasedResult,
        confidence: ruleBasedResult ? 0.8 : 0.2,
        method: 'rule-based'
      };
    }

    // Shadow mode: log discrepancies for model validation
    if (this.config.enableShadowMode) {
      this.logShadowModeResult(transaction, ruleBasedResult, mlPrediction);
    }

    // Combine rule-based and ML predictions
    const combinedResult = this.combinePredictions(ruleBasedResult, mlPrediction);

    return {
      isDust: combinedResult.isDust,
      confidence: combinedResult.confidence,
      method: combinedResult.method,
      mlPrediction
    };
  }

  /**
   * Prepare transaction data for ML model
   */
  private prepareTransactionData(transaction: DustTransaction): any {
    return {
      signature: transaction.signature,
      timestamp: transaction.timestamp.toISOString(),
      sender: transaction.sender || '',
      recipient: transaction.recipient || '',
      amount: transaction.amount,
      fee: transaction.fee,
      success: transaction.success,
      token_type: transaction.tokenType,
      memo_content: transaction.memoContent || '',
      is_potential_dust: transaction.isPotentialDust,
      is_potential_poisoning: transaction.isPotentialPoisoning,
      risk_score: transaction.riskScore || 0
    };
  }

  /**
   * Call Python inference service
   */
  private async callPythonInference(transactionData: any): Promise<MLPrediction | null> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.config.pythonPath, [
        this.config.scriptPath,
        '--model-path', this.config.modelPath,
        '--input', JSON.stringify(transactionData)
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse ML output: ${error}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
        }
      });

      // Set timeout
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('ML inference timeout'));
      }, this.config.timeout);
    });
  }

  /**
   * Combine rule-based and ML predictions
   */
  private combinePredictions(
    ruleBasedResult: boolean,
    mlPrediction: MLPrediction
  ): {
    isDust: boolean;
    confidence: number;
    method: 'rule-based' | 'ml-enhanced' | 'ml-only';
  } {
    const mlScore = Math.max(mlPrediction.attackerScore, mlPrediction.victimScore);
    const mlConfidence = mlPrediction.confidence;

    // High confidence ML prediction overrides rule-based
    if (mlConfidence >= this.config.confidenceThreshold) {
      const mlResult = mlScore > 0.5;
      
      // If ML and rule-based agree, high confidence
      if (mlResult === ruleBasedResult) {
        return {
          isDust: mlResult,
          confidence: Math.min(0.95, 0.7 + mlConfidence * 0.25),
          method: 'ml-enhanced'
        };
      }
      
      // If they disagree, trust ML if very confident
      if (mlConfidence > 0.8) {
        return {
          isDust: mlResult,
          confidence: mlConfidence * 0.9,
          method: 'ml-only'
        };
      }
    }

    // Medium confidence: weighted combination
    if (mlConfidence >= 0.5) {
      const ruleWeight = 0.6;
      const mlWeight = 0.4;
      
      const ruleScore = ruleBasedResult ? 0.8 : 0.2;
      const combinedScore = ruleWeight * ruleScore + mlWeight * mlScore;
      
      return {
        isDust: combinedScore > 0.5,
        confidence: Math.min(0.85, combinedScore),
        method: 'ml-enhanced'
      };
    }

    // Low ML confidence: fall back to rule-based
    return {
      isDust: ruleBasedResult,
      confidence: ruleBasedResult ? 0.7 : 0.3,
      method: 'rule-based'
    };
  }

  /**
   * Log shadow mode results for model validation
   */
  private logShadowModeResult(
    transaction: DustTransaction,
    ruleBasedResult: boolean,
    mlPrediction: MLPrediction
  ): void {
    this.shadowModeResults.push({
      transaction,
      ruleBasedResult,
      mlResult: mlPrediction,
      timestamp: new Date()
    });

    // Keep only recent results (last 1000)
    if (this.shadowModeResults.length > 1000) {
      this.shadowModeResults = this.shadowModeResults.slice(-1000);
    }

    // Log significant discrepancies
    const mlIsDust = Math.max(mlPrediction.attackerScore, mlPrediction.victimScore) > 0.5;
    if (ruleBasedResult !== mlIsDust && mlPrediction.confidence > 0.7) {
      console.log(`Shadow mode discrepancy detected:`, {
        signature: transaction.signature,
        ruleBasedResult,
        mlResult: mlIsDust,
        mlConfidence: mlPrediction.confidence,
        amount: transaction.amount
      });
    }
  }

  /**
   * Get shadow mode statistics
   */
  getShadowModeStatistics(): {
    totalPredictions: number;
    agreementRate: number;
    discrepancies: number;
    mlHighConfidenceOverrides: number;
  } {
    if (this.shadowModeResults.length === 0) {
      return {
        totalPredictions: 0,
        agreementRate: 0,
        discrepancies: 0,
        mlHighConfidenceOverrides: 0
      };
    }

    let agreements = 0;
    let discrepancies = 0;
    let mlHighConfidenceOverrides = 0;

    for (const result of this.shadowModeResults) {
      const mlIsDust = Math.max(result.mlResult.attackerScore, result.mlResult.victimScore) > 0.5;
      
      if (result.ruleBasedResult === mlIsDust) {
        agreements++;
      } else {
        discrepancies++;
        
        if (result.mlResult.confidence > this.config.confidenceThreshold) {
          mlHighConfidenceOverrides++;
        }
      }
    }

    return {
      totalPredictions: this.shadowModeResults.length,
      agreementRate: agreements / this.shadowModeResults.length,
      discrepancies,
      mlHighConfidenceOverrides
    };
  }

  /**
   * Generate cache key for transaction
   */
  private getCacheKey(transaction: DustTransaction): string {
    return `${transaction.signature}_${transaction.timestamp.getTime()}`;
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.predictionCache.clear();
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    isLoaded: boolean;
    modelPath: string;
    metadata: any;
    cacheSize: number;
  } {
    return {
      isLoaded: this.isModelLoaded,
      modelPath: this.config.modelPath,
      metadata: this.modelMetadata,
      cacheSize: this.predictionCache.size
    };
  }

  /**
   * Update model configuration
   */
  updateConfig(newConfig: Partial<MLModelConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if model path changed
    if (newConfig.modelPath) {
      this.isModelLoaded = false;
      this.initializeModel();
    }
  }

  /**
   * Batch prediction for multiple transactions
   */
  async batchPredict(transactions: DustTransaction[]): Promise<Map<string, MLPrediction>> {
    const results = new Map<string, MLPrediction>();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (tx) => {
        const prediction = await this.predictTransaction(tx);
        if (prediction) {
          results.set(tx.signature, prediction);
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  }

  /**
   * Export shadow mode results for analysis
   */
  exportShadowModeResults(): any[] {
    return this.shadowModeResults.map(result => ({
      signature: result.transaction.signature,
      timestamp: result.timestamp.toISOString(),
      amount: result.transaction.amount,
      ruleBasedResult: result.ruleBasedResult,
      mlAttackerScore: result.mlResult.attackerScore,
      mlVictimScore: result.mlResult.victimScore,
      mlConfidence: result.mlResult.confidence,
      agreement: result.ruleBasedResult === (Math.max(result.mlResult.attackerScore, result.mlResult.victimScore) > 0.5)
    }));
  }
}

// Singleton instance for global use
export const mlIntegration = new MLModelIntegration();

// Export for use in other modules
export default MLModelIntegration;
