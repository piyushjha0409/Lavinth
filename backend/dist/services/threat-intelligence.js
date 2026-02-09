"use strict";
/**
 * Threat Intelligence Service
 *
 * Integrates external data sources for malicious address detection,
 * entity resolution, and enhanced transaction parsing.
 * Part of WalletShield Recovery - Phase 6
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
exports.threatIntelligenceService = exports.ThreatIntelligenceService = void 0;
const dotenv = __importStar(require("dotenv"));
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
// Configuration
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
const ARKHAM_API_KEY = process.env.ARKHAM_API_KEY || "";
const SYNC_INTERVAL_MS = parseInt(process.env.THREAT_INTEL_SYNC_INTERVAL || "21600000"); // 6 hours
const AUTO_SYNC_ENABLED = process.env.THREAT_INTEL_AUTO_SYNC !== "false";
// ============================================
// Timeout helper
// ============================================
const DEFAULT_TIMEOUT_MS = 15000; // 15s for API calls
const SYNC_FETCH_TIMEOUT_MS = 30000; // 30s for community list syncs (larger payloads)
function fetchWithTimeout(url, options = {}) {
    const { timeoutMs = DEFAULT_TIMEOUT_MS } = options, fetchOptions = __rest(options, ["timeoutMs"]);
    return fetch(url, Object.assign(Object.assign({}, fetchOptions), { signal: AbortSignal.timeout(timeoutMs) }));
}
// ============================================
// Circuit Breaker
// ============================================
class CircuitBreaker {
    constructor(threshold = 5, resetMs = 60000) {
        this.failures = 0;
        this.lastFailure = 0;
        this.threshold = threshold;
        this.resetMs = resetMs;
    }
    /** Returns true if the circuit is open (calls should be skipped). */
    isOpen() {
        if (this.failures < this.threshold)
            return false;
        // Auto-reset after resetMs
        if (Date.now() - this.lastFailure > this.resetMs) {
            this.failures = 0;
            return false;
        }
        return true;
    }
    recordSuccess() {
        this.failures = 0;
    }
    recordFailure() {
        this.failures++;
        this.lastFailure = Date.now();
    }
}
// ============================================
// Rate Limiter
// ============================================
class RateLimiter {
    constructor(rps) {
        this.maxTokens = rps;
        this.tokens = rps;
        this.refillRate = rps;
        this.lastRefill = Date.now();
    }
    acquire() {
        return __awaiter(this, void 0, void 0, function* () {
            this.refill();
            if (this.tokens >= 1) {
                this.tokens -= 1;
                return;
            }
            // Wait until a token is available
            const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
            yield new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
            this.refill();
            this.tokens -= 1;
        });
    }
    refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }
}
// ============================================
// Threat Intelligence Service
// ============================================
class ThreatIntelligenceService {
    constructor() {
        this.heliusRateLimiter = new RateLimiter(10);
        this.arkhamRateLimiter = new RateLimiter(1);
        this.goplusRateLimiter = new RateLimiter(5);
        this.isSyncing = false;
        this.syncTimer = null;
        this.currentHeliusKeyIndex = 0;
        this.goplusCacheMap = new Map();
        // Circuit breakers for external APIs (5 consecutive failures → open for 60s)
        this.goplusCircuit = new CircuitBreaker(5, 60000);
        this.arkhamCircuit = new CircuitBreaker(5, 60000);
        this.heliusCircuit = new CircuitBreaker(5, 60000);
        if (AUTO_SYNC_ENABLED && SYNC_INTERVAL_MS > 0) {
            this.syncTimer = setInterval(() => {
                this.syncAll().catch((err) => logger_1.default.error({ err, source: 'ThreatIntel' }, 'Auto-sync failed'));
            }, SYNC_INTERVAL_MS);
            logger_1.default.info({ source: 'ThreatIntel', intervalSeconds: SYNC_INTERVAL_MS / 1000 }, 'Auto-sync enabled');
        }
        logger_1.default.info({ source: 'ThreatIntel', heliusKeys: HELIUS_API_KEYS.length, arkham: ARKHAM_API_KEY ? 'configured' : 'not configured' }, 'Service initialized');
    }
    // ============================================
    // Helius helpers
    // ============================================
    getHeliusApiKey() {
        if (HELIUS_API_KEYS.length === 0)
            return null;
        const key = HELIUS_API_KEYS[this.currentHeliusKeyIndex];
        this.currentHeliusKeyIndex =
            (this.currentHeliusKeyIndex + 1) % HELIUS_API_KEYS.length;
        return key;
    }
    // ============================================
    // Community List Sync
    // ============================================
    /**
     * Sync all enabled community list sources
     */
    syncAll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isSyncing) {
                logger_1.default.info({ source: 'ThreatIntel' }, 'Sync already in progress, skipping');
                return [];
            }
            this.isSyncing = true;
            const results = [];
            try {
                logger_1.default.info({ source: 'ThreatIntel' }, 'Starting full sync');
                const sources = yield this.getSources();
                for (const source of sources) {
                    if (!source.isEnabled || (source.sourceType !== "community_list" && source.sourceType !== "domain_list"))
                        continue;
                    try {
                        const result = yield this.syncSource(source.sourceId);
                        results.push(result);
                    }
                    catch (err) {
                        results.push({
                            sourceId: source.sourceId,
                            status: "error",
                            addressesFound: 0,
                            addressesNew: 0,
                            addressesUpdated: 0,
                            durationMs: 0,
                            error: err.message,
                        });
                    }
                }
                logger_1.default.info({ source: 'ThreatIntel', sourcesProcessed: results.length }, 'Full sync complete');
                return results;
            }
            finally {
                this.isSyncing = false;
            }
        });
    }
    /**
     * Sync a specific source by ID
     */
    syncSource(sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            // Log sync start
            yield config_1.default.executeQuery(`INSERT INTO threat_intel_sync_log (source_id, started_at, status)
       VALUES ($1, CURRENT_TIMESTAMP, 'in_progress')`, [sourceId]);
            try {
                let result;
                switch (sourceId) {
                    case "allenhark":
                        result = yield this.syncAllenHark();
                        break;
                    case "phantom-blocklist":
                        result = yield this.syncPhantomBlocklist();
                        break;
                    case "solana-safety-101-domains":
                        result = yield this.syncSolanaSafety101Domains();
                        break;
                    case "phishdestroy":
                        result = yield this.syncPhishDestroy();
                        break;
                    default:
                        return {
                            sourceId,
                            status: "skipped",
                            addressesFound: 0,
                            addressesNew: 0,
                            addressesUpdated: 0,
                            durationMs: Date.now() - startTime,
                        };
                }
                result.durationMs = Date.now() - startTime;
                // Update source status
                yield config_1.default.executeQuery(`UPDATE threat_intel_sources SET
           last_sync_at = CURRENT_TIMESTAMP,
           last_sync_status = 'success',
           last_sync_error = NULL,
           total_addresses = (SELECT COUNT(*) FROM known_malicious_delegates WHERE $1 = ANY(external_sources)),
           sync_count = sync_count + 1,
           updated_at = CURRENT_TIMESTAMP
         WHERE source_id = $1`, [sourceId]);
                // Log sync completion
                yield config_1.default.executeQuery(`UPDATE threat_intel_sync_log SET
           completed_at = CURRENT_TIMESTAMP,
           status = 'success',
           addresses_found = $2,
           addresses_new = $3,
           addresses_updated = $4,
           duration_ms = $5
         WHERE source_id = $1 AND status = 'in_progress'
         AND id = (SELECT MAX(id) FROM threat_intel_sync_log WHERE source_id = $1)`, [sourceId, result.addressesFound, result.addressesNew, result.addressesUpdated, result.durationMs]);
                return result;
            }
            catch (err) {
                const durationMs = Date.now() - startTime;
                // Update source with error
                yield config_1.default.executeQuery(`UPDATE threat_intel_sources SET
           last_sync_at = CURRENT_TIMESTAMP,
           last_sync_status = 'error',
           last_sync_error = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE source_id = $1`, [sourceId, err.message]).catch(() => { });
                // Log sync failure
                yield config_1.default.executeQuery(`UPDATE threat_intel_sync_log SET
           completed_at = CURRENT_TIMESTAMP,
           status = 'error',
           error_message = $2,
           duration_ms = $3
         WHERE source_id = $1 AND status = 'in_progress'
         AND id = (SELECT MAX(id) FROM threat_intel_sync_log WHERE source_id = $1)`, [sourceId, err.message, durationMs]).catch(() => { });
                throw err;
            }
        });
    }
    /**
     * Sync AllenHark scammer database (JSONL format)
     */
    syncAllenHark() {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceId = "allenhark";
            logger_1.default.info({ source: 'ThreatIntel' }, 'Syncing AllenHark scammer database');
            const url = "https://allenhark.com/blacklist.jsonl";
            const response = yield fetchWithTimeout(url, { timeoutMs: SYNC_FETCH_TIMEOUT_MS });
            if (!response.ok) {
                throw new Error(`AllenHark fetch failed: ${response.status}`);
            }
            const text = yield response.text();
            const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
            const addresses = [];
            for (const line of text.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                try {
                    const entry = JSON.parse(trimmed);
                    if (entry.addr && base58Regex.test(entry.addr)) {
                        addresses.push(entry.addr);
                    }
                }
                catch (_a) {
                    // Skip malformed lines
                }
            }
            return this.upsertMaliciousAddresses(addresses, sourceId);
        });
    }
    /**
     * Sync Phantom NFT Blocklist (YAML list of malicious NFT mint addresses)
     */
    syncPhantomBlocklist() {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceId = "phantom-blocklist";
            logger_1.default.info({ source: 'ThreatIntel' }, 'Syncing Phantom NFT Blocklist');
            const url = "https://raw.githubusercontent.com/phantom/blocklist/master/nft-blocklist.yaml";
            const response = yield fetchWithTimeout(url, { timeoutMs: SYNC_FETCH_TIMEOUT_MS });
            if (!response.ok) {
                throw new Error(`Phantom blocklist fetch failed: ${response.status}`);
            }
            const text = yield response.text();
            const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
            const addresses = [];
            for (const line of text.split("\n")) {
                const match = line.match(/^\s*-\s*mint:\s*(\S+)/);
                if (match) {
                    const addr = match[1].trim();
                    if (base58Regex.test(addr)) {
                        addresses.push(addr);
                    }
                }
            }
            return this.upsertMaliciousAddresses(addresses, sourceId);
        });
    }
    /**
     * Sync Solana Safety 101 domains (scam domain list)
     */
    syncSolanaSafety101Domains() {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceId = "solana-safety-101-domains";
            logger_1.default.info({ source: 'ThreatIntel' }, 'Syncing Solana Safety 101 domains');
            const url = "https://raw.githubusercontent.com/The-Great-Ape/solana-safety-101/main/src/pages/api/data.json";
            const response = yield fetchWithTimeout(url, { timeoutMs: SYNC_FETCH_TIMEOUT_MS });
            if (!response.ok) {
                throw new Error(`SolanaSafety101 domains fetch failed: ${response.status}`);
            }
            const data = yield response.json();
            const domains = [];
            if (Array.isArray(data)) {
                for (const item of data) {
                    if ((item === null || item === void 0 ? void 0 : item.domain) && (item === null || item === void 0 ? void 0 : item.status) === "Scam") {
                        domains.push(item.domain.toLowerCase().trim());
                    }
                }
            }
            return this.upsertMaliciousDomains(domains, sourceId);
        });
    }
    /**
     * Sync PhishDestroy destroylist (Web3 phishing domains)
     */
    syncPhishDestroy() {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceId = "phishdestroy";
            logger_1.default.info({ source: 'ThreatIntel' }, 'Syncing PhishDestroy destroylist');
            const url = "https://raw.githubusercontent.com/phishdestroy/destroylist/main/list.json";
            const response = yield fetchWithTimeout(url, { timeoutMs: SYNC_FETCH_TIMEOUT_MS });
            if (!response.ok) {
                throw new Error(`PhishDestroy fetch failed: ${response.status}`);
            }
            const data = yield response.json();
            const domains = [];
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (typeof item === "string") {
                        domains.push(item.toLowerCase().trim());
                    }
                    else if (item === null || item === void 0 ? void 0 : item.domain) {
                        domains.push(item.domain.toLowerCase().trim());
                    }
                }
            }
            return this.upsertMaliciousDomains(domains, sourceId);
        });
    }
    /**
     * Upsert malicious addresses into known_malicious_delegates (batched via unnest)
     */
    upsertMaliciousAddresses(addresses, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const unique = [...new Set(addresses)];
            let newCount = 0;
            let updatedCount = 0;
            const BATCH_SIZE = 500;
            for (let i = 0; i < unique.length; i += BATCH_SIZE) {
                const batch = unique.slice(i, i + BATCH_SIZE);
                try {
                    const result = yield config_1.default.executeQuery(`INSERT INTO known_malicious_delegates (address, label, category, external_sources, last_verified_at, confidence_score)
           SELECT addr, $2, $3, ARRAY[$4], CURRENT_TIMESTAMP, 0.6
           FROM unnest($1::text[]) AS addr
           ON CONFLICT (address) DO UPDATE SET
             external_sources = (
               SELECT ARRAY(SELECT DISTINCT unnest(
                 COALESCE(known_malicious_delegates.external_sources, '{}') || ARRAY[$4]
               ))
             ),
             last_verified_at = CURRENT_TIMESTAMP,
             confidence_score = LEAST(1.0, COALESCE(known_malicious_delegates.confidence_score, 0.5) + 0.1)
           RETURNING (xmax = 0) AS is_new`, [batch, `${sourceId}-detected`, "drainer", sourceId]);
                    for (const row of result.rows) {
                        if (row.is_new)
                            newCount++;
                        else
                            updatedCount++;
                    }
                }
                catch (err) {
                    // Skip batch errors
                    logger_1.default.error({ err, source: 'ThreatIntel', sourceId }, 'Batch insert error');
                }
            }
            logger_1.default.info({ source: 'ThreatIntel', sourceId, found: unique.length, new: newCount, updated: updatedCount }, 'Address sync complete');
            return {
                sourceId,
                status: "success",
                addressesFound: unique.length,
                addressesNew: newCount,
                addressesUpdated: updatedCount,
                durationMs: 0,
            };
        });
    }
    /**
     * Upsert malicious domains into malicious_domains table (batched via unnest)
     */
    upsertMaliciousDomains(domains, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const unique = [...new Set(domains.filter((d) => d.length > 0))];
            let newCount = 0;
            let updatedCount = 0;
            const BATCH_SIZE = 500;
            for (let i = 0; i < unique.length; i += BATCH_SIZE) {
                const batch = unique.slice(i, i + BATCH_SIZE);
                try {
                    const result = yield config_1.default.executeQuery(`INSERT INTO malicious_domains (domain, status, external_sources, last_verified_at)
           SELECT d, 'scam', ARRAY[$2], CURRENT_TIMESTAMP
           FROM unnest($1::text[]) AS d
           ON CONFLICT (domain) DO UPDATE SET
             external_sources = (
               SELECT ARRAY(SELECT DISTINCT unnest(
                 COALESCE(malicious_domains.external_sources, '{}') || ARRAY[$2]
               ))
             ),
             last_verified_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS is_new`, [batch, sourceId]);
                    for (const row of result.rows) {
                        if (row.is_new)
                            newCount++;
                        else
                            updatedCount++;
                    }
                }
                catch (err) {
                    logger_1.default.error({ err, source: 'ThreatIntel', sourceId }, 'Batch domain insert error');
                }
            }
            logger_1.default.info({ source: 'ThreatIntel', sourceId, found: unique.length, new: newCount, updated: updatedCount }, 'Domain sync complete');
            return {
                sourceId,
                status: "success",
                addressesFound: unique.length,
                addressesNew: newCount,
                addressesUpdated: updatedCount,
                durationMs: 0,
            };
        });
    }
    /**
     * Check if a domain is known scam/phishing
     */
    checkDomain(domain) {
        return __awaiter(this, void 0, void 0, function* () {
            const normalized = domain.toLowerCase().trim();
            const withoutWww = normalized.replace(/^www\./, "");
            const withWww = `www.${withoutWww}`;
            try {
                const result = yield config_1.default.executeQuery(`SELECT domain, status, external_sources FROM malicious_domains
         WHERE domain IN ($1, $2, $3)
         LIMIT 1`, [normalized, withoutWww, withWww]);
                if (result.rows.length > 0) {
                    const row = result.rows[0];
                    return {
                        domain: normalized,
                        isScam: true,
                        sources: row.external_sources || [],
                        status: row.status || "scam",
                    };
                }
            }
            catch (err) {
                logger_1.default.error({ err, source: 'ThreatIntel' }, 'Domain check error');
            }
            return {
                domain: normalized,
                isScam: false,
                sources: [],
                status: "unknown",
            };
        });
    }
    // ============================================
    // GoPlus Address Security API
    // ============================================
    /**
     * Real-time address risk check via GoPlus Security API
     */
    checkAddressGoPlus(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check in-memory cache
            const cached = this.goplusCacheMap.get(address);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.result;
            }
            // Circuit breaker check
            if (this.goplusCircuit.isOpen()) {
                logger_1.default.warn({ source: 'ThreatIntel' }, 'GoPlus circuit breaker open, skipping');
                return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
            }
            const RISK_FIELDS = [
                "cybercrime",
                "money_laundering",
                "phishing_activities",
                "stealing_attack",
                "honeypot_related_address",
                "blacklist_doubt",
                "sanctioned",
            ];
            try {
                yield this.goplusRateLimiter.acquire();
                const url = `https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=solana`;
                const response = yield fetchWithTimeout(url);
                if (!response.ok) {
                    this.goplusCircuit.recordFailure();
                    logger_1.default.error({ source: 'ThreatIntel', status: response.status }, 'GoPlus lookup failed');
                    return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
                }
                this.goplusCircuit.recordSuccess();
                const data = yield response.json();
                const result = data === null || data === void 0 ? void 0 : data.result;
                if (!result) {
                    return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
                }
                const riskFlags = [];
                for (const field of RISK_FIELDS) {
                    if (result[field] === "1") {
                        riskFlags.push(field);
                    }
                }
                const goPlusResult = {
                    address,
                    isRisky: riskFlags.length > 0,
                    riskFlags,
                    dataSource: "goplus",
                };
                // Store in cache; evict oldest entries if over max size
                if (this.goplusCacheMap.size >= ThreatIntelligenceService.GOPLUS_CACHE_MAX_SIZE) {
                    const firstKey = this.goplusCacheMap.keys().next().value;
                    if (firstKey)
                        this.goplusCacheMap.delete(firstKey);
                }
                this.goplusCacheMap.set(address, {
                    result: goPlusResult,
                    expiresAt: Date.now() + ThreatIntelligenceService.GOPLUS_CACHE_TTL_MS,
                });
                return goPlusResult;
            }
            catch (err) {
                this.goplusCircuit.recordFailure();
                logger_1.default.error({ err, source: 'ThreatIntel' }, 'GoPlus lookup error');
                return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
            }
        });
    }
    // ============================================
    // Helius Enhanced Transaction API
    // ============================================
    /**
     * Get enhanced transactions for an address using Helius API
     */
    getEnhancedTransactions(address_1) {
        return __awaiter(this, arguments, void 0, function* (address, limit = 20) {
            const apiKey = this.getHeliusApiKey();
            if (!apiKey)
                return [];
            if (this.heliusCircuit.isOpen()) {
                logger_1.default.warn({ source: 'ThreatIntel' }, 'Helius circuit breaker open, skipping');
                return [];
            }
            try {
                yield this.heliusRateLimiter.acquire();
                const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=${limit}`;
                const response = yield fetchWithTimeout(url);
                if (!response.ok) {
                    this.heliusCircuit.recordFailure();
                    logger_1.default.error({ source: 'ThreatIntel', status: response.status }, 'Helius enhanced tx fetch failed');
                    return [];
                }
                this.heliusCircuit.recordSuccess();
                return (yield response.json());
            }
            catch (err) {
                this.heliusCircuit.recordFailure();
                logger_1.default.error({ err, source: 'ThreatIntel' }, 'Helius enhanced transactions error');
                return [];
            }
        });
    }
    /**
     * Parse transaction signatures using Helius Enhanced API (batch up to 100)
     */
    parseTransactionSignatures(signatures) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = this.getHeliusApiKey();
            if (!apiKey || signatures.length === 0)
                return [];
            if (this.heliusCircuit.isOpen()) {
                logger_1.default.warn({ source: 'ThreatIntel' }, 'Helius circuit breaker open, skipping parse');
                return [];
            }
            const results = [];
            // Batch in groups of 100
            for (let i = 0; i < signatures.length; i += 100) {
                const batch = signatures.slice(i, i + 100);
                try {
                    yield this.heliusRateLimiter.acquire();
                    const url = `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`;
                    const response = yield fetchWithTimeout(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transactions: batch }),
                    });
                    if (!response.ok) {
                        this.heliusCircuit.recordFailure();
                        logger_1.default.error({ source: 'ThreatIntel', status: response.status }, 'Helius parse batch failed');
                        continue;
                    }
                    this.heliusCircuit.recordSuccess();
                    const parsed = (yield response.json());
                    results.push(...parsed);
                }
                catch (err) {
                    this.heliusCircuit.recordFailure();
                    logger_1.default.error({ err, source: 'ThreatIntel' }, 'Helius parse batch error');
                }
            }
            return results;
        });
    }
    // ============================================
    // Arkham Intelligence API
    // ============================================
    /**
     * Look up an entity with cache (24h TTL)
     * Returns null if Arkham is not configured or address is unknown
     */
    lookupEntityCached(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check DB cache first
            try {
                const cached = yield config_1.default.executeQuery(`SELECT * FROM address_entity_labels
         WHERE address = $1 AND expires_at > CURRENT_TIMESTAMP`, [address]);
                if (cached.rows.length > 0) {
                    const row = cached.rows[0];
                    return {
                        address: row.address,
                        entityName: row.entity_name,
                        entityType: row.entity_type,
                        entityId: row.entity_id,
                        chain: row.chain,
                        cachedAt: new Date(row.cached_at),
                    };
                }
            }
            catch (err) {
                // Cache miss, continue to API
            }
            // Call Arkham API
            const entity = yield this.lookupEntity(address);
            if (!entity)
                return null;
            // Cache the result
            try {
                yield config_1.default.executeQuery(`INSERT INTO address_entity_labels (address, entity_name, entity_type, entity_id, chain, cached_at, expires_at)
         VALUES ($1, $2, $3, $4, 'solana', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
         ON CONFLICT (address) DO UPDATE SET
           entity_name = EXCLUDED.entity_name,
           entity_type = EXCLUDED.entity_type,
           entity_id = EXCLUDED.entity_id,
           cached_at = CURRENT_TIMESTAMP,
           expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'`, [address, entity.entityName, entity.entityType, entity.entityId]);
            }
            catch (err) {
                // Cache write failure is non-critical
            }
            return entity;
        });
    }
    /**
     * Direct Arkham API call. Returns null if not configured or not found.
     */
    lookupEntity(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            if (!ARKHAM_API_KEY)
                return null;
            if (this.arkhamCircuit.isOpen()) {
                logger_1.default.warn({ source: 'ThreatIntel' }, 'Arkham circuit breaker open, skipping');
                return null;
            }
            try {
                yield this.arkhamRateLimiter.acquire();
                const url = `https://api.arkhamintelligence.com/intelligence/address/${address}?chain=solana`;
                const response = yield fetchWithTimeout(url, {
                    headers: {
                        "API-Key": ARKHAM_API_KEY,
                        Accept: "application/json",
                    },
                });
                if (!response.ok) {
                    if (response.status === 404)
                        return null;
                    this.arkhamCircuit.recordFailure();
                    logger_1.default.error({ source: 'ThreatIntel', status: response.status }, 'Arkham lookup failed');
                    return null;
                }
                this.arkhamCircuit.recordSuccess();
                const data = yield response.json();
                return {
                    address,
                    entityName: ((_a = data === null || data === void 0 ? void 0 : data.arkhamEntity) === null || _a === void 0 ? void 0 : _a.name) || ((_b = data === null || data === void 0 ? void 0 : data.entity) === null || _b === void 0 ? void 0 : _b.name) || null,
                    entityType: ((_c = data === null || data === void 0 ? void 0 : data.arkhamEntity) === null || _c === void 0 ? void 0 : _c.type) || ((_d = data === null || data === void 0 ? void 0 : data.entity) === null || _d === void 0 ? void 0 : _d.type) || null,
                    entityId: ((_e = data === null || data === void 0 ? void 0 : data.arkhamEntity) === null || _e === void 0 ? void 0 : _e.id) || ((_f = data === null || data === void 0 ? void 0 : data.entity) === null || _f === void 0 ? void 0 : _f.id) || null,
                    chain: "solana",
                    cachedAt: new Date(),
                };
            }
            catch (err) {
                this.arkhamCircuit.recordFailure();
                logger_1.default.error({ err, source: 'ThreatIntel' }, 'Arkham lookup error');
                return null;
            }
        });
    }
    // ============================================
    // Source Management
    // ============================================
    /**
     * Get all configured sources
     */
    getSources() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield config_1.default.executeQuery(`SELECT * FROM threat_intel_sources ORDER BY source_name`);
                return result.rows.map((row) => ({
                    sourceId: row.source_id,
                    sourceName: row.source_name,
                    sourceType: row.source_type,
                    sourceUrl: row.source_url,
                    isEnabled: row.is_enabled,
                    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
                    lastSyncStatus: row.last_sync_status,
                    totalAddresses: row.total_addresses || 0,
                    syncCount: row.sync_count || 0,
                }));
            }
            catch (err) {
                logger_1.default.error({ err, source: 'ThreatIntel' }, 'Error getting sources');
                return [];
            }
        });
    }
    /**
     * Get status of all sources with counts
     */
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const sources = yield this.getSources();
            let totalMalicious = 0;
            let totalDomains = 0;
            let totalLabels = 0;
            try {
                const malRes = yield config_1.default.executeQuery(`SELECT COUNT(*) as count FROM known_malicious_delegates`);
                totalMalicious = parseInt(malRes.rows[0].count);
            }
            catch (err) { }
            try {
                const domRes = yield config_1.default.executeQuery(`SELECT COUNT(*) as count FROM malicious_domains`);
                totalDomains = parseInt(domRes.rows[0].count);
            }
            catch (err) { }
            try {
                const labelRes = yield config_1.default.executeQuery(`SELECT COUNT(*) as count FROM address_entity_labels`);
                totalLabels = parseInt(labelRes.rows[0].count);
            }
            catch (err) { }
            return {
                sources,
                totalMaliciousAddresses: totalMalicious,
                totalMaliciousDomains: totalDomains,
                totalEntityLabels: totalLabels,
                isSyncing: this.isSyncing,
            };
        });
    }
    /**
     * Clean up on shutdown
     */
    destroy() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
}
exports.ThreatIntelligenceService = ThreatIntelligenceService;
// In-memory TTL cache for GoPlus lookups (5-minute TTL)
ThreatIntelligenceService.GOPLUS_CACHE_TTL_MS = 5 * 60 * 1000;
ThreatIntelligenceService.GOPLUS_CACHE_MAX_SIZE = 500;
// Export singleton instance
exports.threatIntelligenceService = new ThreatIntelligenceService();
exports.default = exports.threatIntelligenceService;
