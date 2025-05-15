/**
 * Address Poisoning Detection Module
 *
 * This module provides advanced detection for address poisoning attacks with
 * confidence scoring to minimize false positives while effectively identifying
 * malicious similar addresses.
 */
import { Connection } from '@solana/web3.js';
export interface AddressInfo {
    address: string;
    firstSeen: number;
    lastSeen: number;
    incomingTransactionCount: number;
    outgoingTransactionCount: number;
    totalTransactionVolume: number;
    isLabeled: boolean;
    label?: string;
}
export interface SimilarityResult {
    address1: string;
    address2: string;
    similarityScore: number;
    visualSimilarity: number;
    levenshteinSimilarity: number;
    prefixSimilarity: number;
}
export interface AddressClassification {
    address: string;
    isPotentiallyPoisoned: boolean;
    legitimacyScore: number;
    confidence: number;
    suggestedAction: 'block' | 'warn' | 'monitor' | 'safe';
    similarAddresses: Array<{
        address: string;
        similarityScore: number;
        isLikelyLegitimate: boolean;
    }>;
}
export interface AddressGroup {
    addresses: string[];
    oldestAddress: string;
    newestAddress: string;
    averageSimilarity: number;
    isPotentialPoisoningGroup: boolean;
    confidence: number;
}
export declare class AddressPoisoningDetector {
    private connection;
    private addressCache;
    private similarityCache;
    constructor(connection: Connection);
    /**
     * Get address information including transaction history
     */
    getAddressInfo(address: string): Promise<AddressInfo>;
    /**
     * Find similar addresses in the user's transaction history
     */
    findSimilarAddresses(address: string, userAddresses: string[]): Promise<SimilarityResult[]>;
    /**
     * Group similar addresses together
     */
    groupSimilarAddresses(addresses: string[]): Promise<AddressGroup[]>;
    /**
     * Assess if a group of similar addresses is likely a poisoning attempt
     */
    private assessGroupPoisoningLikelihood;
    /**
     * Calculate visual similarity between two addresses
     * This focuses on characters that look similar (0/O, l/1, etc.)
     */
    private calculateVisualSimilarity;
    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance;
    /**
     * Calculate prefix and suffix similarity
     */
    private calculatePrefixSimilarity;
    /**
     * Calculate keyboard adjacency similarity
     * This checks if characters are adjacent on a keyboard
     */
    private calculateKeyboardSimilarity;
    /**
     * Calculate comprehensive similarity score between two addresses
     */
    calculateAddressSimilarity(address1: string, address2: string): SimilarityResult;
    /**
     * Classify an address to determine if it's potentially a poisoned address
     */
    classifyAddress(address: string, userAddresses: string[]): Promise<AddressClassification>;
    /**
     * Determine if an address is likely legitimate based on its characteristics
     */
    private isAddressLikelyLegitimate;
    /**
     * Validate a transaction address before sending funds
     * Returns a warning if the address might be poisoned
     */
    validateTransactionAddress(selectedAddress: string, userHistory: string[]): Promise<{
        isValid: boolean;
        warningLevel: 'none' | 'low' | 'medium' | 'high';
        message?: string;
        suggestedAddress?: string;
        similarAddresses?: Array<{
            address: string;
            similarityScore: number;
        }>;
    }>;
}
