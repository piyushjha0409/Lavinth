/**
 * Threat Intelligence Service
 *
 * Integrates external data sources for malicious address detection,
 * entity resolution, and enhanced transaction parsing.
 * Part of WalletShield Recovery - Phase 6
 */

import * as dotenv from "dotenv";
import pool from "../db/config";

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
// Rate Limiter
// ============================================

class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(rps: number) {
    this.maxTokens = rps;
    this.tokens = rps;
    this.refillRate = rps;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until a token is available
    const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ============================================
// Interfaces
// ============================================

export interface ThreatIntelSource {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  sourceUrl: string;
  isEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string;
  totalAddresses: number;
  syncCount: number;
}

export interface SyncResult {
  sourceId: string;
  status: "success" | "error" | "skipped";
  addressesFound: number;
  addressesNew: number;
  addressesUpdated: number;
  durationMs: number;
  error?: string;
}

export interface EnhancedTransaction {
  signature: string;
  type: string;
  description: string;
  source: string;
  fee: number;
  feePayer: string;
  timestamp: number;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
  accountData: any[];
  events: any;
}

export interface GoPlusAddressResult {
  address: string;
  isRisky: boolean;
  riskFlags: string[];
  dataSource: string;
}

export interface ArkhamEntity {
  address: string;
  entityName: string | null;
  entityType: string | null;
  entityId: string | null;
  chain: string;
  cachedAt: Date;
}

// ============================================
// Threat Intelligence Service
// ============================================

export class ThreatIntelligenceService {
  private heliusRateLimiter = new RateLimiter(10);
  private arkhamRateLimiter = new RateLimiter(1);
  private goplusRateLimiter = new RateLimiter(5);
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private currentHeliusKeyIndex = 0;

  constructor() {
    if (AUTO_SYNC_ENABLED && SYNC_INTERVAL_MS > 0) {
      this.syncTimer = setInterval(() => {
        this.syncAll().catch((err) =>
          console.error("Auto-sync failed:", err.message)
        );
      }, SYNC_INTERVAL_MS);
      console.log(
        `ThreatIntel: Auto-sync enabled, interval ${SYNC_INTERVAL_MS / 1000}s`
      );
    }
    console.log(
      `ThreatIntel: Helius keys=${HELIUS_API_KEYS.length}, Arkham=${ARKHAM_API_KEY ? "configured" : "not configured"}`
    );
  }

  // ============================================
  // Helius helpers
  // ============================================

