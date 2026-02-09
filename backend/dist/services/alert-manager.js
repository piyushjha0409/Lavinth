"use strict";
/**
 * Alert Manager Service
 *
 * Manages alert notifications across multiple channels (webhook, Discord, email).
 * Part of WalletShield Recovery - Phase 2
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertManager = exports.AlertManager = void 0;
const dotenv = __importStar(require("dotenv"));
const events_1 = require("events");
const logger_1 = __importDefault(require("../logger"));
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../db/config"));
dotenv.config();
// Timeout helper for outbound requests
const WEBHOOK_TIMEOUT_MS = 10000; // 10s for webhook/discord deliveries
function fetchWithTimeout(url, options = {}) {
    const { timeoutMs = WEBHOOK_TIMEOUT_MS } = options, fetchOptions = __rest(options, ["timeoutMs"]);
    return fetch(url, Object.assign(Object.assign({}, fetchOptions), { signal: AbortSignal.timeout(timeoutMs) }));
}
// Notification configuration
const NOTIFICATION_CONFIG = {
    retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || "3"),
    retryDelayMs: parseInt(process.env.NOTIFICATION_RETRY_DELAY || "1000"),
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || "10"),
    rateLimitPerMinute: parseInt(process.env.NOTIFICATION_RATE_LIMIT || "60"),
};
/**
 * AlertManager class
 * Handles sending notifications across multiple channels
 */
