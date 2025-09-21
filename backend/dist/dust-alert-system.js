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
        this.config = {
            enabled: true,
            channels: {},
            thresholds: {
                newAttackerRiskScore: 0.7,
                newVictimRiskScore: 0.5,
                attackerActivitySpike: 3,
                victimExposureLevel: 0.8,
            },
        };
        if (config) {
            this.config = Object.assign(Object.assign(Object.assign({}, this.config), config), { thresholds: Object.assign(Object.assign({}, this.config.thresholds), config.thresholds), channels: Object.assign(Object.assign({}, this.config.channels), config.channels) });
        }
        this.initializeChannels();
    }
    initializeChannels() {
        var _a, _b;
        if ((_a = this.config.channels.discord) === null || _a === void 0 ? void 0 : _a.webhookUrl) {
            try {
                this.discordWebhook = new discord_js_1.WebhookClient({
                    url: this.config.channels.discord.webhookUrl,
                });
                console.log("Discord webhook initialized");
            }
            catch (error) {
                console.error("Error initializing Discord webhook:", error);
            }
        }
        if ((_b = this.config.channels.email) === null || _b === void 0 ? void 0 : _b.smtpConfig) {
            try {
                this.emailTransporter = nodemailer_1.default.createTransport(this.config.channels.email.smtpConfig);
                console.log("Email transporter initialized");
            }
            catch (error) {
                console.error("Error initializing email transporter:", error);
            }
        }
    }
    monitorInRealTime() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log("Monitoring is already running");
                return;
            }
            this.isRunning = true;
            console.log("Starting real-time dust attack monitoring");
            while (this.isRunning) {
                try {
                    yield this.checkForNewThreats();
                    yield new Promise((resolve) => setTimeout(resolve, 60000));
                }
                catch (error) {
                    console.error("Error in monitoring loop:", error);
                    yield new Promise((resolve) => setTimeout(resolve, 30000));
                }
            }
        });
    }
    stopMonitoring() {
        this.isRunning = false;
        console.log("Stopping real-time dust attack monitoring");
    }
    checkForNewThreats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            try {
                // Enhanced attacker detection with confidence scoring
                const attackerAnalysis = yield this.analyzeNewAttackers();
                if (attackerAnalysis.highConfidenceAttackers.length > 0) {
                    yield this.sendEnhancedAlert("new_high_risk_attackers", attackerAnalysis);
                    attackerAnalysis.highConfidenceAttackers.forEach((attacker) => {
                        this.lastAlertTimestamps.set(`attacker_${attacker.address}`, now);
                    });
                }
            }
            catch (error) {
                console.error("Error checking for new high-risk attackers:", error);
            }
            try {
                // Enhanced victim detection with pattern analysis
                const victimAnalysis = yield this.analyzeNewVictims();
                if (victimAnalysis.highRiskVictims.length > 0) {
                    yield this.sendEnhancedAlert("new_high_risk_victims", victimAnalysis);
                    victimAnalysis.highRiskVictims.forEach((victim) => {
                        this.lastAlertTimestamps.set(`victim_${victim.address}`, now);
                    });
                }
            }
            catch (error) {
                console.error("Error checking for new high-risk victims:", error);
            }
            try {
                // Enhanced activity spike detection with context
                const activityAnalysis = yield this.analyzeActivityPatterns();
                if (activityAnalysis.isSignificantSpike) {
                    yield this.sendEnhancedAlert("activity_spike", activityAnalysis);
                }
            }
            catch (error) {
                console.error("Error checking for activity spikes:", error);
            }
            try {
                // New: Coordinated attack detection
                const coordinatedAttack = yield this.detectCoordinatedAttacks();
                if (coordinatedAttack.detected) {
                    yield this.sendEnhancedAlert("coordinated_attack", coordinatedAttack);
                }
            }
            catch (error) {
                console.error("Error checking for coordinated attacks:", error);
            }
            try {
                // New: Address poisoning campaign detection
                const poisoningCampaign = yield this.detectPoisoningCampaigns();
                if (poisoningCampaign.detected) {
                    yield this.sendEnhancedAlert("poisoning_campaign", poisoningCampaign);
                }
            }
            catch (error) {
                console.error("Error checking for poisoning campaigns:", error);
            }
        });
    }
    /**
     * Analyze new attackers with enhanced confidence scoring
     */
    analyzeNewAttackers() {
        return __awaiter(this, void 0, void 0, function* () {
            const attackers = yield db_utils_1.default.getDustingAttackers(this.config.thresholds.newAttackerRiskScore);
            const now = Date.now();
            const analyzedAttackers = [];
            for (const attacker of attackers.rows) {
                const lastAlertTime = this.lastAlertTimestamps.get(`attacker_${attacker.address}`) || 0;
                // Skip if alerted recently
                if (now - lastAlertTime <= 86400000)
                    continue;
                // Enhanced confidence analysis
                const confidence = yield this.calculateAttackerConfidence(attacker);
                const patternAnalysis = yield this.analyzeAttackerPatterns(attacker);
                analyzedAttackers.push(Object.assign(Object.assign({}, attacker), { confidence,
                    patternAnalysis, alertPriority: this.calculateAlertPriority(confidence, patternAnalysis) }));
            }
            // Sort by confidence and filter
            analyzedAttackers.sort((a, b) => b.confidence - a.confidence);
            const highConfidenceAttackers = analyzedAttackers.filter((a) => a.confidence >= 0.8);
            const mediumConfidenceAttackers = analyzedAttackers.filter((a) => a.confidence >= 0.6 && a.confidence < 0.8);
            return {
                highConfidenceAttackers,
                mediumConfidenceAttackers,
                totalAnalyzed: analyzedAttackers.length,
            };
        });
    }
    /**
     * Calculate attacker confidence based on multiple factors
     */
    calculateAttackerConfidence(attacker) {
        return __awaiter(this, void 0, void 0, function* () {
            let confidence = attacker.risk_score || 0;
            try {
                // Factor 1: Transaction pattern consistency
                const patternResult = yield db_utils_1.default.pool.query(`
        SELECT 
          COUNT(*) as total_txs,
          COUNT(DISTINCT recipient) as unique_recipients,
          AVG(amount) as avg_amount,
          STDDEV(amount) as amount_stddev
        FROM dust_transactions 
        WHERE sender = $1 AND timestamp > NOW() - INTERVAL '24 hours'
      `, [attacker.address]);
                const pattern = patternResult.rows[0];
                // High recipient count increases confidence
                if (pattern.unique_recipients > 20)
                    confidence += 0.2;
                else if (pattern.unique_recipients > 10)
                    confidence += 0.1;
                // Consistent small amounts increase confidence
                const avgAmount = parseFloat(pattern.avg_amount || "0");
                const stddev = parseFloat(pattern.amount_stddev || "0");
                if (avgAmount > 0 && stddev / avgAmount < 0.3)
                    confidence += 0.15; // Low variance
                // Factor 2: Timing patterns
                const timingResult = yield db_utils_1.default.pool.query(`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as tx_count
        FROM dust_transactions 
        WHERE sender = $1 AND timestamp > NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY tx_count DESC
      `, [attacker.address]);
                // Concentrated activity in specific hours suggests automation
                if (timingResult.rows.length > 0) {
                    const topHour = timingResult.rows[0];
                    const totalTxs = timingResult.rows.reduce((sum, row) => sum + parseInt(row.tx_count), 0);
                    const concentration = parseInt(topHour.tx_count) / totalTxs;
                    if (concentration > 0.5)
                        confidence += 0.1; // High concentration
                }
            }
            catch (error) {
                console.error("Error calculating attacker confidence:", error);
            }
            return Math.min(1, confidence);
        });
    }
    /**
     * Analyze attacker patterns for additional context
     */
    analyzeAttackerPatterns(attacker) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_utils_1.default.pool.query(`
        SELECT 
          COUNT(*) as total_txs,
          COUNT(DISTINCT recipient) as unique_recipients,
          MIN(timestamp) as first_tx,
          MAX(timestamp) as last_tx,
          AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_interval
        FROM dust_transactions 
        WHERE sender = $1 AND timestamp > NOW() - INTERVAL '24 hours'
      `, [attacker.address]);
                const data = result.rows[0];
                const totalTxs = parseInt(data.total_txs);
                const uniqueRecipients = parseInt(data.unique_recipients);
                const avgInterval = parseFloat(data.avg_interval || "0");
                // Determine if automated (very regular intervals)
                const isAutomated = avgInterval > 0 && avgInterval < 60; // Less than 1 minute intervals
                // Determine targeting pattern
                let targetingPattern = "random";
                if (uniqueRecipients / totalTxs > 0.8)
                    targetingPattern = "spray"; // Mostly unique recipients
                else if (uniqueRecipients / totalTxs < 0.3)
                    targetingPattern = "focused"; // Repeated targets
                // Determine risk level
                let riskLevel = "low";
                if (totalTxs > 100 && isAutomated)
                    riskLevel = "critical";
                else if (totalTxs > 50 || (totalTxs > 20 && isAutomated))
                    riskLevel = "high";
                else if (totalTxs > 10)
                    riskLevel = "medium";
                return { isAutomated, targetingPattern, riskLevel };
            }
            catch (error) {
                console.error("Error analyzing attacker patterns:", error);
                return {
                    isAutomated: false,
                    targetingPattern: "unknown",
                    riskLevel: "low",
                };
            }
        });
    }
    /**
     * Calculate alert priority based on confidence and patterns
     */
    calculateAlertPriority(confidence, patterns) {
        if (confidence >= 0.9 && patterns.riskLevel === "critical")
            return "critical";
        if (confidence >= 0.8 && patterns.riskLevel === "high")
            return "high";
        if (confidence >= 0.7 || patterns.riskLevel === "medium")
            return "medium";
        return "low";
    }
    /**
     * Analyze new victims with enhanced detection
     */
    analyzeNewVictims() {
        return __awaiter(this, void 0, void 0, function* () {
            const victims = yield db_utils_1.default.getDustingVictims(this.config.thresholds.newVictimRiskScore);
            const now = Date.now();
            const analyzedVictims = [];
            for (const victim of victims.rows) {
                const lastAlertTime = this.lastAlertTimestamps.get(`victim_${victim.address}`) || 0;
                // Skip if alerted recently
                if (now - lastAlertTime <= 86400000)
                    continue;
                // Enhanced victim analysis
                const riskAssessment = yield this.assessVictimRisk(victim);
                analyzedVictims.push(Object.assign(Object.assign({}, victim), { riskAssessment, alertPriority: riskAssessment.riskLevel }));
            }
            const highRiskVictims = analyzedVictims.filter((v) => v.riskAssessment.riskLevel === "high" ||
                v.riskAssessment.riskLevel === "critical");
            const mediumRiskVictims = analyzedVictims.filter((v) => v.riskAssessment.riskLevel === "medium");
            return {
                highRiskVictims,
                mediumRiskVictims,
                totalAnalyzed: analyzedVictims.length,
            };
        });
    }
    /**
     * Assess victim risk with multiple factors
     */
    assessVictimRisk(victim) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_utils_1.default.pool.query(`
        SELECT 
          COUNT(DISTINCT sender) as attacker_count,
          COUNT(*) as total_dust_txs,
          MAX(timestamp) as last_dust_tx,
          SUM(amount) as total_dust_amount
        FROM dust_transactions 
        WHERE recipient = $1 
          AND is_potential_dust = true 
          AND timestamp > NOW() - INTERVAL '7 days'
      `, [victim.address]);
                const data = result.rows[0];
                const attackerCount = parseInt(data.attacker_count);
                const totalDustTxs = parseInt(data.total_dust_txs);
                const lastDustTx = new Date(data.last_dust_tx);
                const recentActivity = Date.now() - lastDustTx.getTime() < 3600000; // Within 1 hour
                // Calculate exposure score
                let exposureScore = 0;
                if (attackerCount > 10)
                    exposureScore += 0.4;
                else if (attackerCount > 5)
                    exposureScore += 0.2;
                if (totalDustTxs > 50)
                    exposureScore += 0.3;
                else if (totalDustTxs > 20)
                    exposureScore += 0.2;
                if (recentActivity)
                    exposureScore += 0.3;
                // Determine risk level
                let riskLevel = "low";
                if (exposureScore >= 0.8)
                    riskLevel = "critical";
                else if (exposureScore >= 0.6)
                    riskLevel = "high";
                else if (exposureScore >= 0.4)
                    riskLevel = "medium";
                return { riskLevel, attackerCount, recentActivity, exposureScore };
            }
            catch (error) {
                console.error("Error assessing victim risk:", error);
                return {
                    riskLevel: "low",
                    attackerCount: 0,
                    recentActivity: false,
                    exposureScore: 0,
                };
            }
        });
    }
    /**
     * Analyze activity patterns with enhanced context
     */
    analyzeActivityPatterns() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recentResult = yield db_utils_1.default.pool.query(`
        SELECT COUNT(*) as count FROM dust_transactions 
        WHERE is_potential_dust = true AND timestamp > NOW() - INTERVAL '1 hour'
      `);
                const baselineResult = yield db_utils_1.default.pool.query(`
        SELECT AVG(hourly_count) as avg_count FROM (
          SELECT COUNT(*) as hourly_count
          FROM dust_transactions 
          WHERE is_potential_dust = true 
            AND timestamp > NOW() - INTERVAL '7 days'
            AND timestamp <= NOW() - INTERVAL '1 hour'
          GROUP BY DATE_TRUNC('hour', timestamp)
        ) hourly_stats
      `);
                const recentCount = parseInt(recentResult.rows[0].count);
                const baselineCount = parseFloat(baselineResult.rows[0].avg_count || "1");
                const spikeRatio = recentCount / baselineCount;
                // Enhanced spike detection with context
                const isSignificantSpike = spikeRatio >= this.config.thresholds.attackerActivitySpike &&
                    recentCount > 10; // Minimum threshold to avoid false positives
                // Determine context
                let context = "normal";
                if (spikeRatio > 10)
                    context = "massive_spike";
                else if (spikeRatio > 5)
                    context = "major_spike";
                else if (spikeRatio > 3)
                    context = "moderate_spike";
                return {
                    isSignificantSpike,
                    recentCount,
                    baselineCount,
                    spikeRatio,
                    context,
                };
            }
            catch (error) {
                console.error("Error analyzing activity patterns:", error);
                return {
                    isSignificantSpike: false,
                    recentCount: 0,
                    baselineCount: 1,
                    spikeRatio: 0,
                    context: "error",
                };
            }
        });
    }
    /**
     * Detect coordinated attacks across multiple addresses
     */
    detectCoordinatedAttacks() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Look for multiple addresses with similar patterns in the same time window
                const result = yield db_utils_1.default.pool.query(`
        WITH attacker_stats AS (
          SELECT 
            sender,
            COUNT(*) as tx_count,
            COUNT(DISTINCT recipient) as unique_recipients,
            MIN(timestamp) as first_tx,
            MAX(timestamp) as last_tx
          FROM dust_transactions 
          WHERE is_potential_dust = true 
            AND timestamp > NOW() - INTERVAL '2 hours'
          GROUP BY sender
          HAVING COUNT(*) > 5
        )
        SELECT 
          COUNT(*) as coordinated_attackers,
          AVG(tx_count) as avg_tx_count,
          AVG(unique_recipients) as avg_recipients
        FROM attacker_stats
        WHERE (last_tx - first_tx) < INTERVAL '30 minutes'
      `);
                const data = result.rows[0];
                const coordinatedAttackers = parseInt(data.coordinated_attackers || "0");
                const detected = coordinatedAttackers >= 3; // 3+ coordinated attackers
                const confidence = Math.min(1, coordinatedAttackers / 10); // Scale confidence
                return {
                    detected,
                    attackerGroups: [], // Would be populated with actual attacker data
                    confidence,
                };
            }
            catch (error) {
                console.error("Error detecting coordinated attacks:", error);
                return { detected: false, attackerGroups: [], confidence: 0 };
            }
        });
    }
    /**
     * Detect address poisoning campaigns
     */
    detectPoisoningCampaigns() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_utils_1.default.pool.query(`
        SELECT COUNT(*) as poisoning_count
        FROM dust_transactions 
        WHERE is_potential_poisoning = true 
          AND timestamp > NOW() - INTERVAL '1 hour'
      `);
                const poisoningCount = parseInt(result.rows[0].poisoning_count);
                const detected = poisoningCount > 10; // Threshold for campaign detection
                return {
                    detected,
                    campaignSize: poisoningCount,
                    similarityThreshold: 0.8,
                };
            }
            catch (error) {
                console.error("Error detecting poisoning campaigns:", error);
                return { detected: false, campaignSize: 0, similarityThreshold: 0 };
            }
        });
    }
    /**
     * Send enhanced alert with better formatting and context
     */
    sendEnhancedAlert(type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.enabled)
                return;
            console.log(`Sending enhanced alert: ${type}`);
            const message = this.formatEnhancedAlertMessage(type, data);
            // Send to all configured channels
            yield Promise.all([
                this.sendDiscordAlert(message),
                this.sendEmailAlert(message),
            ]);
        });
    }
    /**
     * Send Discord alert
     */
    sendDiscordAlert(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.discordWebhook)
                return;
            try {
                yield this.discordWebhook.send({
                    content: message.title,
                    embeds: [
                        {
                            title: message.title,
                            description: message.description,
                            color: message.color,
                            fields: message.fields,
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Lavinth Detection System | Confidence: ${message.confidence || "N/A"}`,
                            },
                        },
                    ],
                });
                console.log("Enhanced alert sent to Discord");
            }
            catch (error) {
                console.error("Error sending Discord alert:", error);
            }
        });
    }
    /**
     * Send email alert
     */
    sendEmailAlert(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.emailTransporter || !((_a = this.config.channels.email) === null || _a === void 0 ? void 0 : _a.recipients))
                return;
            try {
                yield this.emailTransporter.sendMail({
                    from: '"Lavinth Detection System" <alerts@lavinth.com>',
                    to: this.config.channels.email.recipients.join(", "),
                    subject: `[${((_b = message.priority) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || "ALERT"}] ${message.title}`,
                    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h1 style="color: ${message.color === 0xff0000 ? "#ff0000" : "#ffaa00"};">
              ${message.title}
            </h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${message.description}
            </p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
              ${message.fields
                        .map((field) => `
                <div style="margin-bottom: 10px;">
                  <strong>${field.name}:</strong> ${field.value}
                </div>
              `)
                        .join("")}
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Generated at ${new Date().toISOString()}<br>
              Confidence: ${message.confidence || "N/A"} | Priority: ${message.priority || "N/A"}
            </p>
          </div>
        `,
                });
                console.log("Enhanced alert sent via email");
            }
            catch (error) {
                console.error("Error sending email alert:", error);
            }
        });
    }
    /**
     * Format enhanced alert messages with better context
     */
    formatEnhancedAlertMessage(type, data) {
        switch (type) {
            case "new_high_risk_attackers":
                return {
                    title: "🚨 High-Confidence Dusting Attackers Detected",
                    description: `Detected ${data.highConfidenceAttackers.length} high-confidence attackers with enhanced pattern analysis.`,
                    color: 0xff0000,
                    priority: "high",
                    confidence: data.highConfidenceAttackers.length > 0
                        ? (data.highConfidenceAttackers.reduce((sum, a) => sum + a.confidence, 0) / data.highConfidenceAttackers.length).toFixed(2)
                        : "N/A",
                    fields: data.highConfidenceAttackers
                        .slice(0, 5)
                        .map((attacker) => ({
                        name: `⚠️ ${attacker.address.substring(0, 8)}...${attacker.address.substring(attacker.address.length - 8)}`,
                        value: `Risk: ${(attacker.risk_score * 100).toFixed(1)}% | Confidence: ${(attacker.confidence * 100).toFixed(1)}%\nVictims: ${attacker.unique_victims_count} | Pattern: ${attacker.patternAnalysis.targetingPattern}\nRisk Level: ${attacker.patternAnalysis.riskLevel.toUpperCase()} | Automated: ${attacker.patternAnalysis.isAutomated ? "Yes" : "No"}`,
                        inline: true,
                    })),
                };
            case "coordinated_attack":
                return {
                    title: "🔥 Coordinated Attack Campaign Detected",
                    description: `Multiple attackers operating in coordination detected with ${(data.confidence * 100).toFixed(1)}% confidence.`,
                    color: 0xff0000,
                    priority: "critical",
                    confidence: (data.confidence * 100).toFixed(1) + "%",
                    fields: [
                        {
                            name: "Campaign Details",
                            value: `Coordinated Attackers: ${data.attackerGroups.length}\nConfidence Level: ${(data.confidence * 100).toFixed(1)}%`,
                            inline: false,
                        },
                    ],
                };
            case "activity_spike":
                return {
                    title: `📈 ${data.context
                        .replace("_", " ")
                        .toUpperCase()} Activity Detected`,
                    description: `Unusual ${data.context.replace("_", " ")} in dusting activity detected.`,
                    color: data.spikeRatio > 10 ? 0xff0000 : 0xff5500,
                    priority: data.spikeRatio > 10 ? "critical" : "high",
                    confidence: Math.min(100, (data.spikeRatio / 10) * 100).toFixed(1) + "%",
                    fields: [
                        {
                            name: "Activity Metrics",
                            value: `Recent (1h): ${data.recentCount} transactions\nBaseline: ${data.baselineCount.toFixed(1)} transactions/hour\nSpike Ratio: ${data.spikeRatio.toFixed(1)}x normal`,
                            inline: false,
                        },
                    ],
                };
            default:
                return this.formatAlertMessage(type, data);
        }
    }
    /**
     * Legacy alert function - kept for backward compatibility
     * Use sendEnhancedAlert for new implementations
     */
    sendAlert(type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn(`Using legacy sendAlert function for type: ${type}. Consider upgrading to sendEnhancedAlert.`);
            yield this.sendEnhancedAlert(type, data);
        });
    }
    /**
     * Get real-time system statistics
     */
    getSystemStats() {
        const now = Date.now();
        const todayStart = new Date().setHours(0, 0, 0, 0);
        // Count alerts sent today
        const totalAlertsToday = Array.from(this.lastAlertTimestamps.values()).filter((timestamp) => timestamp > todayStart).length;
        // Get last alert time
        const lastAlertTime = Math.max(...Array.from(this.lastAlertTimestamps.values()), 0) || null;
        // Determine system health
        let systemHealth = "healthy";
        if (totalAlertsToday > 100)
            systemHealth = "critical";
        else if (totalAlertsToday > 50)
            systemHealth = "warning";
        return {
            isRunning: this.isRunning,
            totalAlertsToday,
            lastAlertTime,
            activeThreats: {
                highRiskAttackers: 0, // Would be populated from real-time data
                highRiskVictims: 0,
                coordinatedAttacks: 0,
            },
            systemHealth,
        };
    }
    /**
     * Update alert configuration dynamically
     */
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign(Object.assign({}, this.config), newConfig), { thresholds: Object.assign(Object.assign({}, this.config.thresholds), newConfig.thresholds), channels: Object.assign(Object.assign({}, this.config.channels), newConfig.channels) });
        // Reinitialize channels if needed
        this.initializeChannels();
        console.log("Alert system configuration updated:", this.config);
    }
    /**
     * Test alert system connectivity
     */
    testAlertSystem() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const results = {
                discord: { success: false, error: undefined },
                email: { success: false, error: undefined },
            };
            // Test Discord webhook
            if (this.discordWebhook) {
                try {
                    yield this.discordWebhook.send({
                        content: "🧪 Lavinth Alert System Test",
                        embeds: [
                            {
                                title: "Test Alert",
                                description: "This is a test message to verify Discord integration.",
                                color: 0x00ff00,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    });
                    results.discord.success = true;
                }
                catch (error) {
                    results.discord.error = error.message;
                }
            }
            // Test Email
            if (this.emailTransporter && ((_a = this.config.channels.email) === null || _a === void 0 ? void 0 : _a.recipients)) {
                try {
                    yield this.emailTransporter.sendMail({
                        from: '"Lavinth Detection System" <alerts@lavinth.com>',
                        to: this.config.channels.email.recipients[0], // Send to first recipient only for test
                        subject: "🧪 Lavinth Alert System Test",
                        html: `
            <h2>Test Alert</h2>
            <p>This is a test message to verify email integration.</p>
            <p><em>Generated at ${new Date().toISOString()}</em></p>
          `,
                    });
                    results.email.success = true;
                }
                catch (error) {
                    results.email.error = error.message;
                }
            }
            return results;
        });
    }
    /**
     * Get alert history and statistics
     */
    getAlertHistory() {
        return __awaiter(this, arguments, void 0, function* (hours = 24) {
            try {
                const result = yield db_utils_1.default.pool.query(`
        SELECT 
          alert_type,
          severity,
          timestamp,
          COUNT(*) as alert_count
        FROM system_alerts 
        WHERE timestamp > NOW() - INTERVAL '${hours} hours'
        GROUP BY alert_type, severity, DATE_TRUNC('hour', timestamp)
        ORDER BY timestamp DESC
      `);
                const alertsByType = {};
                const alertsByPriority = {};
                const timeline = [];
                let totalAlerts = 0;
                for (const row of result.rows) {
                    const count = parseInt(row.alert_count);
                    totalAlerts += count;
                    // Group by type
                    alertsByType[row.alert_type] =
                        (alertsByType[row.alert_type] || 0) + count;
                    // Group by priority
                    alertsByPriority[row.severity] =
                        (alertsByPriority[row.severity] || 0) + count;
                    // Timeline data
                    timeline.push({
                        timestamp: new Date(row.timestamp).getTime(),
                        type: row.alert_type,
                        count,
                    });
                }
                return {
                    totalAlerts,
                    alertsByType,
                    alertsByPriority,
                    timeline,
                };
            }
            catch (error) {
                console.error("Error getting alert history:", error);
                return {
                    totalAlerts: 0,
                    alertsByType: {},
                    alertsByPriority: {},
                    timeline: [],
                };
            }
        });
    }
    /**
     * Manually trigger alert for testing or emergency situations
     */
    triggerManualAlert(type_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (type, message, priority = "medium") {
            const alertData = {
                title: `🔧 Manual Alert: ${type.toUpperCase()}`,
                description: message,
                color: type === "emergency"
                    ? 0xff0000
                    : type === "maintenance"
                        ? 0xffaa00
                        : 0x0099ff,
                priority,
                confidence: "Manual",
                fields: [
                    {
                        name: "Alert Type",
                        value: type,
                        inline: true,
                    },
                    {
                        name: "Triggered By",
                        value: "System Administrator",
                        inline: true,
                    },
                    {
                        name: "Timestamp",
                        value: new Date().toISOString(),
                        inline: true,
                    },
                ],
            };
            yield Promise.all([
                this.sendDiscordAlert(alertData),
                this.sendEmailAlert(alertData),
            ]);
            console.log(`Manual alert triggered: ${type} - ${message}`);
        });
    }
    formatAlertMessage(type, data) {
        switch (type) {
            case "new_high_risk_attackers":
                return {
                    title: "🚨 New High-Risk Dusting Attackers Detected",
                    description: `Detected ${data.length} new high-risk dusting attackers.`,
                    color: 0xff0000,
                    fields: data.slice(0, 10).map((attacker) => ({
                        name: `Attacker: ${attacker.address.substring(0, 8)}...${attacker.address.substring(attacker.address.length - 8)}`,
                        value: `Risk Score: ${(attacker.risk_score * 100).toFixed(1)}%\nVictims: ${attacker.unique_victims_count}\nTransfers: ${attacker.small_transfers_count}`,
                        inline: true,
                    })),
                };
            case "new_high_risk_victims":
                return {
                    title: "⚠️ New Potential Dusting Victims Detected",
                    description: `Detected ${data.length} new potential dusting victims.`,
                    color: 0xffaa00,
                    fields: data.slice(0, 10).map((victim) => ({
                        name: `Victim: ${victim.address.substring(0, 8)}...${victim.address.substring(victim.address.length - 8)}`,
                        value: `Risk Score: ${(victim.risk_score * 100).toFixed(1)}%\nAttackers: ${victim.unique_attackers_count}\nDust Txs: ${victim.dust_transactions_count}`,
                        inline: true,
                    })),
                };
            case "activity_spike":
                return {
                    title: "🔥 Dust Attack Activity Spike Detected",
                    description: "Unusual increase in dusting activity detected in the last hour.",
                    color: 0xff5500,
                    fields: [
                        {
                            name: "Recent Activity",
                            value: `${data.recentCount} dust transactions in the last hour`,
                            inline: true,
                        },
                        {
                            name: "Normal Activity",
                            value: `${data.previousAvgCount.toFixed(1)} dust transactions per hour (avg)`,
                            inline: true,
                        },
                        {
                            name: "Increase Factor",
                            value: `${data.spikeRatio.toFixed(1)}x normal activity`,
                            inline: true,
                        },
                    ],
                };
            default:
                return {
                    title: "Dust Attack Alert",
                    description: "A potential dust attack has been detected.",
                    color: 0x5555ff,
                    fields: [{ name: "Details", value: JSON.stringify(data, null, 2) }],
                };
        }
    }
}
exports.DustingAlertSystem = DustingAlertSystem;