  private getHeliusApiKey(): string | null {
    if (HELIUS_API_KEYS.length === 0) return null;
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
  async syncAll(): Promise<SyncResult[]> {
    if (this.isSyncing) {
      console.log("ThreatIntel: Sync already in progress, skipping");
      return [];
    }

    this.isSyncing = true;
    const results: SyncResult[] = [];

    try {
      console.log("ThreatIntel: Starting full sync...");

      const sources = await this.getSources();
      for (const source of sources) {
        if (!source.isEnabled || (source.sourceType !== "community_list" && source.sourceType !== "domain_list")) continue;
        try {
          const result = await this.syncSource(source.sourceId);
          results.push(result);
        } catch (err: any) {
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

      console.log(
        `ThreatIntel: Full sync complete. ${results.length} sources processed.`
      );
      return results;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a specific source by ID
   */
  async syncSource(sourceId: string): Promise<SyncResult> {
    const startTime = Date.now();

    // Log sync start
    await pool.executeQuery(
      `INSERT INTO threat_intel_sync_log (source_id, started_at, status)
       VALUES ($1, CURRENT_TIMESTAMP, 'in_progress')`,
      [sourceId]
    );

    try {
      let result: SyncResult;

      switch (sourceId) {
        case "allenhark":
          result = await this.syncAllenHark();
          break;
        case "phantom-blocklist":
          result = await this.syncPhantomBlocklist();
          break;
        case "solana-safety-101-domains":
          result = await this.syncSolanaSafety101Domains();
          break;
        case "phishdestroy":
          result = await this.syncPhishDestroy();
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
      await pool.executeQuery(
        `UPDATE threat_intel_sources SET
           last_sync_at = CURRENT_TIMESTAMP,
           last_sync_status = 'success',
           last_sync_error = NULL,
           total_addresses = (SELECT COUNT(*) FROM known_malicious_delegates WHERE $1 = ANY(external_sources)),
           sync_count = sync_count + 1,
           updated_at = CURRENT_TIMESTAMP
         WHERE source_id = $1`,
        [sourceId]
      );

      // Log sync completion
      await pool.executeQuery(
        `UPDATE threat_intel_sync_log SET
           completed_at = CURRENT_TIMESTAMP,
           status = 'success',
           addresses_found = $2,
           addresses_new = $3,
           addresses_updated = $4,
           duration_ms = $5
         WHERE source_id = $1 AND status = 'in_progress'
         AND id = (SELECT MAX(id) FROM threat_intel_sync_log WHERE source_id = $1)`,
        [sourceId, result.addressesFound, result.addressesNew, result.addressesUpdated, result.durationMs]
      );

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      // Update source with error
      await pool.executeQuery(
        `UPDATE threat_intel_sources SET
           last_sync_at = CURRENT_TIMESTAMP,
           last_sync_status = 'error',
           last_sync_error = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE source_id = $1`,
        [sourceId, err.message]
      ).catch(() => {});

      // Log sync failure
      await pool.executeQuery(
        `UPDATE threat_intel_sync_log SET
           completed_at = CURRENT_TIMESTAMP,
           status = 'error',
           error_message = $2,
           duration_ms = $3
         WHERE source_id = $1 AND status = 'in_progress'
         AND id = (SELECT MAX(id) FROM threat_intel_sync_log WHERE source_id = $1)`,
        [sourceId, err.message, durationMs]
      ).catch(() => {});

      throw err;
    }
  }

  /**
   * Sync AllenHark scammer database (JSONL format)
   */
  private async syncAllenHark(): Promise<SyncResult> {
    const sourceId = "allenhark";
    console.log("ThreatIntel: Syncing AllenHark scammer database...");

    const url = "https://allenhark.com/blacklist.jsonl";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`AllenHark fetch failed: ${response.status}`);
    }

    const text = await response.text();
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const addresses: string[] = [];

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.addr && base58Regex.test(entry.addr)) {
          addresses.push(entry.addr);
        }
      } catch {
        // Skip malformed lines
      }
    }

    return this.upsertMaliciousAddresses(addresses, sourceId);
  }

  /**
   * Sync Phantom NFT Blocklist (YAML list of malicious NFT mint addresses)
   */
  private async syncPhantomBlocklist(): Promise<SyncResult> {
    const sourceId = "phantom-blocklist";
    console.log("ThreatIntel: Syncing Phantom NFT Blocklist...");

    const url = "https://raw.githubusercontent.com/phantom/blocklist/master/nft-blocklist.yaml";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Phantom blocklist fetch failed: ${response.status}`);
    }

    const text = await response.text();
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const addresses: string[] = [];

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
  }

  /**
   * Sync Solana Safety 101 domains (scam domain list)
   */
  private async syncSolanaSafety101Domains(): Promise<SyncResult> {
    const sourceId = "solana-safety-101-domains";
    console.log("ThreatIntel: Syncing Solana Safety 101 domains...");

    const url =
      "https://raw.githubusercontent.com/The-Great-Ape/solana-safety-101/main/src/pages/api/data.json";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SolanaSafety101 domains fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const domains: string[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item?.domain && item?.status === "Scam") {
          domains.push(item.domain.toLowerCase().trim());
        }
      }
    }

    return this.upsertMaliciousDomains(domains, sourceId);
  }

  /**
   * Sync PhishDestroy destroylist (Web3 phishing domains)
   */
  private async syncPhishDestroy(): Promise<SyncResult> {
    const sourceId = "phishdestroy";
    console.log("ThreatIntel: Syncing PhishDestroy destroylist...");

    const url =
      "https://raw.githubusercontent.com/phishdestroy/destroylist/main/list.json";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`PhishDestroy fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const domains: string[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string") {
          domains.push(item.toLowerCase().trim());
        } else if (item?.domain) {
          domains.push(item.domain.toLowerCase().trim());
        }
      }
    }

    return this.upsertMaliciousDomains(domains, sourceId);
  }

  /**
   * Upsert malicious addresses into known_malicious_delegates (batched via unnest)
   */
  private async upsertMaliciousAddresses(
    addresses: string[],
    sourceId: string
  ): Promise<SyncResult> {
    const unique = [...new Set(addresses)];
    let newCount = 0;
    let updatedCount = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      try {
        const result = await pool.executeQuery(
          `INSERT INTO known_malicious_delegates (address, label, category, external_sources, last_verified_at, confidence_score)
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
           RETURNING (xmax = 0) AS is_new`,
          [batch, `${sourceId}-detected`, "drainer", sourceId]
        );

        for (const row of result.rows) {
          if (row.is_new) newCount++;
          else updatedCount++;
        }
      } catch (err) {
        // Skip batch errors
        console.error(`ThreatIntel [${sourceId}]: Batch insert error:`, (err as Error).message);
      }
    }

