"use strict";
/**
 * Machine Learning Integration for Dust Attack Detection
 * This module provides ML-based classification for potential dusting attackers and victims
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DustDetectionModel = void 0;
class DustDetectionModel {
    constructor() {
        this.isInitialized = false;
        this.featureWeights = {
            // Attacker feature weights
            attacker: {
                transactionFrequency: 0.25,
                averageAmount: 0.15,
                recipientCount: 0.30,
                timePatterns: 0.15,
                networkPatterns: 0.15
            },
            // Victim feature weights
            victim: {
                transactionFrequency: 0.15,
                averageAmount: 0.25,
                senderCount: 0.20,
                timePatterns: 0.20,
                vulnerability: 0.20
            }
        };
        // Load model weights from database if available
        this.loadModelWeights();
    }
    loadModelWeights() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, you would load trained model weights
                // For now, we'll use the default weights defined above
                this.isInitialized = true;
                console.log('ML model initialized with default weights');
            }
            catch (error) {
                console.error('Error initializing ML model:', error);
            }
        });
    }
    /**
     * Extract features from a potential attacker
     */
    extractAttackerFeatures(attacker) {
        var _a, _b, _c, _d, _e, _f;
        // Transaction frequency (normalized by time period)
        const timeSpan = attacker.timestamps.length > 1 ?
            Math.max(...attacker.timestamps) - Math.min(...attacker.timestamps) : 86400000;
        const transactionFrequency = (attacker.timestamps.length / (timeSpan / 86400000));
        // Average transaction amount
        const averageAmount = 0.001; // This would come from actual transaction data
        // Recipient count (unique victims)
        const recipientCount = attacker.uniqueVictims instanceof Set ? attacker.uniqueVictims.size : attacker.uniqueVictims.length;
        // Time pattern features
        const timePatternFeatures = this.extractTimePatternFeatures(attacker.timestamps);
        // Network features
        const networkFeatures = [
            ((_b = (_a = attacker.patterns) === null || _a === void 0 ? void 0 : _a.network) === null || _b === void 0 ? void 0 : _b.centralityScore) || 0,
            ((_d = (_c = attacker.patterns) === null || _c === void 0 ? void 0 : _c.network) === null || _d === void 0 ? void 0 : _d.recipientOverlap) || 0,
            ((_f = (_e = attacker.patterns) === null || _e === void 0 ? void 0 : _e.network) === null || _f === void 0 ? void 0 : _f.betweennessCentrality) || 0
        ];
        return {
            transactionFrequency,
            averageAmount,
            recipientCount,
            timePatternFeatures,
            networkFeatures
        };
    }
    /**
     * Extract features from a potential victim
     */
    extractVictimFeatures(victim) {
        var _a;
        // Transaction frequency (normalized by time period)
        const timeSpan = victim.timestamps.length > 1 ?
            Math.max(...victim.timestamps) - Math.min(...victim.timestamps) : 86400000;
        const transactionFrequency = (victim.timestamps.length / (timeSpan / 86400000));
        // Average transaction amount
        const averageAmount = 0.001; // This would come from actual transaction data
        // Sender count (unique attackers)
        const senderCount = victim.uniqueAttackers instanceof Set ? victim.uniqueAttackers.size : victim.uniqueAttackers.length;
        // Time pattern features
        const timePatternFeatures = this.extractTimePatternFeatures(victim.timestamps);
        // Network features - for victims, we use vulnerability assessment
        const vulnerabilityScore = ((_a = victim.vulnerabilityAssessment) === null || _a === void 0 ? void 0 : _a.riskExposure) || 0;
        const networkFeatures = [vulnerabilityScore, 0, 0];
        return {
            transactionFrequency,
            averageAmount,
            recipientCount: senderCount, // Use senderCount as recipientCount for consistency
            timePatternFeatures,
            networkFeatures
        };
    }
    /**
     * Extract time pattern features from timestamps
     */
    extractTimePatternFeatures(timestamps) {
        if (timestamps.length < 2) {
            return [0, 0, 0, 0];
        }
        // Sort timestamps
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        // Calculate time gaps between transactions
        const timeGaps = [];
        for (let i = 1; i < sortedTimestamps.length; i++) {
            timeGaps.push(sortedTimestamps[i] - sortedTimestamps[i - 1]);
        }
        // Calculate average time gap
        const avgTimeGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
        // Calculate standard deviation of time gaps
        const variance = timeGaps.reduce((sum, gap) => sum + Math.pow(gap - avgTimeGap, 2), 0) / timeGaps.length;
        const stdDev = Math.sqrt(variance);
        // Calculate coefficient of variation (regularity measure)
        const cv = avgTimeGap > 0 ? stdDev / avgTimeGap : 0;
        const regularity = 1 - Math.min(1, cv / 2);
        // Count bursts (transactions with very small gaps)
        const burstThreshold = 300000; // 5 minutes
        const burstCount = timeGaps.filter(gap => gap < burstThreshold).length;
        const burstRatio = timeGaps.length > 0 ? burstCount / timeGaps.length : 0;
        // Calculate time of day distribution entropy
        const hourDistribution = new Array(24).fill(0);
        for (const timestamp of timestamps) {
            const hour = new Date(timestamp).getUTCHours();
            hourDistribution[hour]++;
        }
        // Normalize distribution
        const normalizedDist = hourDistribution.map(count => count / timestamps.length);
        // Calculate entropy
        const entropy = normalizedDist.reduce((sum, p) => {
            if (p > 0) {
                return sum - (p * Math.log2(p));
            }
            return sum;
        }, 0);
        // Normalize entropy (max entropy for 24 bins is log2(24))
        const normalizedEntropy = entropy / Math.log2(24);
        return [regularity, burstRatio, normalizedEntropy, avgTimeGap / 86400000];
    }
    /**
     * Train the model using known attackers and victims
     */
    trainModel(knownAttackers, knownVictims) {
        return __awaiter(this, void 0, void 0, function* () {
            if (knownAttackers.length < 5 || knownVictims.length < 5) {
                console.log('Not enough training data. Using default weights.');
                return;
            }
            try {
                console.log(`Training model with ${knownAttackers.length} attackers and ${knownVictims.length} victims`);
                // In a real implementation, you would use a proper ML library like TensorFlow.js
                // For now, we'll just adjust our feature weights based on the data
                // Extract features from all samples
                const attackerFeatures = knownAttackers.map(attacker => this.extractAttackerFeatures(attacker));
                const victimFeatures = knownVictims.map(victim => this.extractVictimFeatures(victim));
                // Simple weight adjustment based on feature variance
                // (features with higher variance get higher weights)
                this.adjustFeatureWeights(attackerFeatures, victimFeatures);
                this.isInitialized = true;
                console.log('Model training complete');
            }
            catch (error) {
                console.error('Error training model:', error);
            }
        });
    }
    /**
     * Adjust feature weights based on data variance
     */
    adjustFeatureWeights(attackerFeatures, victimFeatures) {
        // This is a simplified version of weight adjustment
        // In a real ML model, you would use proper training algorithms
        // For now, we'll keep using the default weights
        console.log('Using default feature weights');
    }
    /**
     * Predict risk scores for a potential attacker
     */
    predictAttackerRisk(attacker) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isInitialized) {
                yield this.loadModelWeights();
            }
            // Extract features
            const features = this.extractAttackerFeatures(attacker);
            // Calculate attacker score using weighted features
            const weights = this.featureWeights.attacker;
            let attackerScore = (weights.transactionFrequency * this.normalizeFrequency(features.transactionFrequency) +
                weights.averageAmount * (1 - this.normalizeAmount(features.averageAmount)) + // Lower amount = higher score
                weights.recipientCount * this.normalizeRecipientCount(features.recipientCount) +
                weights.timePatterns * features.timePatternFeatures[0] + // Regularity
                weights.networkPatterns * (features.networkFeatures[0] + features.networkFeatures[1]) / 2);
            // Ensure score is between 0 and 1
            attackerScore = Math.max(0, Math.min(1, attackerScore));
            // Calculate confidence based on amount of data
            const confidence = Math.min(1, attacker.timestamps.length / 20);
            return {
                attackerScore,
                victimScore: 0, // Not applicable for attacker prediction
                confidence
            };
        });
    }
    /**
     * Predict risk scores for a potential victim
     */
    predictVictimRisk(victim) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isInitialized) {
                yield this.loadModelWeights();
            }
            // Extract features
            const features = this.extractVictimFeatures(victim);
            // Calculate victim score using weighted features
            const weights = this.featureWeights.victim;
            let victimScore = (weights.transactionFrequency * this.normalizeFrequency(features.transactionFrequency) +
                weights.averageAmount * (1 - this.normalizeAmount(features.averageAmount)) + // Lower amount = higher score
                weights.senderCount * this.normalizeRecipientCount(features.recipientCount) +
                weights.timePatterns * features.timePatternFeatures[1] + // Burst ratio
                weights.vulnerability * features.networkFeatures[0] // Vulnerability score
            );
            // Ensure score is between 0 and 1
            victimScore = Math.max(0, Math.min(1, victimScore));
            // Calculate confidence based on amount of data
            const confidence = Math.min(1, victim.timestamps.length / 10);
            return {
                attackerScore: 0, // Not applicable for victim prediction
                victimScore,
                confidence
            };
        });
    }
    /**
     * Predict risk scores for both attacker and victim perspectives
     */
    predictRisk(features) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isInitialized) {
                yield this.loadModelWeights();
            }
            // Calculate attacker score
            const weights = this.featureWeights.attacker;
            let attackerScore = (weights.transactionFrequency * this.normalizeFrequency(features.transactionFrequency) +
                weights.averageAmount * (1 - this.normalizeAmount(features.averageAmount)) +
                weights.recipientCount * this.normalizeRecipientCount(features.recipientCount) +
                weights.timePatterns * features.timePatternFeatures[0] +
                weights.networkPatterns * (features.networkFeatures[0] + features.networkFeatures[1]) / 2);
            // Calculate victim score
            const vWeights = this.featureWeights.victim;
            let victimScore = (vWeights.transactionFrequency * this.normalizeFrequency(features.transactionFrequency) +
                vWeights.averageAmount * (1 - this.normalizeAmount(features.averageAmount)) +
                vWeights.senderCount * this.normalizeRecipientCount(features.recipientCount) +
                vWeights.timePatterns * features.timePatternFeatures[1] +
                vWeights.vulnerability * features.networkFeatures[0]);
            // Ensure scores are between 0 and 1
            attackerScore = Math.max(0, Math.min(1, attackerScore));
            victimScore = Math.max(0, Math.min(1, victimScore));
            // Calculate confidence based on feature quality
            const confidence = 0.7; // Default confidence
            return {
                attackerScore,
                victimScore,
                confidence
            };
        });
    }
    /**
     * Helper function to normalize transaction frequency
     */
    normalizeFrequency(frequency) {
        // Normalize frequency: 0 transactions/day -> 0, 10+ transactions/day -> 1
        return Math.min(1, frequency / 10);
    }
    /**
     * Helper function to normalize transaction amount
     */
    normalizeAmount(amount) {
        // Normalize amount: 0 -> 0, 0.01+ SOL -> 1
        return Math.min(1, amount / 0.01);
    }
    /**
     * Helper function to normalize recipient count
     */
    normalizeRecipientCount(count) {
        // Normalize recipient count: 0 -> 0, 20+ recipients -> 1
        return Math.min(1, count / 20);
    }
}
exports.DustDetectionModel = DustDetectionModel;
