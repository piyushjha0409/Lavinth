/**
 * Real-time Monitoring and Alerting System for Dust Attacks
 * This module provides continuous monitoring and alerts for potential dusting attacks
 */
export interface AlertConfig {
    enabled: boolean;
    channels: {
        discord?: {
            webhookUrl: string;
        };
        email?: {
            recipients: string[];
            smtpConfig: {
                host: string;
                port: number;
                secure: boolean;
                auth: {
                    user: string;
                    pass: string;
                };
            };
        };
        sms?: {
            phoneNumbers: string[];
            provider: string;
            apiKey: string;
        };
    };
    thresholds: {
        newAttackerRiskScore: number;
        newVictimRiskScore: number;
        attackerActivitySpike: number;
        victimExposureLevel: number;
    };
}
export interface DustingAttacker {
    address: string;
    risk_score: number;
    unique_victims_count: number;
    small_transfers_count: number;
}
export interface DustingVictim {
    address: string;
    risk_score: number;
    unique_attackers_count: number;
    dust_transactions_count: number;
}
export declare class DustingAlertSystem {
    private config;
    private isRunning;
    private lastAlertTimestamps;
    private discordWebhook?;
    private emailTransporter?;
    constructor(config?: Partial<AlertConfig>);
    private initializeChannels;
    monitorInRealTime(): Promise<void>;
    stopMonitoring(): void;
    private checkForNewThreats;
    /**
     * Analyze new attackers with enhanced confidence scoring
     */
    private analyzeNewAttackers;
    /**
     * Calculate attacker confidence based on multiple factors
     */
    private calculateAttackerConfidence;
    /**
     * Analyze attacker patterns for additional context
     */
    private analyzeAttackerPatterns;
    /**
     * Calculate alert priority based on confidence and patterns
     */
    private calculateAlertPriority;
    /**
     * Analyze new victims with enhanced detection
     */
    private analyzeNewVictims;
    /**
     * Assess victim risk with multiple factors
     */
    private assessVictimRisk;
    /**
     * Analyze activity patterns with enhanced context
     */
    private analyzeActivityPatterns;
    /**
     * Detect coordinated attacks across multiple addresses
     */
    private detectCoordinatedAttacks;
    /**
     * Detect address poisoning campaigns
     */
    private detectPoisoningCampaigns;
    /**
     * Send enhanced alert with better formatting and context
     */
    private sendEnhancedAlert;
    /**
     * Send Discord alert
     */
    private sendDiscordAlert;
    /**
     * Send email alert
     */
    private sendEmailAlert;
    /**
     * Format enhanced alert messages with better context
     */
    private formatEnhancedAlertMessage;
    /**
     * Legacy alert function - kept for backward compatibility
     * Use sendEnhancedAlert for new implementations
     */
    private sendAlert;
    /**
     * Get real-time system statistics
     */
    getSystemStats(): {
        isRunning: boolean;
        totalAlertsToday: number;
        lastAlertTime: number | null;
        activeThreats: {
            highRiskAttackers: number;
            highRiskVictims: number;
            coordinatedAttacks: number;
        };
        systemHealth: "healthy" | "warning" | "critical";
    };
    /**
     * Update alert configuration dynamically
     */
    updateConfig(newConfig: Partial<AlertConfig>): void;
    /**
     * Test alert system connectivity
     */
    testAlertSystem(): Promise<{
        discord: {
            success: boolean;
            error?: string;
        };
        email: {
            success: boolean;
            error?: string;
        };
    }>;
    /**
     * Get alert history and statistics
     */
    getAlertHistory(hours?: number): Promise<{
        totalAlerts: number;
        alertsByType: Record<string, number>;
        alertsByPriority: Record<string, number>;
        timeline: Array<{
            timestamp: number;
            type: string;
            count: number;
        }>;
    }>;
    /**
     * Manually trigger alert for testing or emergency situations
     */
    triggerManualAlert(type: "emergency" | "maintenance" | "test", message: string, priority?: "low" | "medium" | "high" | "critical"): Promise<void>;
    private formatAlertMessage;
}
