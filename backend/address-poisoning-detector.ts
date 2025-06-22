/**
 * Address Poisoning Detection Module
 *
 * This module provides advanced detection for address poisoning attacks with
 * confidence scoring to minimize false positives while effectively identifying
 * malicious similar addresses.
 */
import { Connection } from "@solana/web3.js";
import db from "./db/db-utils";
export interface AddressInfo {
  address: string;
  firstSeen: number; // timestamp
  lastSeen: number; // timestamp
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
  suggestedAction: "block" | "warn" | "monitor" | "safe";
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

const SIMILARITY_THRESHOLD = 0.8;
const LEGITIMACY_THRESHOLD = 0.6;
const DUST_THRESHOLD = 0.001;
const MIN_TRANSACTION_COUNT = 3;
const KEYBOARD_ADJACENCY_MAP: { [key: string]: string[] } = {
  "1": ["2", "q"],
  "2": ["1", "3", "q", "w"],
};

export class AddressPoisoningDetector {
  private connection: Connection;
  private addressCache: Map<string, AddressInfo> = new Map();
  private similarityCache: Map<string, SimilarityResult[]> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async getAddressInfo(address: string): Promise<AddressInfo> {
    if (this.addressCache.has(address)) {
      return this.addressCache.get(address)!;
    }

    try {
      const result = await db.pool.query(
        `SELECT 
           MIN(timestamp) as first_seen,
           MAX(timestamp) as last_seen,
           COUNT(*) FILTER (WHERE recipient = $1) as incoming_count,
           COUNT(*) FILTER (WHERE sender = $1) as outgoing_count,
           SUM(amount) as total_volume,
           EXISTS(SELECT 1 FROM address_labels WHERE address = $1) as is_labeled,
           (SELECT label FROM address_labels WHERE address = $1 LIMIT 1) as label
         FROM transactions 
         WHERE sender = $1 OR recipient = $1`,
        [address]
      );

      const row = result.rows[0];
      const addressInfo: AddressInfo = {
        address,
        firstSeen: row?.first_seen
          ? new Date(row.first_seen).getTime()
          : Date.now(),
        lastSeen: row?.last_seen
          ? new Date(row.last_seen).getTime()
          : Date.now(),
        incomingTransactionCount: parseInt(row?.incoming_count || "0"),
        outgoingTransactionCount: parseInt(row?.outgoing_count || "0"),
        totalTransactionVolume: parseFloat(row?.total_volume || "0"),
        isLabeled: row?.is_labeled || false,
        label: row?.label || undefined,
      };

      this.addressCache.set(address, addressInfo);
      return addressInfo;
    } catch (error) {
      console.error(`Error fetching address info for ${address}:`, error);
      return {
        address,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        incomingTransactionCount: 0,
        outgoingTransactionCount: 0,
        totalTransactionVolume: 0,
        isLabeled: false,
      };
    }
  }