class AlertManager {
    constructor() {
        this.notificationQueue = [];
        this.processing = false;
        this.rateLimitCounter = 0;
        this.rateLimitResetTime = Date.now();
        this.startQueueProcessor();
    }
    /**
     * Send alert notifications to all configured channels
     */
    sendAlert(alert, channels) {
        return __awaiter(this, void 0, void 0, function* () {
            const notifications = [];
            // Create notification for each channel
            if (channels.webhook) {
                notifications.push(this.createNotification(alert, "webhook", channels.webhook));
            }
            if (channels.discord) {
                notifications.push(this.createNotification(alert, "discord", channels.discord));
            }
            // Add to queue
            for (const notification of notifications) {
                yield this.queueNotification(notification);
            }
            // Emit event for SSE subscribers
            AlertManager.events.emit('alert', {
                alertId: alert.alertId,
                walletAddress: alert.walletAddress,
                severity: alert.severity,
                title: alert.title,
            });
        });
    }
    /**
     * Create a notification payload
     */
    createNotification(alert, channel, destination) {
        return {
            notificationId: (0, uuid_1.v4)(),
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
    queueNotification(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            // Store in database
            yield config_1.default.executeQuery(`INSERT INTO notification_queue (
        notification_id, alert_id, wallet_address, channel, destination,
        title, message, severity, metadata, status, attempts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
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
            ]);
            // Add to in-memory queue
            this.notificationQueue.push(notification);
        });
    }
    /**
     * Start the queue processor
     */
    startQueueProcessor() {
        setInterval(() => this.processQueue(), 1000);
    }
    /**
     * Process notification queue
     */
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.processing || this.notificationQueue.length === 0)
                return;
            // Check rate limit
            if (!this.checkRateLimit())
                return;
            this.processing = true;
            try {
                const batch = this.notificationQueue.splice(0, NOTIFICATION_CONFIG.batchSize);
                for (const notification of batch) {
                    yield this.sendNotification(notification);
                }
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'AlertManager' }, 'Error processing notification queue');
            }
            finally {
                this.processing = false;
            }
        });
    }
    /**
     * Check rate limit
     */
    checkRateLimit() {
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
    sendNotification(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            notification.attempts++;
            notification.lastAttemptAt = new Date();
            notification.status = "sending";
            try {
                switch (notification.channel) {
                    case "webhook":
                        yield this.sendWebhook(notification);
                        break;
                    case "discord":
                        yield this.sendDiscord(notification);
                        break;
                    default:
                        throw new Error(`Unknown channel: ${notification.channel}`);
                }
                notification.status = "delivered";
                notification.deliveredAt = new Date();
                yield this.updateNotificationStatus(notification);
            }
            catch (error) {
                notification.error = error.message;
                if (notification.attempts < NOTIFICATION_CONFIG.retryAttempts) {
                    notification.status = "retrying";
                    // Re-queue for retry
                    setTimeout(() => {
                        this.notificationQueue.push(notification);
                    }, NOTIFICATION_CONFIG.retryDelayMs * notification.attempts);
                }
                else {
                    notification.status = "failed";
                }
                yield this.updateNotificationStatus(notification);
            }
        });
    }
    /**
     * Send webhook notification
     */
    sendWebhook(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const payload = {
                event: "wallet.alert",
                timestamp: new Date().toISOString(),
                alert: {
                    id: notification.alertId,
                    type: ((_a = notification.metadata) === null || _a === void 0 ? void 0 : _a.alertType) || "unknown",
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
            const response = yield fetchWithTimeout(notification.destination, {
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
        });
    }
    /**
     * Send Discord notification
     */
    sendDiscord(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            const color = this.getSeverityColor(notification.severity);
            const embed = {
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
            const response = yield fetchWithTimeout(notification.destination, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ embeds: [embed] }),
            });
            if (!response.ok) {
                throw new Error(`Discord webhook failed: ${response.status}`);
            }
        });
    }
    /**
     * Get Discord embed color based on severity
     */
    getSeverityColor(severity) {
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
    generateSignature(payload) {
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
    updateNotificationStatus(notification) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.default.executeQuery(`UPDATE notification_queue SET
          status = $2,
          attempts = $3,
          last_attempt_at = $4,
          delivered_at = $5,
          error = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1`, [
                    notification.notificationId,
                    notification.status,
                    notification.attempts,
                    notification.lastAttemptAt,
                    notification.deliveredAt,
                    notification.error,
                ]);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'AlertManager' }, 'Error updating notification status');
            }
        });
    }
    /**
     * Create alert subscription
     */
    createSubscription(walletAddress, channels, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscriptionId = (0, uuid_1.v4)();
            const subscription = {
                subscriptionId,
                walletAddress,
                userId: options === null || options === void 0 ? void 0 : options.userId,
                channels,
                severityFilter: (options === null || options === void 0 ? void 0 : options.severityFilter) || ["medium", "high", "critical"],
                alertTypes: (options === null || options === void 0 ? void 0 : options.alertTypes) || [],
                isActive: true,
                createdAt: new Date(),
            };
            yield config_1.default.executeQuery(`INSERT INTO alert_subscriptions (
        subscription_id, wallet_address, user_id, channels,
        severity_filter, alert_types, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (wallet_address) DO UPDATE SET
        channels = EXCLUDED.channels,
        severity_filter = EXCLUDED.severity_filter,
        alert_types = EXCLUDED.alert_types,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP`, [
                subscriptionId,
                walletAddress,
                options === null || options === void 0 ? void 0 : options.userId,
                JSON.stringify(channels),
                subscription.severityFilter,
                subscription.alertTypes,
                true,
            ]);
            return subscription;
        });
    }
    /**
     * Get subscription for a wallet
     */
    getSubscription(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM alert_subscriptions WHERE wallet_address = $1 AND is_active = true`, [walletAddress]);
                if (result.rows.length === 0)
                    return null;
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'AlertManager' }, 'Error getting subscription');
                return null;
            }
        });
    }
    /**
     * Deactivate subscription
     */
    deactivateSubscription(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            yield config_1.default.executeQuery(`UPDATE alert_subscriptions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE wallet_address = $1`, [walletAddress]);
        });
    }
    /**
     * Send bulk alerts for a wallet compromise
     */
    sendCompromiseNotifications(walletAddress, alerts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get subscription
            const subscription = yield this.getSubscription(walletAddress);
            if (!subscription)
                return;
            // Filter alerts by subscription preferences
            const filteredAlerts = alerts.filter((alert) => {
                if (!subscription.severityFilter.includes(alert.severity))
                    return false;
                if (subscription.alertTypes.length > 0 &&
                    !subscription.alertTypes.includes(alert.alertType)) {
                    return false;
                }
                return true;
            });
            // Send notifications for each alert
            for (const alert of filteredAlerts) {
                yield this.sendAlert(alert, subscription.channels);
            }
        });
    }
    /**
     * Get notification history for a wallet
     */
    getNotificationHistory(walletAddress_1) {
        return __awaiter(this, arguments, void 0, function* (walletAddress, limit = 50) {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM notification_queue
         WHERE wallet_address = $1
         ORDER BY created_at DESC
         LIMIT $2`, [walletAddress, limit]);
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'AlertManager' }, 'Error getting notification history');
                return [];
            }
        });
    }
    /**
     * Get pending notifications count
     */
    getPendingCount() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT COUNT(*) as count FROM notification_queue WHERE status IN ('pending', 'retrying')`);
                return parseInt(result.rows[0].count);
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'AlertManager' }, 'Error getting pending count');
                return 0;
            }
        });
    }
    /**
     * Retry failed notifications
     */
    retryFailed(walletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let query = `SELECT * FROM notification_queue WHERE status = 'failed' AND attempts < $1`;
                const params = [NOTIFICATION_CONFIG.retryAttempts + 1];
                if (walletAddress) {
                    query += ` AND wallet_address = $2`;
                    params.push(walletAddress);
                }
                const result = yield config_1.default.executeQuery(query, params);
                let retriedCount = 0;
                for (const row of result.rows) {
                    const notification = {
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
            }
            catch (error) {
                logger_1.default.error({ err: error, source: 'AlertManager' }, 'Error retrying failed notifications');
                return 0;
            }
        });
    }
}
exports.AlertManager = AlertManager;
AlertManager.events = new events_1.EventEmitter();
// Export singleton instance
exports.alertManager = new AlertManager();
exports.default = exports.alertManager;
