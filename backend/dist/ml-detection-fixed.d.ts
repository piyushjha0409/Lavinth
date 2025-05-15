/**
 * Machine Learning Integration for Dust Attack Detection
 * This module provides ML-based classification for potential dusting attackers and victims
 */
import { DustingAttacker, DustingVictim } from './db/db-utils';
export interface MLFeatures {
    transactionFrequency: number;
    averageAmount: number;
    recipientCount: number;
    timePatternFeatures: number[];
    networkFeatures: number[];
}
export interface MLPrediction {
    attackerScore: number;
    victimScore: number;
    confidence: number;
}
export declare class DustDetectionModel {
    private isInitialized;
    private featureWeights;
    constructor();
    private loadModelWeights;
    /**
     * Extract features from a potential attacker
     */
    private extractAttackerFeatures;
    /**
     * Extract features from a potential victim
     */
    private extractVictimFeatures;
    /**
     * Extract time pattern features from timestamps
     */
    private extractTimePatternFeatures;
    /**
     * Train the model using known attackers and victims
     */
    trainModel(knownAttackers: DustingAttacker[], knownVictims: DustingVictim[]): Promise<void>;
    /**
     * Adjust feature weights based on data variance
     */
    private adjustFeatureWeights;
    /**
     * Predict risk scores for a potential attacker
     */
    predictAttackerRisk(attacker: DustingAttacker): Promise<MLPrediction>;
    /**
     * Predict risk scores for a potential victim
     */
    predictVictimRisk(victim: DustingVictim): Promise<MLPrediction>;
    /**
     * Predict risk scores for both attacker and victim perspectives
     */
    predictRisk(features: MLFeatures): Promise<MLPrediction>;
    /**
     * Helper function to normalize transaction frequency
     */
    private normalizeFrequency;
    /**
     * Helper function to normalize transaction amount
     */
    private normalizeAmount;
    /**
     * Helper function to normalize recipient count
     */
    private normalizeRecipientCount;
}
