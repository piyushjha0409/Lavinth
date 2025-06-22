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
    private sendAlert;
    private formatAlertMessage;
}
