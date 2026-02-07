/**
 * Alert Manager Service
 *
 * Manages alert notifications across multiple channels (webhook, Discord, email).
 * Part of WalletShield Recovery - Phase 2
 */

import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/config";
import { CompromiseAlert, AlertChannels } from "./compromise-detector";

dotenv.config();

// Notification configuration
const NOTIFICATION_CONFIG = {
  retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || "3"),
  retryDelayMs: parseInt(process.env.NOTIFICATION_RETRY_DELAY || "1000"),
  batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || "10"),
  rateLimitPerMinute: parseInt(process.env.NOTIFICATION_RATE_LIMIT || "60"),
};

// Interfaces
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

export type NotificationChannel = "webhook" | "discord" | "email" | "telegram";
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
  fields: { name: string; value: string; inline?: boolean }[];
  timestamp: string;
  footer: { text: string };
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
export class AlertManager {
  private notificationQueue: NotificationPayload[] = [];
  private processing: boolean = false;
  private rateLimitCounter: number = 0;
  private rateLimitResetTime: number = Date.now();

  constructor() {
    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Send alert notifications to all configured channels
   */
  async sendAlert(alert: CompromiseAlert, channels: AlertChannels): Promise<void> {
    const notifications: NotificationPayload[] = [];

    // Create notification for each channel
    if (channels.webhook) {
      notifications.push(
        this.createNotification(alert, "webhook", channels.webhook)
      );
    }

    if (channels.discord) {
      notifications.push(
        this.createNotification(alert, "discord", channels.discord)
      );
    }

    if (channels.email) {
      notifications.push(
        this.createNotification(alert, "email", channels.email)
      );
    }

    // Add to queue
    for (const notification of notifications) {
      await this.queueNotification(notification);
    }
  }

  /**
   * Create a notification payload
   */
  private createNotification(
    alert: CompromiseAlert,
    channel: NotificationChannel,
    destination: string
  ): NotificationPayload {
    return {
      notificationId: uuidv4(),
      alertId: alert.alertId,
      walletAddress: alert.walletAddress,
      channel,
      destination,
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      metadata: alert.metadata,
      status: "pending",
      attempts: 0,
      createdAt: new Date(),
    };
  }

  /**
   * Queue a notification for delivery
   */
  private async queueNotification(notification: NotificationPayload): Promise<void> {
    // Store in database
    await pool.executeQuery(
      `INSERT INTO notification_queue (
        notification_id, alert_id, wallet_address, channel, destination,
        title, message, severity, metadata, status, attempts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        notification.notificationId,
        notification.alertId,
        notification.walletAddress,
        notification.channel,
        notification.destination,
        notification.title,
        notification.message,
        notification.severity,
        JSON.stringify(notification.metadata),
        "pending",
        0,
      ]
    );

    // Add to in-memory queue
    this.notificationQueue.push(notification);
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => this.processQueue(), 1000);
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.notificationQueue.length === 0) return;

    // Check rate limit
    if (!this.checkRateLimit()) return;

    this.processing = true;

    try {
      const batch = this.notificationQueue.splice(0, NOTIFICATION_CONFIG.batchSize);

      for (const notification of batch) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error("Error processing notification queue:", error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();

    // Reset counter every minute
    if (now - this.rateLimitResetTime > 60000) {
      this.rateLimitCounter = 0;
      this.rateLimitResetTime = now;
    }

    if (this.rateLimitCounter >= NOTIFICATION_CONFIG.rateLimitPerMinute) {
      return false;
    }

    this.rateLimitCounter++;
    return true;
  }

  /**
   * Send a single notification
   */
  private async sendNotification(notification: NotificationPayload): Promise<void> {
    notification.attempts++;
    notification.lastAttemptAt = new Date();
    notification.status = "sending";

    try {
      switch (notification.channel) {
        case "webhook":
          await this.sendWebhook(notification);
          break;
        case "discord":
          await this.sendDiscord(notification);
          break;
        case "email":
          await this.sendEmail(notification);
          break;
        default:
          throw new Error(`Unknown channel: ${notification.channel}`);
      }

      notification.status = "delivered";
      notification.deliveredAt = new Date();
      await this.updateNotificationStatus(notification);
    } catch (error: any) {
      notification.error = error.message;

      if (notification.attempts < NOTIFICATION_CONFIG.retryAttempts) {
        notification.status = "retrying";
        // Re-queue for retry
        setTimeout(() => {
          this.notificationQueue.push(notification);
        }, NOTIFICATION_CONFIG.retryDelayMs * notification.attempts);
      } else {
        notification.status = "failed";
      }

      await this.updateNotificationStatus(notification);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(notification: NotificationPayload): Promise<void> {
    const payload: WebhookPayload = {
      event: "wallet.alert",
      timestamp: new Date().toISOString(),
      alert: {
        id: notification.alertId,
        type: notification.metadata?.alertType || "unknown",
        severity: notification.severity,
        title: notification.title,
        description: notification.message,
        walletAddress: notification.walletAddress,
        metadata: notification.metadata,
      },
      wallet: {
        address: notification.walletAddress,
        isCompromised: notification.severity === "critical",
      },
    };

    const response = await fetch(notification.destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WalletShield-Signature": this.generateSignature(payload),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscord(notification: NotificationPayload): Promise<void> {
    const color = this.getSeverityColor(notification.severity);

    const embed: DiscordEmbed = {
      title: `🚨 ${notification.title}`,
      description: notification.message,
      color,
      fields: [
        {
          name: "Wallet",
          value: `\`${notification.walletAddress}\``,
          inline: true,
        },
        {
          name: "Severity",
          value: notification.severity.toUpperCase(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "WalletShield Recovery" },
    };

    // Add metadata fields
    if (notification.metadata) {
      if (notification.metadata.amount) {
        embed.fields.push({
          name: "Amount",
          value: `${notification.metadata.amount} SOL`,
          inline: true,
        });
      }
      if (notification.metadata.exchangeName) {
        embed.fields.push({
          name: "Exchange",
          value: notification.metadata.exchangeName,
          inline: true,
        });
      }
    }

    const response = await fetch(notification.destination, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }
  }

  /**
   * Send email notification (placeholder - requires email service integration)
   */
  private async sendEmail(notification: NotificationPayload): Promise<void> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL] Would send to ${notification.destination}:`, {
      subject: `[${notification.severity.toUpperCase()}] ${notification.title}`,
      body: notification.message,
    });

    // For now, just log and mark as delivered
    // TODO: Integrate with actual email service
  }

  /**
   * Get Discord embed color based on severity
   */
  private getSeverityColor(severity: string): number {
    switch (severity) {
      case "critical":
        return 0xff0000; // Red
      case "high":
        return 0xff6600; // Orange
      case "medium":
        return 0xffcc00; // Yellow
      case "low":
        return 0x00cc00; // Green
      default:
        return 0x808080; // Gray
    }
  }

  /**
   * Generate signature for webhook verification
   */
  private generateSignature(payload: any): string {
    const crypto = require("crypto");
    const secret = process.env.WEBHOOK_SECRET || "walletshield-secret";
    return crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(notification: NotificationPayload): Promise<void> {
    try {
      await pool.executeQuery(
        `UPDATE notification_queue SET
          status = $2,
          attempts = $3,
          last_attempt_at = $4,
          delivered_at = $5,
          error = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1`,
        [
          notification.notificationId,
          notification.status,
          notification.attempts,
          notification.lastAttemptAt,
          notification.deliveredAt,
          notification.error,
        ]
      );
    } catch (error) {
      console.error("Error updating notification status:", error);
    }
  }

  /**
   * Create alert subscription
   */
  async createSubscription(
    walletAddress: string,
    channels: AlertChannels,
    options?: {
      userId?: string;
      severityFilter?: ("low" | "medium" | "high" | "critical")[];
      alertTypes?: string[];
    }
  ): Promise<AlertSubscription> {
    const subscriptionId = uuidv4();

    const subscription: AlertSubscription = {
      subscriptionId,
      walletAddress,
      userId: options?.userId,
      channels,
      severityFilter: options?.severityFilter || ["medium", "high", "critical"],
      alertTypes: options?.alertTypes || [],
      isActive: true,
      createdAt: new Date(),
    };

    await pool.executeQuery(
      `INSERT INTO alert_subscriptions (
        subscription_id, wallet_address, user_id, channels,
        severity_filter, alert_types, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (wallet_address) DO UPDATE SET
        channels = EXCLUDED.channels,
        severity_filter = EXCLUDED.severity_filter,
        alert_types = EXCLUDED.alert_types,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP`,
      [
        subscriptionId,
        walletAddress,
        options?.userId,
        JSON.stringify(channels),
        subscription.severityFilter,
        subscription.alertTypes,
        true,
      ]
    );

    return subscription;
  }

  /**
   * Get subscription for a wallet
   */
  async getSubscription(walletAddress: string): Promise<AlertSubscription | null> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM alert_subscriptions WHERE wallet_address = $1 AND is_active = true`,
        [walletAddress]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        subscriptionId: row.subscription_id,
        walletAddress: row.wallet_address,
        userId: row.user_id,
        channels: row.channels,
        severityFilter: row.severity_filter,
        alertTypes: row.alert_types || [],
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error("Error getting subscription:", error);
      return null;
    }
  }

  /**
   * Deactivate subscription
   */
  async deactivateSubscription(walletAddress: string): Promise<void> {
    await pool.executeQuery(
      `UPDATE alert_subscriptions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE wallet_address = $1`,
      [walletAddress]
    );
  }

  /**
   * Send bulk alerts for a wallet compromise
   */
  async sendCompromiseNotifications(
    walletAddress: string,
    alerts: CompromiseAlert[]
  ): Promise<void> {
    // Get subscription
    const subscription = await this.getSubscription(walletAddress);
    if (!subscription) return;

    // Filter alerts by subscription preferences
    const filteredAlerts = alerts.filter((alert) => {
      if (!subscription.severityFilter.includes(alert.severity)) return false;
      if (
        subscription.alertTypes.length > 0 &&
        !subscription.alertTypes.includes(alert.alertType)
      ) {
        return false;
      }
      return true;
    });

    // Send notifications for each alert
    for (const alert of filteredAlerts) {
      await this.sendAlert(alert, subscription.channels);
    }
  }

  /**
   * Get notification history for a wallet
   */
  async getNotificationHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<NotificationPayload[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM notification_queue
         WHERE wallet_address = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [walletAddress, limit]
      );

      return result.rows.map((row) => ({
        notificationId: row.notification_id,
        alertId: row.alert_id,
        walletAddress: row.wallet_address,
        channel: row.channel,
        destination: row.destination,
        title: row.title,
        message: row.message,
        severity: row.severity,
        metadata: row.metadata,
        status: row.status,
        attempts: row.attempts,
        lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
        deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
        error: row.error,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error("Error getting notification history:", error);
      return [];
    }
  }

  /**
   * Get pending notifications count
   */
  async getPendingCount(): Promise<number> {
    try {
      const result = await pool.executeQuery(
        `SELECT COUNT(*) as count FROM notification_queue WHERE status IN ('pending', 'retrying')`
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting pending count:", error);
      return 0;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailed(walletAddress?: string): Promise<number> {
    try {
      let query = `SELECT * FROM notification_queue WHERE status = 'failed' AND attempts < $1`;
      const params: any[] = [NOTIFICATION_CONFIG.retryAttempts + 1];

      if (walletAddress) {
        query += ` AND wallet_address = $2`;
        params.push(walletAddress);
      }

      const result = await pool.executeQuery(query, params);
      let retriedCount = 0;

      for (const row of result.rows) {
        const notification: NotificationPayload = {
          notificationId: row.notification_id,
          alertId: row.alert_id,
          walletAddress: row.wallet_address,
          channel: row.channel,
          destination: row.destination,
          title: row.title,
          message: row.message,
          severity: row.severity,
          metadata: row.metadata,
          status: "pending",
          attempts: row.attempts,
          createdAt: new Date(row.created_at),
        };

        this.notificationQueue.push(notification);
        retriedCount++;
      }

      return retriedCount;
    } catch (error) {
      console.error("Error retrying failed notifications:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const alertManager = new AlertManager();
export default alertManager;
