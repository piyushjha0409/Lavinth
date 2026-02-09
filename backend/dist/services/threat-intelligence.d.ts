/**
 * Threat Intelligence Service
 *
 * Integrates external data sources for malicious address detection,
 * entity resolution, and enhanced transaction parsing.
 * Part of WalletShield Recovery - Phase 6
 */
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
export declare class ThreatIntelligenceService {
    private heliusRateLimiter;
    private arkhamRateLimiter;
    private goplusRateLimiter;
    private isSyncing;
    private syncTimer;
    private currentHeliusKeyIndex;
    private static readonly GOPLUS_CACHE_TTL_MS;
    private static readonly GOPLUS_CACHE_MAX_SIZE;
    private goplusCacheMap;
    private goplusCircuit;
    private arkhamCircuit;
    private heliusCircuit;
    constructor();
    private getHeliusApiKey;
    /**
     * Sync all enabled community list sources
     */
    syncAll(): Promise<SyncResult[]>;
    /**
     * Sync a specific source by ID
     */
    syncSource(sourceId: string): Promise<SyncResult>;
    /**
     * Sync AllenHark scammer database (JSONL format)
     */
    private syncAllenHark;
    /**
     * Sync Phantom NFT Blocklist (YAML list of malicious NFT mint addresses)
     */
    private syncPhantomBlocklist;
    /**
     * Sync Solana Safety 101 domains (scam domain list)
     */
    private syncSolanaSafety101Domains;
    /**
     * Sync PhishDestroy destroylist (Web3 phishing domains)
     */
    private syncPhishDestroy;
    /**
     * Upsert malicious addresses into known_malicious_delegates (batched via unnest)
     */
    private upsertMaliciousAddresses;
    /**
     * Upsert malicious domains into malicious_domains table (batched via unnest)
     */
    private upsertMaliciousDomains;
    /**
     * Check if a domain is known scam/phishing
     */
    checkDomain(domain: string): Promise<{
        domain: string;
        isScam: boolean;
        sources: string[];
        status: string;
    }>;
    /**
     * Real-time address risk check via GoPlus Security API
     */
    checkAddressGoPlus(address: string): Promise<GoPlusAddressResult>;
    /**
     * Get enhanced transactions for an address using Helius API
     */
    getEnhancedTransactions(address: string, limit?: number): Promise<EnhancedTransaction[]>;
    /**
     * Parse transaction signatures using Helius Enhanced API (batch up to 100)
     */
    parseTransactionSignatures(signatures: string[]): Promise<EnhancedTransaction[]>;
    /**
     * Look up an entity with cache (24h TTL)
     * Returns null if Arkham is not configured or address is unknown
     */
    lookupEntityCached(address: string): Promise<ArkhamEntity | null>;
    /**
     * Direct Arkham API call. Returns null if not configured or not found.
     */
    lookupEntity(address: string): Promise<ArkhamEntity | null>;
    /**
     * Get all configured sources
     */
    getSources(): Promise<ThreatIntelSource[]>;
    /**
     * Get status of all sources with counts
     */
    getStatus(): Promise<{
        sources: ThreatIntelSource[];
        totalMaliciousAddresses: number;
        totalMaliciousDomains: number;
        totalEntityLabels: number;
        isSyncing: boolean;
    }>;
    /**
     * Clean up on shutdown
     */
    destroy(): void;
}
export declare const threatIntelligenceService: ThreatIntelligenceService;
export default threatIntelligenceService;