    console.log(
      `ThreatIntel [${sourceId}]: ${unique.length} found, ${newCount} new, ${updatedCount} updated`
    );

    return {
      sourceId,
      status: "success",
      addressesFound: unique.length,
      addressesNew: newCount,
      addressesUpdated: updatedCount,
      durationMs: 0,
    };
  }

  /**
   * Upsert malicious domains into malicious_domains table (batched via unnest)
   */
  private async upsertMaliciousDomains(
    domains: string[],
    sourceId: string
  ): Promise<SyncResult> {
    const unique = [...new Set(domains.filter((d) => d.length > 0))];
    let newCount = 0;
    let updatedCount = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      try {
        const result = await pool.executeQuery(
          `INSERT INTO malicious_domains (domain, status, external_sources, last_verified_at)
           SELECT d, 'scam', ARRAY[$2], CURRENT_TIMESTAMP
           FROM unnest($1::text[]) AS d
           ON CONFLICT (domain) DO UPDATE SET
             external_sources = (
               SELECT ARRAY(SELECT DISTINCT unnest(
                 COALESCE(malicious_domains.external_sources, '{}') || ARRAY[$2]
               ))
             ),
             last_verified_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS is_new`,
          [batch, sourceId]
        );

        for (const row of result.rows) {
          if (row.is_new) newCount++;
          else updatedCount++;
        }
      } catch (err) {
        console.error(`ThreatIntel [${sourceId}]: Batch domain insert error:`, (err as Error).message);
      }
    }

    console.log(
      `ThreatIntel [${sourceId}]: ${unique.length} domains found, ${newCount} new, ${updatedCount} updated`
    );

    return {
      sourceId,
      status: "success",
      addressesFound: unique.length,
      addressesNew: newCount,
      addressesUpdated: updatedCount,
      durationMs: 0,
    };
  }

  /**
   * Check if a domain is known scam/phishing
   */
  async checkDomain(domain: string): Promise<{
    domain: string;
    isScam: boolean;
    sources: string[];
    status: string;
  }> {
    const normalized = domain.toLowerCase().trim();
    const withoutWww = normalized.replace(/^www\./, "");
    const withWww = `www.${withoutWww}`;

    try {
      const result = await pool.executeQuery(
        `SELECT domain, status, external_sources FROM malicious_domains
         WHERE domain IN ($1, $2, $3)
         LIMIT 1`,
        [normalized, withoutWww, withWww]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          domain: normalized,
          isScam: true,
          sources: row.external_sources || [],
          status: row.status || "scam",
        };
      }
    } catch (err: any) {
      console.error("Domain check error:", err.message);
    }

    return {
      domain: normalized,
      isScam: false,
      sources: [],
      status: "unknown",
    };
  }

  // ============================================
  // GoPlus Address Security API
  // ============================================

  /**
   * Real-time address risk check via GoPlus Security API
   */
  async checkAddressGoPlus(address: string): Promise<GoPlusAddressResult> {
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
      await this.goplusRateLimiter.acquire();

      const url = `https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=solana`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`GoPlus lookup failed: ${response.status}`);
        return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
      }

      const data = await response.json();
      const result = data?.result;

      if (!result) {
        return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
      }

      const riskFlags: string[] = [];
      for (const field of RISK_FIELDS) {
        if (result[field] === "1") {
          riskFlags.push(field);
        }
      }

      return {
        address,
        isRisky: riskFlags.length > 0,
        riskFlags,
        dataSource: "goplus",
      };
    } catch (err: any) {
      console.error("GoPlus lookup error:", err.message);
      return { address, isRisky: false, riskFlags: [], dataSource: "goplus" };
    }
  }

  // ============================================
  // Helius Enhanced Transaction API
  // ============================================

  /**
   * Get enhanced transactions for an address using Helius API
   */
  async getEnhancedTransactions(
    address: string,
    limit: number = 20
  ): Promise<EnhancedTransaction[]> {
    const apiKey = this.getHeliusApiKey();
    if (!apiKey) return [];

    try {
      await this.heliusRateLimiter.acquire();

      const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Helius enhanced tx fetch failed: ${response.status}`);
        return [];
      }

      return (await response.json()) as EnhancedTransaction[];
    } catch (err: any) {
      console.error("Helius enhanced transactions error:", err.message);
      return [];
    }
  }

  /**
   * Parse transaction signatures using Helius Enhanced API (batch up to 100)
   */
  async parseTransactionSignatures(
    signatures: string[]
  ): Promise<EnhancedTransaction[]> {
    const apiKey = this.getHeliusApiKey();
    if (!apiKey || signatures.length === 0) return [];

    const results: EnhancedTransaction[] = [];

    // Batch in groups of 100
    for (let i = 0; i < signatures.length; i += 100) {
      const batch = signatures.slice(i, i + 100);
      try {
        await this.heliusRateLimiter.acquire();

        const url = `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: batch }),
        });

        if (!response.ok) {
          console.error(`Helius parse batch failed: ${response.status}`);
          continue;
        }

        const parsed = (await response.json()) as EnhancedTransaction[];
        results.push(...parsed);
      } catch (err: any) {
        console.error("Helius parse batch error:", err.message);
      }
    }

    return results;
  }

  // ============================================
  // Arkham Intelligence API
  // ============================================

  /**
   * Look up an entity with cache (24h TTL)
   * Returns null if Arkham is not configured or address is unknown
   */
  async lookupEntityCached(address: string): Promise<ArkhamEntity | null> {
    // Check DB cache first
    try {
      const cached = await pool.executeQuery(
        `SELECT * FROM address_entity_labels
         WHERE address = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [address]
      );

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
    } catch (err) {
      // Cache miss, continue to API
    }

    // Call Arkham API
    const entity = await this.lookupEntity(address);
    if (!entity) return null;

    // Cache the result
    try {
      await pool.executeQuery(
        `INSERT INTO address_entity_labels (address, entity_name, entity_type, entity_id, chain, cached_at, expires_at)
         VALUES ($1, $2, $3, $4, 'solana', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
         ON CONFLICT (address) DO UPDATE SET
           entity_name = EXCLUDED.entity_name,
           entity_type = EXCLUDED.entity_type,
           entity_id = EXCLUDED.entity_id,
           cached_at = CURRENT_TIMESTAMP,
           expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'`,
        [address, entity.entityName, entity.entityType, entity.entityId]
      );
    } catch (err) {
      // Cache write failure is non-critical
    }

    return entity;
  }

  /**
   * Direct Arkham API call. Returns null if not configured or not found.
   */
  async lookupEntity(address: string): Promise<ArkhamEntity | null> {
    if (!ARKHAM_API_KEY) return null;

    try {
      await this.arkhamRateLimiter.acquire();

      const url = `https://api.arkhamintelligence.com/intelligence/address/${address}?chain=solana`;
      const response = await fetch(url, {
        headers: {
          "API-Key": ARKHAM_API_KEY,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        console.error(`Arkham lookup failed: ${response.status}`);
        return null;
      }

      const data = await response.json();

      return {
        address,
        entityName: data?.arkhamEntity?.name || data?.entity?.name || null,
        entityType: data?.arkhamEntity?.type || data?.entity?.type || null,
        entityId: data?.arkhamEntity?.id || data?.entity?.id || null,
        chain: "solana",
        cachedAt: new Date(),
      };
    } catch (err: any) {
      console.error("Arkham lookup error:", err.message);
      return null;
    }
  }

  // ============================================
  // Source Management
  // ============================================

  /**
   * Get all configured sources
   */
  async getSources(): Promise<ThreatIntelSource[]> {
    try {
      const result = await pool.executeQuery(
        `SELECT * FROM threat_intel_sources ORDER BY source_name`
      );

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
    } catch (err) {
      console.error("Error getting sources:", err);
      return [];
    }
  }

  /**
   * Get status of all sources with counts
   */
  async getStatus(): Promise<{
    sources: ThreatIntelSource[];
    totalMaliciousAddresses: number;
    totalMaliciousDomains: number;
    totalEntityLabels: number;
    isSyncing: boolean;
  }> {
    const sources = await this.getSources();

    let totalMalicious = 0;
    let totalDomains = 0;
    let totalLabels = 0;

    try {
      const malRes = await pool.executeQuery(
        `SELECT COUNT(*) as count FROM known_malicious_delegates`
      );
      totalMalicious = parseInt(malRes.rows[0].count);
    } catch (err) {}

    try {
      const domRes = await pool.executeQuery(
        `SELECT COUNT(*) as count FROM malicious_domains`
      );
      totalDomains = parseInt(domRes.rows[0].count);
    } catch (err) {}

    try {
      const labelRes = await pool.executeQuery(
        `SELECT COUNT(*) as count FROM address_entity_labels`
      );
      totalLabels = parseInt(labelRes.rows[0].count);
    } catch (err) {}

    return {
      sources,
      totalMaliciousAddresses: totalMalicious,
      totalMaliciousDomains: totalDomains,
      totalEntityLabels: totalLabels,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Clean up on shutdown
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

// Export singleton instance
export const threatIntelligenceService = new ThreatIntelligenceService();
export default threatIntelligenceService;
