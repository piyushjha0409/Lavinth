"use strict";
/**
 * Real-time Monitoring and Alerting System for Dust Attacks
 * This module provides continuous monitoring and alerts for potential dusting attacks
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DustingAlertSystem = void 0;
const db_utils_1 = __importDefault(require("./db/db-utils"));
const discord_js_1 = require("discord.js");
const nodemailer_1 = __importDefault(require("nodemailer"));
class DustingAlertSystem {
    constructor(config) {
        this.isRunning = false;
        this.lastAlertTimestamps = new Map();
        // Default configuration
        this.config = {
            enabled: true,
            channels: {},
            thresholds: {
                newAttackerRiskScore: 0.7,
                newVictimRiskScore: 0.5,
                attackerActivitySpike: 3, // 3x normal activity
                victimExposureLevel: 0.8,
            }
        };
        // Apply custom configuration
        if (config) {
            this.config = Object.assign(Object.assign(Object.assign({}, this.config), config), { thresholds: Object.assign(Object.assign({}, this.config.thresholds), config.thresholds), channels: Object.assign(Object.assign({}, this.config.channels), config.channels) });
        }
        this.initializeChannels();
    }
    initializeChannels() {
        var _a, _b;
        // Initialize Discord webhook if configured
        if ((_a = this.config.channels.discord) === null || _a === void 0 ? void 0 : _a.webhookUrl) {
            try {
                this.discordWebhook = new discord_js_1.WebhookClient({ url: this.config.channels.discord.webhookUrl });
                console.log('Discord webhook initialized');
            }
            catch (error) {
                console.error('Error initializing Discord webhook:', error);
            }
        }
        // Initialize email transporter if configured
        if ((_b = this.config.channels.email) === null || _b === void 0 ? void 0 : _b.smtpConfig) {
            try {
                this.emailTransporter = nodemailer_1.default.createTransport(this.config.channels.email.smtpConfig);
                console.log('Email transporter initialized');
            }
            catch (error) {
                console.error('Error initializing email transporter:', error);
            }
        }
    }
    /**
     * Start continuous monitoring for dust attacks
     */
    monitorInRealTime() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log('Monitoring is already running');
                return;
            }
            this.isRunning = true;
            console.log('Starting real-time dust attack monitoring');
            // Set up continuous monitoring
            while (this.isRunning) {
                try {
                    yield this.checkForNewThreats();
                    yield new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
                }
                catch (error) {
                    console.error('Error in monitoring loop:', error);
                    yield new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds on error
                }
            }
        });
    }
    /**
     * Stop the monitoring process
     */
    stopMonitoring() {
        this.isRunning = false;
        console.log('Stopping real-time dust attack monitoring');
    }
    /**
     * Check for new high-risk attackers and victims
     */
    checkForNewThreats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            // Check for new high-risk attackers
            try {
                const newHighRiskAttackers = yield db_utils_1.default.getDustingAttackers(this.config.thresholds.newAttackerRiskScore);
                // Filter to only get attackers we haven't alerted about recently (last 24 hours)
                const recentAttackers = newHighRiskAttackers.rows.filter(attacker => {
                    const lastAlertTime = this.lastAlertTimestamps.get(`attacker_${attacker.address}`) || 0;
                    return (now - lastAlertTime) > 86400000; // 24 hours
                });
                if (recentAttackers.length > 0) {
                    yield this.sendAlert('new_high_risk_attackers', recentAttackers);
                    // Update last alert timestamps
                    recentAttackers.forEach(attacker => {
                        this.lastAlertTimestamps.set(`attacker_${attacker.address}`, now);
                    });
                }
            }
            catch (error) {
                console.error('Error checking for new high-risk attackers:', error);
            }
            // Check for new potential victims
            try {
                const newHighRiskVictims = yield db_utils_1.default.getDustingVictims(this.config.thresholds.newVictimRiskScore);
                // Filter to only get victims we haven't alerted about recently (last 24 hours)
                const recentVictims = newHighRiskVictims.rows.filter(victim => {
                    const lastAlertTime = this.lastAlertTimestamps.get(`victim_${victim.address}`) || 0;
                    return (now - lastAlertTime) > 86400000; // 24 hours
                });
                if (recentVictims.length > 0) {
                    yield this.sendAlert('new_high_risk_victims', recentVictims);
                    // Update last alert timestamps
                    recentVictims.forEach(victim => {
                        this.lastAlertTimestamps.set(`victim_${victim.address}`, now);
                    });
                }
            }
            catch (error) {
                console.error('Error checking for new high-risk victims:', error);
            }
            // Check for activity spikes (sudden increase in dusting transactions)
            try {
                const recentActivityResult = yield db_utils_1.default.query(`SELECT COUNT(*) as count FROM dust_transactions 
         WHERE is_potential_dust = true AND timestamp > NOW() - INTERVAL '1 hour'`);
                const previousActivityResult = yield db_utils_1.default.query(`SELECT COUNT(*) as count FROM dust_transactions 
         WHERE is_potential_dust = true AND 
         timestamp > NOW() - INTERVAL '25 hours' AND 
         timestamp < NOW() - INTERVAL '1 hour'`);
                const recentCount = parseInt(recentActivityResult.rows[0].count);
                const previousCount = parseInt(previousActivityResult.rows[0].count) / 24; // Average hourly count
                if (previousCount > 0 && (recentCount / previousCount) >= this.config.thresholds.attackerActivitySpike) {
                    yield this.sendAlert('activity_spike', {
                        recentCount,
                        previousAvgCount: previousCount,
                        spikeRatio: recentCount / previousCount
                    });
                }
            }
            catch (error) {
                console.error('Error checking for activity spikes:', error);
            }
        });
    }
    /**
     * Send an alert through configured channels
     */
    sendAlert(type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.config.enabled)
                return;
            console.log(`Sending alert: ${type}`);
            // Format alert message based on type
            const message = this.formatAlertMessage(type, data);
            // Send to Discord if configured
            if (this.discordWebhook) {
                try {
                    yield this.discordWebhook.send({
                        content: message.title,
                        embeds: [{
                                title: message.title,
                                description: message.description,
                                color: message.color,
                                fields: message.fields,
                                timestamp: new Date().toISOString()
                            }]
                    });
                    console.log('Alert sent to Discord');
                }
                catch (error) {
                    console.error('Error sending Discord alert:', error);
                }
            }
            // Send email if configured
            if (this.emailTransporter && ((_a = this.config.channels.email) === null || _a === void 0 ? void 0 : _a.recipients)) {
                try {
                    yield this.emailTransporter.sendMail({
                        from: '"Solana Dust Detector" <dust-detector@example.com>',
                        to: this.config.channels.email.recipients.join(', '),
                        subject: `Dust Attack Alert: ${message.title}`,
                        html: `
            <h1>${message.title}</h1>
            <p>${message.description}</p>
            <div>
              ${message.fields.map(field => `
                <h3>${field.name}</h3>
                <p>${field.value}</p>
              `).join('')}
            </div>
            <p><em>Generated at ${new Date().toISOString()}</em></p>
          `
                    });
                    console.log('Alert sent via email');
                }
                catch (error) {
                    console.error('Error sending email alert:', error);
                }
            }
            // SMS alerts could be implemented here
        });
    }
    /**
     * Format alert message based on alert type
     */
    formatAlertMessage(type, data) {
        switch (type) {
            case 'new_high_risk_attackers':
                return {
                    title: '🚨 New High-Risk Dusting Attackers Detected',
                    description: `Detected ${data.length} new high-risk dusting attackers.`,
                    color: 0xFF0000, // Red
                    fields: data.slice(0, 10).map((attacker) => ({
                        name: `Attacker: ${attacker.address.substring(0, 8)}...${attacker.address.substring(attacker.address.length - 8)}`,
                        value: `Risk Score: ${(attacker.risk_score * 100).toFixed(1)}%\nVictims: ${attacker.unique_victims_count}\nTransfers: ${attacker.small_transfers_count}`,
                        inline: true
                    }))
                };
            case 'new_high_risk_victims':
                return {
                    title: '⚠️ New Potential Dusting Victims Detected',
                    description: `Detected ${data.length} new potential dusting victims.`,
                    color: 0xFFAA00, // Orange
                    fields: data.slice(0, 10).map((victim) => ({
                        name: `Victim: ${victim.address.substring(0, 8)}...${victim.address.substring(victim.address.length - 8)}`,
                        value: `Risk Score: ${(victim.risk_score * 100).toFixed(1)}%\nAttackers: ${victim.unique_attackers_count}\nDust Txs: ${victim.dust_transactions_count}`,
                        inline: true
                    }))
                };
            case 'activity_spike':
                return {
                    title: '🔥 Dust Attack Activity Spike Detected',
                    description: 'Unusual increase in dusting activity detected in the last hour.',
                    color: 0xFF5500, // Red-orange
                    fields: [
                        {
                            name: 'Recent Activity',
                            value: `${data.recentCount} dust transactions in the last hour`,
                            inline: true
                        },
                        {
                            name: 'Normal Activity',
                            value: `${data.previousAvgCount.toFixed(1)} dust transactions per hour (avg)`,
                            inline: true
                        },
                        {
                            name: 'Increase Factor',
                            value: `${data.spikeRatio.toFixed(1)}x normal activity`,
                            inline: true
                        }
                    ]
                };
            default:
                return {
                    title: 'Dust Attack Alert',
                    description: 'A potential dust attack has been detected.',
                    color: 0x5555FF, // Blue
                    fields: [{ name: 'Details', value: JSON.stringify(data, null, 2) }]
                };
        }
    }
}
exports.DustingAlertSystem = DustingAlertSystem;
