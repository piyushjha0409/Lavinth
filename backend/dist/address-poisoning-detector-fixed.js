"use strict";
/**
 * Address Poisoning Detection Module
 *
 * This module provides advanced detection for address poisoning attacks with
 * confidence scoring to minimize false positives while effectively identifying
 * potential threats. It analyzes address similarity, transaction patterns, and
 * historical behavior to detect poisoning attempts.
 *
 * @module AddressPoisoningDetector
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
Object.defineProperty(exports, "__esModule", { value: true });
// Constants
const SIMILARITY_THRESHOLD = 0.8; // Addresses with similarity above this are considered similar
const LEGITIMACY_THRESHOLD = 0.6; // Addresses with legitimacy score below this are flagged
const DUST_THRESHOLD = 0.001; // SOL
const MIN_TRANSACTION_COUNT = 5; // Minimum transactions for an address to be considered legitimate
const MIN_TRANSACTION_VOLUME = 1; // Minimum SOL volume for legitimacy
const MAX_SUSPICIOUS_ADDRESSES = 3; // Maximum number of similar addresses before flagging as suspicious
const KEYBOARD_ADJACENCY_WEIGHT = 0.3; // Weight for keyboard adjacency in similarity calculation
class AddressPoisoningDetector {
    constructor(connection) {
        this.addressCache = new Map();
        this.similarityCache = new Map();
        this.connection = connection;
    }
    // Get address information including transaction history
    getAddressInfo(address) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache first
            if (this.addressCache.has(address)) {
                return this.addressCache.get(address);
            }
            // In a real implementation, this would query on-chain data
            // For now, we'll create a mock implementation
            const now = Date.now();
            const mockInfo = {
                address,
                firstSeen: now - Math.random() * 30 * 24 * 60 * 60 * 1000, // Random time in the last 30 days
                lastSeen: now - Math.random() * 24 * 60 * 60 * 1000, // Random time in the last day
                incomingTransactionCount: Math.floor(Math.random() * 50),
                outgoingTransactionCount: Math.floor(Math.random() * 30),
                totalTransactionVolume: Math.random() * 100,
                isLabeled: Math.random() > 0.8, // 20% chance of being labeled
                label: Math.random() > 0.8 ? 'Exchange' : undefined
            };
            // Cache the result
            this.addressCache.set(address, mockInfo);
            return mockInfo;
        });
    }
    // Find similar addresses in the user's transaction history
    findSimilarAddresses(address, userAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache first
            const cacheKey = `${address}-${userAddresses.join(',')}`;
            if (this.similarityCache.has(cacheKey)) {
                return this.similarityCache.get(cacheKey);
            }
            const results = [];
            for (const otherAddress of userAddresses) {
                if (address === otherAddress)
                    continue;
                const similarity = this.calculateAddressSimilarity(address, otherAddress);
                if (similarity.similarityScore >= SIMILARITY_THRESHOLD) {
                    results.push(similarity);
                }
            }
            // Sort by similarity score (highest first)
            results.sort((a, b) => b.similarityScore - a.similarityScore);
            // Cache the result
            this.similarityCache.set(cacheKey, results);
            return results;
        });
    }
    // Group similar addresses together
    groupSimilarAddresses(addresses) {
        return __awaiter(this, void 0, void 0, function* () {
            const groups = [];
            const processed = new Set();
            for (const address of addresses) {
                if (processed.has(address))
                    continue;
                const group = [address];
                processed.add(address);
                // Find all addresses similar to this one
                for (const otherAddress of addresses) {
                    if (processed.has(otherAddress) || address === otherAddress)
                        continue;
                    const similarity = this.calculateAddressSimilarity(address, otherAddress);
                    if (similarity.similarityScore >= SIMILARITY_THRESHOLD) {
                        group.push(otherAddress);
                        processed.add(otherAddress);
                    }
                }
                if (group.length > 1) {
                    // Get address info for all addresses in the group
                    const addressInfos = yield Promise.all(group.map(addr => this.getAddressInfo(addr)));
                    // Sort by firstSeen (oldest first)
                    addressInfos.sort((a, b) => a.firstSeen - b.firstSeen);
                    // Calculate average similarity
                    let totalSimilarity = 0;
                    let pairCount = 0;
                    for (let i = 0; i < group.length; i++) {
                        for (let j = i + 1; j < group.length; j++) {
                            totalSimilarity += this.calculateAddressSimilarity(group[i], group[j]).similarityScore;
                            pairCount++;
                        }
                    }
                    const averageSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;
                    // Assess if this group is a potential poisoning group
                    const assessment = this.assessGroupPoisoningLikelihood(addressInfos);
                    groups.push({
                        addresses: group,
                        oldestAddress: addressInfos[0].address,
                        newestAddress: addressInfos[addressInfos.length - 1].address,
                        averageSimilarity,
                        isPotentialPoisoningGroup: assessment.isPotentialPoisoning,
                        confidence: assessment.confidence
                    });
                }
            }
            return groups;
        });
    }
    // Assess if a group of similar addresses is likely a poisoning attempt
    assessGroupPoisoningLikelihood(addressInfos) {
        if (addressInfos.length <= 1) {
            return { isPotentialPoisoning: false, confidence: 1.0 };
        }
        // Sort by firstSeen (oldest first)
        addressInfos.sort((a, b) => a.firstSeen - b.firstSeen);
        // Factors that increase poisoning likelihood:
        // 1. Many similar addresses created in a short time span
        // 2. Newer addresses have very little transaction history
        // 3. Older address has significant transaction history
        // 4. More than 2-3 very similar addresses
        const oldestAddress = addressInfos[0];
        const newerAddresses = addressInfos.slice(1);
        // Check if oldest address is legitimate
        const oldestIsLegitimate = this.isAddressLikelyLegitimate(oldestAddress);
        // Check if newer addresses have suspicious characteristics
        const suspiciousNewerCount = newerAddresses.filter(addr => {
            // Suspicious if: low transaction count, low volume, and recently created
            return addr.incomingTransactionCount < MIN_TRANSACTION_COUNT &&
                addr.outgoingTransactionCount < 2 &&
                addr.totalTransactionVolume < MIN_TRANSACTION_VOLUME &&
                (Date.now() - addr.firstSeen) < 7 * 24 * 60 * 60 * 1000; // Created in the last week
        }).length;
        // Calculate time span between oldest and newest address
        const timeSpanDays = (addressInfos[addressInfos.length - 1].firstSeen - oldestAddress.firstSeen) / (24 * 60 * 60 * 1000);
        // Calculate confidence score
        let confidence = 0.5; // Start with neutral confidence
        // Adjust based on factors
        if (oldestIsLegitimate)
            confidence += 0.2;
        if (suspiciousNewerCount > 0)
            confidence += 0.1 * Math.min(suspiciousNewerCount, 5);
        if (addressInfos.length > MAX_SUSPICIOUS_ADDRESSES)
            confidence += 0.2;
        if (timeSpanDays < 30)
            confidence += 0.1; // More suspicious if created within a month
        // Cap confidence
        confidence = Math.min(confidence, 0.95);
        // Determine if this is likely a poisoning attempt
        const isPotentialPoisoning = confidence >= 0.7 && suspiciousNewerCount > 0;
        return {
            isPotentialPoisoning,
            confidence
        };
    }
    // Calculate visual similarity between two addresses
    // This focuses on characters that look similar (0/O, l/1, etc.)
    calculateVisualSimilarity(address1, address2) {
        if (address1 === address2)
            return 1.0;
        if (address1.length !== address2.length)
            return 0.0;
        // Define visually similar character groups
        const similarChars = {
            '0': ['O', 'Q', 'D'],
            'O': ['0', 'Q', 'D'],
            'l': ['1', 'I'],
            '1': ['l', 'I'],
            'I': ['l', '1'],
            '5': ['S'],
            'S': ['5'],
            '8': ['B'],
            'B': ['8'],
            'G': ['6'],
            '6': ['G'],
            'Z': ['2'],
            '2': ['Z']
        };
        let visualMatches = 0;
        for (let i = 0; i < address1.length; i++) {
            const char1 = address1[i];
            const char2 = address2[i];
            if (char1 === char2) {
                visualMatches++;
            }
            else {
                // Check if characters are visually similar
                const similarToChar1 = similarChars[char1] || [];
                if (similarToChar1.includes(char2)) {
                    visualMatches += 0.8; // Not a perfect match, but close
                }
            }
        }
        return visualMatches / address1.length;
    }
    // Calculate Levenshtein distance between two strings
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        // Create a matrix of size (m+1) x (n+1)
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        // Fill the first row and column
        for (let i = 0; i <= m; i++)
            dp[i][0] = i;
        for (let j = 0; j <= n; j++)
            dp[0][j] = j;
        // Fill the rest of the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                }
                else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], // deletion
                    dp[i][j - 1], // insertion
                    dp[i - 1][j - 1] // substitution
                    );
                }
            }
        }
        // Convert to similarity score (0-1 range)
        const maxLength = Math.max(m, n);
        return maxLength > 0 ? 1 - (dp[m][n] / maxLength) : 1;
    }
    // Calculate prefix and suffix similarity
    calculatePrefixSimilarity(address1, address2) {
        if (address1 === address2)
            return 1.0;
        if (address1.length === 0 || address2.length === 0)
            return 0.0;
        // Find the longest common prefix
        let prefixLength = 0;
        const minLength = Math.min(address1.length, address2.length);
        while (prefixLength < minLength && address1[prefixLength] === address2[prefixLength]) {
            prefixLength++;
        }
        // Find the longest common suffix
        let suffixLength = 0;
        while (suffixLength < minLength - prefixLength &&
            address1[address1.length - 1 - suffixLength] === address2[address2.length - 1 - suffixLength]) {
            suffixLength++;
        }
        // Calculate similarity based on common prefix and suffix
        const commonLength = prefixLength + suffixLength;
        const maxLength = Math.max(address1.length, address2.length);
        return commonLength / maxLength;
    }
    // Calculate keyboard adjacency similarity
    // This checks if characters are adjacent on a keyboard
    calculateKeyboardSimilarity(address1, address2) {
        if (address1 === address2)
            return 1.0;
        if (address1.length !== address2.length)
            return 0.0;
        // Define keyboard adjacency map (QWERTY layout)
        const keyboardAdjacency = {
            'q': ['w', '1', '2'],
            'w': ['q', 'e', '2', '3'],
            'e': ['w', 'r', '3', '4'],
            'r': ['e', 't', '4', '5'],
            't': ['r', 'y', '5', '6'],
            'y': ['t', 'u', '6', '7'],
            'u': ['y', 'i', '7', '8'],
            'i': ['u', 'o', '8', '9'],
            'o': ['i', 'p', '9', '0'],
            'p': ['o', '0'],
            'a': ['q', 'w', 's', 'z'],
            's': ['a', 'w', 'e', 'd', 'x', 'z'],
            'd': ['s', 'e', 'r', 'f', 'c', 'x'],
            'f': ['d', 'r', 't', 'g', 'v', 'c'],
            'g': ['f', 't', 'y', 'h', 'b', 'v'],
            'h': ['g', 'y', 'u', 'j', 'n', 'b'],
            'j': ['h', 'u', 'i', 'k', 'm', 'n'],
            'k': ['j', 'i', 'o', 'l', 'm'],
            'l': ['k', 'o', 'p'],
            'z': ['a', 's', 'x'],
            'x': ['z', 's', 'd', 'c'],
            'c': ['x', 'd', 'f', 'v'],
            'v': ['c', 'f', 'g', 'b'],
            'b': ['v', 'g', 'h', 'n'],
            'n': ['b', 'h', 'j', 'm'],
            'm': ['n', 'j', 'k'],
            '1': ['q', '2'],
            '2': ['1', 'q', 'w', '3'],
            '3': ['2', 'w', 'e', '4'],
            '4': ['3', 'e', 'r', '5'],
            '5': ['4', 'r', 't', '6'],
            '6': ['5', 't', 'y', '7'],
            '7': ['6', 'y', 'u', '8'],
            '8': ['7', 'u', 'i', '9'],
            '9': ['8', 'i', 'o', '0'],
            '0': ['9', 'o', 'p']
        };
        let adjacentMatches = 0;
        for (let i = 0; i < address1.length; i++) {
            const char1 = address1[i].toLowerCase();
            const char2 = address2[i].toLowerCase();
            if (char1 === char2) {
                adjacentMatches++;
            }
            else {
                // Check if characters are adjacent on keyboard
                const adjacentToChar1 = keyboardAdjacency[char1] || [];
                if (adjacentToChar1.includes(char2)) {
                    adjacentMatches += 0.5; // Adjacent but not exact match
                }
            }
        }
        return adjacentMatches / address1.length;
    }
    // Calculate comprehensive similarity score between two addresses
    calculateAddressSimilarity(address1, address2) {
        // If addresses are identical, return perfect similarity
        if (address1 === address2) {
            return {
                address1,
                address2,
                similarityScore: 1.0,
                visualSimilarity: 1.0,
                levenshteinSimilarity: 1.0,
                prefixSimilarity: 1.0
            };
        }
        // Calculate different similarity metrics
        const visualSimilarity = this.calculateVisualSimilarity(address1, address2);
        const levenshteinSimilarity = this.levenshteinDistance(address1, address2);
        const prefixSimilarity = this.calculatePrefixSimilarity(address1, address2);
        const keyboardSimilarity = this.calculateKeyboardSimilarity(address1, address2);
        // Weight the different metrics to get a comprehensive score
        // Visual similarity is most important for poisoning detection
        const similarityScore = (visualSimilarity * 0.4 +
            levenshteinSimilarity * 0.3 +
            prefixSimilarity * 0.2 +
            keyboardSimilarity * KEYBOARD_ADJACENCY_WEIGHT);
        return {
            address1,
            address2,
            similarityScore,
            visualSimilarity,
            levenshteinSimilarity,
            prefixSimilarity
        };
    }
    // Classify an address to determine if it's potentially a poisoned address
    classifyAddress(address, userAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get address info
            const addressInfo = yield this.getAddressInfo(address);
            // Find similar addresses
            const similarAddresses = yield this.findSimilarAddresses(address, userAddresses);
            // Calculate legitimacy score
            let legitimacyScore = 0.5; // Start with neutral score
            // Adjust based on address characteristics
            if (addressInfo.incomingTransactionCount > MIN_TRANSACTION_COUNT)
                legitimacyScore += 0.1;
            if (addressInfo.outgoingTransactionCount > 2)
                legitimacyScore += 0.2;
            if (addressInfo.totalTransactionVolume > MIN_TRANSACTION_VOLUME)
                legitimacyScore += 0.1;
            if (Date.now() - addressInfo.firstSeen > 30 * 24 * 60 * 60 * 1000)
                legitimacyScore += 0.1; // Older than 30 days
            if (addressInfo.isLabeled)
                legitimacyScore += 0.2;
            // Adjust based on similar addresses
            if (similarAddresses.length > MAX_SUSPICIOUS_ADDRESSES)
                legitimacyScore -= 0.2;
            // Cap legitimacy score
            legitimacyScore = Math.max(0.1, Math.min(legitimacyScore, 0.9));
            // Determine if address is potentially poisoned
            const isPotentiallyPoisoned = legitimacyScore < LEGITIMACY_THRESHOLD;
            // Calculate confidence in this assessment
            const confidence = Math.abs(legitimacyScore - 0.5) * 2; // 0-1 range, higher = more confident
            // Determine suggested action
            let suggestedAction;
            if (legitimacyScore < 0.3) {
                suggestedAction = 'block';
            }
            else if (legitimacyScore < 0.5) {
                suggestedAction = 'warn';
            }
            else if (legitimacyScore < 0.7) {
                suggestedAction = 'monitor';
            }
            else {
                suggestedAction = 'safe';
            }
            // Enrich similar addresses with legitimacy assessment
            const enrichedSimilarAddresses = yield Promise.all(similarAddresses.map((sim) => __awaiter(this, void 0, void 0, function* () {
                const otherAddressInfo = yield this.getAddressInfo(sim.address2);
                return {
                    address: sim.address2,
                    similarityScore: sim.similarityScore,
                    isLikelyLegitimate: this.isAddressLikelyLegitimate(otherAddressInfo)
                };
            })));
            return {
                address,
                isPotentiallyPoisoned,
                legitimacyScore,
                confidence,
                suggestedAction,
                similarAddresses: enrichedSimilarAddresses
            };
        });
    }
    // Determine if an address is likely legitimate based on its characteristics
    isAddressLikelyLegitimate(addressInfo) {
        // An address is likely legitimate if it has:
        // 1. Significant transaction history
        // 2. Both incoming and outgoing transactions
        // 3. Reasonable transaction volume
        // 4. Has been around for some time
        // 5. Is labeled (e.g., known exchange)
        const hasSignificantHistory = addressInfo.incomingTransactionCount + addressInfo.outgoingTransactionCount >= MIN_TRANSACTION_COUNT;
        const hasBidirectionalTransactions = addressInfo.incomingTransactionCount > 0 && addressInfo.outgoingTransactionCount > 0;
        const hasReasonableVolume = addressInfo.totalTransactionVolume >= MIN_TRANSACTION_VOLUME;
        const isEstablished = (Date.now() - addressInfo.firstSeen) >= 14 * 24 * 60 * 60 * 1000; // At least 2 weeks old
        // Calculate a legitimacy score
        let legitimacyPoints = 0;
        if (hasSignificantHistory)
            legitimacyPoints++;
        if (hasBidirectionalTransactions)
            legitimacyPoints++;
        if (hasReasonableVolume)
            legitimacyPoints++;
        if (isEstablished)
            legitimacyPoints++;
        if (addressInfo.isLabeled)
            legitimacyPoints += 2; // Strong indicator of legitimacy
        // Address is likely legitimate if it has at least 3 points
        return legitimacyPoints >= 3;
    }
    // Validate a transaction address before sending funds
    // Returns a warning if the address might be poisoned
    validateTransactionAddress(selectedAddress, userHistory) {
        return __awaiter(this, void 0, void 0, function* () {
            // Classify the address
            const classification = yield this.classifyAddress(selectedAddress, userHistory);
            // If the address is potentially poisoned with high confidence
            if (classification.isPotentiallyPoisoned && classification.confidence > 0.7) {
                // Find the most legitimate similar address
                const legitimateAddress = classification.similarAddresses.find(addr => addr.isLikelyLegitimate);
                if (legitimateAddress) {
                    // We found a legitimate address that's similar - this is likely a poisoning attempt
                    return {
                        isValid: false,
                        warningLevel: 'high',
                        message: `WARNING: This appears to be a poisoned address similar to ${legitimateAddress.address}. We strongly recommend using the suggested address instead.`,
                        suggestedAddress: legitimateAddress.address,
                        similarAddresses: classification.similarAddresses
                    };
                }
                else {
                    // No legitimate similar address found, but still suspicious
                    return {
                        isValid: false,
                        warningLevel: 'medium',
                        message: `Caution: This address is similar to others in your history but has suspicious characteristics. Please verify before sending funds.`,
                        similarAddresses: classification.similarAddresses
                    };
                }
            }
            else if (classification.legitimacyScore < 0.7) {
                // Not clearly poisoned, but not clearly safe either
                return {
                    isValid: true,
                    warningLevel: 'low',
                    message: `Note: This address is similar to others in your transaction history. Please verify it's the correct recipient.`,
                    similarAddresses: classification.similarAddresses
                };
            }
            // Address seems legitimate
            return {
                isValid: true,
                warningLevel: 'none'
            };
        });
    }
}
