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
export declare class DustingAlertSystem {
    private config;
    private isRunning;
    private lastAlertTimestamps;
    private discordWebhook?;
    private emailTransporter?;
    constructor(config?: Partial<AlertConfig>);
    private initializeChannels;
    /**
     * Start continuous monitoring for dust attacks
     */
    monitorInRealTime(): Promise<void>;
    /**
     * Stop the monitoring process
     */
    stopMonitoring(): void;
    /**
     * Check for new high-risk attackers and victims
     */
    private checkForNewThreats;
    /**
     * Send an alert through configured channels
     */
    private sendAlert;
    /**
     * Format alert message based on alert type
     */
    private formatAlertMessage;
}