  /**
   * Find similar addresses in the user's transaction history
   */
  public async findSimilarAddresses(
    address: string,
    userAddresses: string[]
  ): Promise<SimilarityResult[]> {
    // Check cache first
    const cacheKey = `${address}_${userAddresses.length}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    const results: SimilarityResult[] = [];

    for (const otherAddress of userAddresses) {
      if (address === otherAddress) continue;

      const similarity = this.calculateAddressSimilarity(address, otherAddress);
      if (similarity.similarityScore >= SIMILARITY_THRESHOLD) {
        results.push(similarity);
      }
    }

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.similarityScore - a.similarityScore);

    // Cache the results
    this.similarityCache.set(cacheKey, results);
    return results;
  }

  /**
   * Group similar addresses together
   */
  public async groupSimilarAddresses(
    addresses: string[]
  ): Promise<AddressGroup[]> {
    const groups: AddressGroup[] = [];
    const processed = new Set<string>();

    for (const address of addresses) {
      if (processed.has(address)) continue;

      const similarAddresses = await this.findSimilarAddresses(
        address,
        addresses
      );
      if (similarAddresses.length > 0) {
        // Create a group with this address and all similar addresses
        const groupAddresses = [
          address,
          ...similarAddresses.map((s) => s.address2),
        ];

        // Mark all addresses in this group as processed
        groupAddresses.forEach((addr) => processed.add(addr));

        // Get address info for all addresses in the group
        const addressInfos = await Promise.all(
          groupAddresses.map((addr) => this.getAddressInfo(addr))
        );

        // Sort by first seen timestamp
        addressInfos.sort((a, b) => a.firstSeen - b.firstSeen);

        const oldestAddress = addressInfos[0].address;
        const newestAddress = addressInfos[addressInfos.length - 1].address;

        // Calculate average similarity within the group
        let totalSimilarity = 0;
        let pairCount = 0;

        for (let i = 0; i < groupAddresses.length; i++) {
          for (let j = i + 1; j < groupAddresses.length; j++) {
            const similarity = this.calculateAddressSimilarity(
              groupAddresses[i],
              groupAddresses[j]
            );
            totalSimilarity += similarity.similarityScore;
            pairCount++;
          }
        }

        const averageSimilarity =
          pairCount > 0 ? totalSimilarity / pairCount : 0;

        // Determine if this is a potential poisoning group
        const isPotentialPoisoningGroup =
          this.assessGroupPoisoningLikelihood(addressInfos);

        groups.push({
          addresses: groupAddresses,
          oldestAddress,
          newestAddress,
          averageSimilarity,
          isPotentialPoisoningGroup:
            isPotentialPoisoningGroup.isPotentialPoisoning,
          confidence: isPotentialPoisoningGroup.confidence,
        });
      } else {
        // No similar addresses, mark as processed
        processed.add(address);
      }
    }

    return groups;
  }

  /**
   * Assess if a group of similar addresses is likely a poisoning attempt
   */
  private assessGroupPoisoningLikelihood(addressInfos: AddressInfo[]): {
    isPotentialPoisoning: boolean;
    confidence: number;
  } {
    if (addressInfos.length < 2) {
      return { isPotentialPoisoning: false, confidence: 1 };
    }

    // Sort by first seen timestamp
    addressInfos.sort((a, b) => a.firstSeen - b.firstSeen);

    const oldestAddress = addressInfos[0];
    const newerAddresses = addressInfos.slice(1);

    // Factors that suggest poisoning
    let poisoningFactors = 0;
    let maxFactors = 0;

    // 1. Time gap between oldest and newer addresses
    const MIN_SUSPICIOUS_TIME_GAP = 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const addr of newerAddresses) {
      const timeGap = addr.firstSeen - oldestAddress.firstSeen;
      if (timeGap > MIN_SUSPICIOUS_TIME_GAP) {
        poisoningFactors++;
      }
      maxFactors++;
    }

    // 2. Transaction volume disparity
    for (const addr of newerAddresses) {
      if (
        oldestAddress.totalTransactionVolume >
        10 * addr.totalTransactionVolume
      ) {
        poisoningFactors++;
      }
      maxFactors++;
    }

    // 3. Transaction pattern disparity
    for (const addr of newerAddresses) {
      const oldestHasBidirectional =
        oldestAddress.incomingTransactionCount > 0 &&
        oldestAddress.outgoingTransactionCount > 0;
      const newerHasBidirectional =
        addr.incomingTransactionCount > 0 && addr.outgoingTransactionCount > 0;

      if (oldestHasBidirectional && !newerHasBidirectional) {
        poisoningFactors++;
      }
      maxFactors++;
    }

    // 4. Labeling - if oldest is labeled but newer ones aren't
    if (oldestAddress.isLabeled) {
      for (const addr of newerAddresses) {
        if (!addr.isLabeled) {
          poisoningFactors++;
        }
        maxFactors++;
      }
    }

    // Calculate poisoning likelihood
    const poisoningLikelihood =
      maxFactors > 0 ? poisoningFactors / maxFactors : 0;

    // Calculate confidence based on amount of data
    const totalTransactions = addressInfos.reduce(
      (sum, addr) =>
        sum + addr.incomingTransactionCount + addr.outgoingTransactionCount,
      0
    );
    const confidenceFactor = Math.min(1, totalTransactions / 20); // More transactions = higher confidence

    // Adjust confidence based on how far from 0.5 the likelihood is
    const decisionConfidence = Math.abs(poisoningLikelihood - 0.5) * 2;

    const finalConfidence = (confidenceFactor + decisionConfidence) / 2;

    return {
      isPotentialPoisoning: poisoningLikelihood > 0.5,
      confidence: finalConfidence,
    };
  }

  /**
   * Calculate visual similarity between two addresses
   * This focuses on characters that look similar (0/O, l/1, etc.)
   */
  private calculateVisualSimilarity(
    address1: string,
    address2: string
  ): number {
    if (address1.length !== address2.length) return 0;

    // Characters that look similar
    const visuallyConfusablePairs = [
      ["0", "O"],
      ["1", "l", "I"],
      ["5", "S"],
      ["8", "B"],
      ["m", "n"],
      ["g", "q"],
      ["p", "q"],
      ["v", "w"],
    ];

    // Create a map for quick lookups
    const confusableMap = new Map<string, Set<string>>();
    visuallyConfusablePairs.forEach((group) => {
      group.forEach((char) => {
        const confusables = new Set(group.filter((c) => c !== char));
        confusableMap.set(char, confusables);
      });
    });

    let visualMatches = 0;
    for (let i = 0; i < address1.length; i++) {
      const char1 = address1[i];
      const char2 = address2[i];

      if (char1 === char2) {
        visualMatches++;
      } else {
        // Check if they're visually confusable
        const confusables = confusableMap.get(char1);
        if (confusables && confusables.has(char2)) {
          visualMatches += 0.8; // Partial match for visually similar chars
        }
      }
    }

    return visualMatches / address1.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a matrix of size (m+1) x (n+1)
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize the first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the dp matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate prefix and suffix similarity
   */
  private calculatePrefixSimilarity(
    address1: string,
    address2: string
  ): number {
    // Check for common prefix and suffix
    let prefixLength = 0;
    const minLength = Math.min(address1.length, address2.length);

    // Common prefix
    for (let i = 0; i < minLength; i++) {
      if (address1[i] === address2[i]) {
        prefixLength++;
      } else {
        break;
      }
    }

    // Common suffix
    let suffixLength = 0;
    for (let i = 0; i < minLength; i++) {
      if (
        address1[address1.length - 1 - i] === address2[address2.length - 1 - i]
      ) {
        suffixLength++;
      } else {
        break;
      }
    }

    // Calculate similarity based on prefix and suffix
    const prefixRatio = prefixLength / minLength;
    const suffixRatio = suffixLength / minLength;

    return (prefixRatio + suffixRatio) / 2;
  }

  /**
   * Calculate keyboard adjacency similarity
   * This checks if characters are adjacent on a keyboard
   */
  private calculateKeyboardSimilarity(
    address1: string,
    address2: string
  ): number {
    if (address1.length !== address2.length) return 0;

    let adjacencyMatches = 0;
    for (let i = 0; i < address1.length; i++) {
      const char1 = address1[i].toLowerCase();
      const char2 = address2[i].toLowerCase();

      if (char1 === char2) {
        adjacencyMatches++;
      } else if (
        KEYBOARD_ADJACENCY_MAP[char1] &&
        KEYBOARD_ADJACENCY_MAP[char1].includes(char2)
      ) {
        adjacencyMatches += 0.7; // Partial match for keyboard-adjacent chars
      }
    }

    return adjacencyMatches / address1.length;
  }

  /**
   * Calculate comprehensive similarity score between two addresses
   */
  public calculateAddressSimilarity(
    address1: string,
    address2: string
  ): SimilarityResult {
    // Calculate different similarity metrics
    const visualSimilarity = this.calculateVisualSimilarity(address1, address2);
    const levenshteinSimilarity =
      1 -
      this.levenshteinDistance(address1, address2) /
        Math.max(address1.length, address2.length);
    const prefixSimilarity = this.calculatePrefixSimilarity(address1, address2);
    const keyboardSimilarity = this.calculateKeyboardSimilarity(
      address1,
      address2
    );

    // Weighted combination of metrics
    const similarityScore =
      0.4 * visualSimilarity +
      0.3 * levenshteinSimilarity +
      0.2 * prefixSimilarity +
      0.1 * keyboardSimilarity;

    return {
      address1,
      address2,
      similarityScore,
      visualSimilarity,
      levenshteinSimilarity,
      prefixSimilarity,
    };
  }

  /**
   * Classify an address to determine if it's potentially a poisoned address
   */
  public async classifyAddress(
    address: string,
    userAddresses: string[]
  ): Promise<AddressClassification> {
    // Get address info
    const addressInfo = await this.getAddressInfo(address);

    // Find similar addresses
    const similarAddresses = await this.findSimilarAddresses(
      address,
      userAddresses
    );

    if (similarAddresses.length === 0) {
      // No similar addresses found, considered safe
      return {
        address,
        isPotentiallyPoisoned: false,
        legitimacyScore: 1,
        confidence: 1,
        suggestedAction: "safe",
        similarAddresses: [],
      };
    }

    // Get info for all similar addresses
    const similarAddressInfos = await Promise.all(
      similarAddresses.map(async (similarity) => {
        const info = await this.getAddressInfo(similarity.address2);
        return {
          similarity,
          info,
        };
      })
    );

    // Sort by first seen (oldest first)
    similarAddressInfos.sort((a, b) => a.info.firstSeen - b.info.firstSeen);

    // Calculate legitimacy score based on multiple factors
    let legitimacyScore = 0.5; // Start neutral

    // Factor 1: Address age compared to similar addresses
    const oldestSimilarAddress = similarAddressInfos[0].info;
    if (addressInfo.firstSeen < oldestSimilarAddress.firstSeen) {
      // This address is older than all similar addresses, more likely legitimate
      legitimacyScore += 0.15;
    } else {
      const ageGap = addressInfo.firstSeen - oldestSimilarAddress.firstSeen;
      const AGE_PENALTY_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (ageGap > AGE_PENALTY_THRESHOLD) {
        // Much newer than the oldest similar address, suspicious
        legitimacyScore -= 0.15;
      }
    }

    // Factor 2: Transaction patterns
    const hasBidirectionalHistory =
      addressInfo.incomingTransactionCount > 0 &&
      addressInfo.outgoingTransactionCount > 0;
    if (hasBidirectionalHistory) {
      // Addresses with both incoming and outgoing transactions are more likely legitimate
      legitimacyScore += 0.1;
    } else if (
      addressInfo.incomingTransactionCount > 0 &&
      addressInfo.outgoingTransactionCount === 0
    ) {
      // Only receiving funds, could be suspicious
      legitimacyScore -= 0.05;
    }

    // Factor 3: Transaction volume
    if (addressInfo.totalTransactionVolume > DUST_THRESHOLD * 100) {
      // Addresses with substantial transaction volume are more likely legitimate
      legitimacyScore += 0.1;
    } else if (addressInfo.totalTransactionVolume <= DUST_THRESHOLD) {
      // Very small transaction volume, suspicious
      legitimacyScore -= 0.1;
    }

    // Factor 4: Labeling
    if (addressInfo.isLabeled) {
      // Labeled addresses are more likely legitimate
      legitimacyScore += 0.2;
    }

    // Factor 5: Transaction count
    if (
      addressInfo.incomingTransactionCount +
        addressInfo.outgoingTransactionCount >=
      MIN_TRANSACTION_COUNT
    ) {
      // Addresses with more transactions are more likely legitimate
      legitimacyScore += 0.05;
    }

    // Ensure score is between 0 and 1
    legitimacyScore = Math.max(0, Math.min(1, legitimacyScore));

    // Calculate confidence based on amount of data
    const transactionCount =
      addressInfo.incomingTransactionCount +
      addressInfo.outgoingTransactionCount;
    const confidenceFactor = Math.min(1, transactionCount / 10); // More transactions = higher confidence

    // Adjust confidence based on how far from 0.5 the legitimacy score is
    const decisionConfidence = Math.abs(legitimacyScore - 0.5) * 2;

    const finalConfidence = (confidenceFactor + decisionConfidence) / 2;

    // Determine if the address is potentially poisoned
    const isPotentiallyPoisoned = legitimacyScore < LEGITIMACY_THRESHOLD;

    // Determine suggested action based on legitimacy score and confidence
    let suggestedAction: "block" | "warn" | "monitor" | "safe";
    if (legitimacyScore < 0.3 && finalConfidence > 0.7) {
      suggestedAction = "block";
    } else if (legitimacyScore < LEGITIMACY_THRESHOLD) {
      suggestedAction = "warn";
    } else if (legitimacyScore < 0.7) {
      suggestedAction = "monitor";
    } else {
      suggestedAction = "safe";
    }

    // Prepare similar addresses for the result
    const similarAddressesResult = similarAddressInfos.map((item) => ({
      address: item.info.address,
      similarityScore: item.similarity.similarityScore,
      isLikelyLegitimate: this.isAddressLikelyLegitimate(item.info),
    }));

    return {
      address,
      isPotentiallyPoisoned,
      legitimacyScore,
      confidence: finalConfidence,
      suggestedAction,
      similarAddresses: similarAddressesResult,
    };
  }

  /**
   * Determine if an address is likely legitimate based on its characteristics
   */
  private isAddressLikelyLegitimate(addressInfo: AddressInfo): boolean {
    // Labeled addresses are considered legitimate
    if (addressInfo.isLabeled) return true;

    // Addresses with bidirectional transaction history are more likely legitimate
    const hasBidirectionalHistory =
      addressInfo.incomingTransactionCount > 0 &&
      addressInfo.outgoingTransactionCount > 0;

    // Addresses with substantial transaction volume are more likely legitimate
    const hasSubstantialVolume =
      addressInfo.totalTransactionVolume > DUST_THRESHOLD * 100;

    // Addresses with many transactions are more likely legitimate
    const hasMultipleTransactions =
      addressInfo.incomingTransactionCount +
        addressInfo.outgoingTransactionCount >=
      MIN_TRANSACTION_COUNT;

    // Consider legitimate if it meets at least two of the criteria
    let legitimacyFactors = 0;
    if (hasBidirectionalHistory) legitimacyFactors++;
    if (hasSubstantialVolume) legitimacyFactors++;
    if (hasMultipleTransactions) legitimacyFactors++;

    return legitimacyFactors >= 2;
  }

  /**
   * Validate a transaction address before sending funds
   * Returns a warning if the address might be poisoned
   */
  public async validateTransactionAddress(
    selectedAddress: string,
    userHistory: string[]
  ): Promise<{
    isValid: boolean;
    warningLevel: "none" | "low" | "medium" | "high";
    message?: string;
    suggestedAddress?: string;
    similarAddresses?: Array<{ address: string; similarityScore: number }>;
  }> {
    // Classify the address
    const classification = await this.classifyAddress(
      selectedAddress,
      userHistory
    );

    if (classification.similarAddresses.length === 0) {
      // No similar addresses, considered safe
      return {
        isValid: true,
        warningLevel: "none",
      };
    }

    // Find any legitimate similar addresses
    const legitimateSimilarAddresses = classification.similarAddresses
      .filter((addr) => addr.isLikelyLegitimate)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    if (classification.isPotentiallyPoisoned) {
      // This address is potentially poisoned
      if (legitimateSimilarAddresses.length > 0) {
        // There's a legitimate similar address that might be the intended recipient
        return {
          isValid: false,
          warningLevel: "high",
          message: `Warning: This address appears to be similar to another address you've used more frequently. This could be an address poisoning attempt.`,
          suggestedAddress: legitimateSimilarAddresses[0].address,
          similarAddresses: classification.similarAddresses,
        };
      } else {
        // No legitimate similar address found, but still suspicious
        return {
          isValid: false,
          warningLevel: "medium",
          message: `Caution: This address is similar to others in your history but has suspicious characteristics. Please verify before sending funds.`,
          similarAddresses: classification.similarAddresses,
        };
      }
    } else if (classification.legitimacyScore < 0.7) {
      // Not clearly poisoned, but not clearly safe either
      return {
        isValid: true,
        warningLevel: "low",
        message: `Note: This address is similar to others in your transaction history. Please verify it's the correct recipient.`,
        similarAddresses: classification.similarAddresses,
      };
    }

    // Address seems legitimate
    return {
      isValid: true,
      warningLevel: "none",
    };
  }
}
