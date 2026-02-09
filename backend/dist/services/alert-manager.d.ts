/**
 * Alert Manager Service
 *
 * Manages alert notifications across multiple channels (webhook, Discord, email).
 * Part of WalletShield Recovery - Phase 2
 */
import { EventEmitter } from "events";
import { CompromiseAlert, AlertChannels } from "./compromise-detector";
export interface NotificationPayload {
    notificationId: string;
    alertId: string;
    walletAddress: string;
    channel: NotificationChannel;
    destination: string;
    title: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    metadata: any;
    status: NotificationStatus;
    attempts: number;
    lastAttemptAt?: Date;
    deliveredAt?: Date;
    error?: string;
    createdAt: Date;
}
export type NotificationChannel = "webhook" | "discord" | "telegram";
export type NotificationStatus = "pending" | "sending" | "delivered" | "failed" | "retrying";
export interface WebhookPayload {
    event: string;
    timestamp: string;
    alert: {
        id: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        walletAddress: string;
        metadata: any;
    };
    wallet: {
        address: string;
        isCompromised: boolean;
    };
}
export interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
    timestamp: string;
    footer: {
        text: string;
    };
}
export interface AlertSubscription {
    subscriptionId: string;
    walletAddress: string;
    userId?: string;
    channels: AlertChannels;
    severityFilter: ("low" | "medium" | "high" | "critical")[];
    alertTypes: string[];
    isActive: boolean;
    createdAt: Date;
}
/**
 * AlertManager class
 * Handles sending notifications across multiple channels
 */
export declare class AlertManager {
    static events: EventEmitter<any>;
    private notificationQueue;
    private processing;
    private rateLimitCounter;
    private rateLimitResetTime;
    constructor();
    /**
     * Send alert notifications to all configured channels
     */
    sendAlert(alert: CompromiseAlert, channels: AlertChannels): Promise<void>;
    /**
     * Create a notification payload
     */
    private createNotification;
    /**
     * Queue a notification for delivery
     */
    private queueNotification;
    /**
     * Start the queue processor
     */
    private startQueueProcessor;
    /**
     * Process notification queue
     */
    private processQueue;
    /**
     * Check rate limit
     */
    private checkRateLimit;
    /**
     * Send a single notification
     */
    private sendNotification;
    /**
     * Send webhook notification
     */
    private sendWebhook;
    /**
     * Send Discord notification
     */
    private sendDiscord;
    /**
     * Get Discord embed color based on severity
     */
    private getSeverityColor;
    /**
     * Generate signature for webhook verification
     */
    private generateSignature;
    /**
     * Update notification status in database
     */
    private updateNotificationStatus;
    /**
     * Create alert subscription
     */
    createSubscription(walletAddress: string, channels: AlertChannels, options?: {
        userId?: string;
        severityFilter?: ("low" | "medium" | "high" | "critical")[];
        alertTypes?: string[];
    }): Promise<AlertSubscription>;
    /**
     * Get subscription for a wallet
     */
    getSubscription(walletAddress: string): Promise<AlertSubscription | null>;
    /**
     * Deactivate subscription
     */
    deactivateSubscription(walletAddress: string): Promise<void>;
    /**
     * Send bulk alerts for a wallet compromise
     */
    sendCompromiseNotifications(walletAddress: string, alerts: CompromiseAlert[]): Promise<void>;
    /**
     * Get notification history for a wallet
     */
    getNotificationHistory(walletAddress: string, limit?: number): Promise<NotificationPayload[]>;
    /**
     * Get pending notifications count
     */
    getPendingCount(): Promise<number>;
    /**
     * Retry failed notifications
     */
    retryFailed(walletAddress?: string): Promise<number>;
}
export declare const alertManager: AlertManager;
export default alertManager;
