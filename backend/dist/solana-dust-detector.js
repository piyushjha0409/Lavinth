"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
// Remove the direct import of p-limit
// import pLimit from 'p-limit';
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const db_utils_1 = __importDefault(require("./db/db-utils"));
// Import our wrapper
const createLimiter = require("./p-limit-wrapper");
// Load environment variables
dotenv.config();
// Initialize database
db_utils_1.default.initializeDatabase().catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
});
// Third-party API configurations
const CHAINALYSIS_API_KEY = process.env.CHAINALYSIS_API_KEY || "";
const TRM_LABS_API_KEY = process.env.TRM_LABS_API_KEY || "";
// Parse Helius API keys from environment variable
console.log("Raw HELIUS_API_KEYS env variable:", process.env.HELIUS_API_KEYS);
const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
    .split(",")
    .map(key => key.trim())
    .filter((key) => key.length > 0);
console.log("Parsed HELIUS_API_KEYS array:", HELIUS_API_KEYS);
console.log(`Found ${HELIUS_API_KEYS.length} Helius API keys`);
if (HELIUS_API_KEYS.length === 0) {
    throw new Error("No Helius API keys configured. Please set HELIUS_API_KEYS in .env file");
}
// Parse Helius API keys from environment variable
console.log("HELIUS API KEYS", HELIUS_API_KEYS);
const RPC_ENDPOINTS = HELIUS_API_KEYS.map(apiKey => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`);
// Advanced configuration
const CONFIG = {
    output: {
        file: process.env.OUTPUT_FILE || "solana_transactions_data.json",
        riskReportFile: process.env.RISK_REPORT_FILE || "risk_analysis_report.json",
    },
    processing: {
        batchSize: parseInt(process.env.BATCH_SIZE || "5"),
        requestDelay: parseInt(process.env.REQUEST_DELAY || "1000"),
        maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
        initialBackoff: parseInt(process.env.INITIAL_BACKOFF || "1000"),
        maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || "3"),
    },
    thresholds: {
        dust: {
            sol: parseFloat(process.env.DUST_THRESHOLD_SOL || "0.001"),
            updateInterval: parseInt(process.env.UPDATE_INTERVAL || "3600000"), // 1 hour
            networkFeeMultiplier: parseInt(process.env.NETWORK_FEE_MULTIPLIER || "10"), // Dust threshold = current network fee * multiplier
        },
        detection: {
            minTransfers: parseInt(process.env.MIN_TRANSFERS || "3"),
            blocksToAnalyze: parseInt(process.env.BLOCKS_TO_ANALYZE || "500"),
            maxAddresses: parseInt(process.env.MAX_ADDRESSES || "200"),
            highActivity: parseInt(process.env.HIGH_ACTIVITY || "5"),
            timeWindow: parseInt(process.env.TIME_WINDOW || "86400000"), // 24 hours
            addressSimilarity: parseFloat(process.env.ADDRESS_SIMILARITY || "0.85"),
        },
    },
};
// Risk scoring configuration
const RISK_WEIGHTS = {
    dustAmount: parseFloat(process.env.RISK_WEIGHT_DUST_AMOUNT || "0.3"),
    transferPattern: parseFloat(process.env.RISK_WEIGHT_TRANSFER_PATTERN || "0.2"),
    addressSimilarity: parseFloat(process.env.RISK_WEIGHT_ADDRESS_SIMILARITY || "0.2"),
    temporalPattern: parseFloat(process.env.RISK_WEIGHT_TEMPORAL_PATTERN || "0.15"),
    thirdPartyRisk: parseFloat(process.env.RISK_WEIGHT_THIRD_PARTY_RISK || "0.15"),
};
// Initialize rate limiters and connection pool
// Replace direct usage with a function to initialize p-limit dynamically
let limitInstance = null;
function initializePLimit() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            limitInstance = yield createLimiter(CONFIG.processing.maxConcurrency);
            console.log(`Rate limiter initialized with concurrency: ${CONFIG.processing.maxConcurrency}`);
        }
        catch (error) {
            console.error("Failed to initialize p-limit:", error);
            process.exit(1);
        }
    });
}
// Initialize connections
let currentEndpointIndex = 0;
const connections = RPC_ENDPOINTS.map((endpoint) => new web3_js_1.Connection(endpoint, "confirmed"));
// Helper function to get next connection with round-robin
function getNextConnection() {
    currentEndpointIndex = (currentEndpointIndex + 1) % connections.length;
    return connections[currentEndpointIndex];
}
// Helper function to add delay between requests
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, ms));
    });
}
// Store potential dusting sources
const dustingCandidates = new Map();
// Store potential address poisoning candidates (similar addresses)
const addressPoisoningCandidates = new Set();
// Cache for address transaction counts
const addressActivityCache = new Map();
/**
 * Fetch recent blocks to identify active addresses
 */
function findActiveAddresses() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Analyzing recent blocks to find active addresses...`);
            // Get latest slot
            const slot = yield getNextConnection().getSlot();
            const addresses = new Set();
            const addressTransactionCount = new Map();
            // Process recent blocks
            for (let i = 0; i < CONFIG.thresholds.detection.blocksToAnalyze; i++) {
                try {
                    const blockSlot = slot - i;
                    console.log(`Processing block at slot ${blockSlot}`);
                    const block = yield getNextConnection().getBlock(blockSlot, {
                        maxSupportedTransactionVersion: 0,
                        commitment: "confirmed",
                    });
                    if (!block || !block.transactions) {
                        console.log(`No transactions found in block ${blockSlot}`);
                        continue;
                    }
                    console.log(`Found ${block.transactions.length} transactions in block ${blockSlot}`);
                    // Extract addresses from transactions
                    for (const tx of block.transactions) {
                        if (!tx.transaction || !tx.meta)
                            continue;
                        // Skip transactions that use address table lookups (v0 txs)
                        if (tx.transaction.message.addressTableLookups &&
                            tx.transaction.message.addressTableLookups.length > 0) {
                            // Optionally log or count skipped transactions
                            continue;
                        }
                        // Process transaction message accounts
                        const accountKeys = tx.transaction.message.getAccountKeys();
                        accountKeys.staticAccountKeys.forEach((account) => {
                            const address = account.toString();
                            addressTransactionCount.set(address, (addressTransactionCount.get(address) || 0) + 1);
                        });
                    }
                }
                catch (err) {
                    console.error(`Error processing block:`, err);
                }
                // Add a small delay to avoid rate limiting
                yield sleep(5000);
            }
            // Find high-activity addresses
            for (const [address, count] of addressTransactionCount.entries()) {
                // Cache the activity count for later use
                addressActivityCache.set(address, count);
                if (count >= CONFIG.thresholds.detection.highActivity) {
                    addresses.add(address);
                    console.log(`Found high activity address: ${address} with ${count} transactions`);
                }
            }
            // Limit the number of addresses to analyze
            const addressArray = Array.from(addresses);
            if (addressArray.length > CONFIG.thresholds.detection.maxAddresses) {
                console.log(`Limiting analysis to top ${CONFIG.thresholds.detection.maxAddresses} most active addresses`);
                // Sort addresses by transaction count (descending)
                addressArray.sort((a, b) => (addressActivityCache.get(b) || 0) -
                    (addressActivityCache.get(a) || 0));
                // Take only the top addresses
                const limitedAddresses = new Set(addressArray.slice(0, CONFIG.thresholds.detection.maxAddresses));
                return limitedAddresses;
            }
            return addresses;
        }
        catch (error) {
            console.error(`Error finding active addresses:`, error);
            return new Set();
        }
    });
}
/**
 * Find reported dusting/scam addresses from external sources
 */
function findReportedAddresses() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // In a real implementation, you might:
            // 1. Query a public API for reported scam addresses
            // 2. Load from a local database of known dusting sources
            // 3. Parse community reports from social media
            console.log("Looking for known reported addresses...");
            // For this example, we'll assume no external data source
            // but you could implement API calls here
            // Example implementation placeholder:
            // const response = await fetch('https://api.scamdetector.io/solana/reported-addresses');
            // const data = await response.json();
            // return new Set(data.addresses);
            return new Set();
        }
        catch (error) {
            console.error(`Error fetching reported addresses:`, error);
            return new Set();
        }
    });
}
/**
 * Find potential victims of dusting attacks from social media reports
 */
function findPotentialVictims() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // In a real implementation, you might:
            // 1. Query Twitter API for mentions of "Solana dust" or "address poisoning"
            // 2. Extract reported wallet addresses from posts
            console.log("Looking for potential victims from reports...");
            // For this example, we'll assume no external data source
            // but you could implement social media API calls here
            return new Set();
        }
        catch (error) {
            console.error(`Error finding potential victims:`, error);
            return new Set();
        }
    });
}
/**
 * Fetch transactions for a given address
 */
function fetchAddressTransactions(address_1) {
    return __awaiter(this, arguments, void 0, function* (address, limit = 1000) {
        try {
            console.log(`Fetching transactions for address: ${address}`);
            // Get transaction signatures
            const signatures = yield getNextConnection().getSignaturesForAddress(new web3_js_1.PublicKey(address), { limit });
            console.log(`Found ${signatures.length} transactions, fetching details...`);
            const transactionDataPromises = [];
            // Process in batches to avoid rate limiting
            for (let i = 0; i < signatures.length; i += CONFIG.processing.batchSize) {
                const batch = signatures.slice(i, i + CONFIG.processing.batchSize);
                // Create promises for each transaction
                const batchPromises = batch.map((sigInfo) => __awaiter(this, void 0, void 0, function* () {
                    let retries = 0;
                    while (retries < CONFIG.processing.maxRetries) {
                        try {
                            yield sleep(CONFIG.processing.requestDelay); // Add delay between requests
                            const connection = getNextConnection();
                            const txData = yield connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
                            if (!txData)
                                return null;
                            return processTransaction(txData, sigInfo);
                        }
                        catch (error) {
                            retries++;
                            if (error &&
                                typeof error === "object" &&
                                "message" in error &&
                                typeof error.message === "string") {
                                if (error.message.includes("429") ||
                                    error.message.toLowerCase().includes("too many requests")) {
                                    const backoffTime = CONFIG.processing.initialBackoff * Math.pow(2, retries);
                                    console.log(`Rate limited, backing off for ${backoffTime}ms...`);
                                    yield sleep(backoffTime);
                                }
                            }
                            else if (retries === CONFIG.processing.maxRetries) {
                                console.error(`Failed to fetch transaction ${sigInfo.signature} after ${CONFIG.processing.maxRetries} retries:`, error);
                                return null;
                            }
                        }
                    }
                    return null;
                }));
                transactionDataPromises.push(...batchPromises);
                // Wait for the current batch to complete before starting the next
                yield Promise.all(batchPromises);
                console.log(`Processed batch ${i / CONFIG.processing.batchSize + 1}/${Math.ceil(signatures.length / CONFIG.processing.batchSize)}`);
                // Add a longer delay if needed
                yield sleep(5000);
            }
            // Wait for all promises to resolve
            const results = yield Promise.all(transactionDataPromises);
            // Filter out nulls and return valid transaction data
            return results.filter((data) => data !== null);
        }
        catch (error) {
            console.error(`Error fetching transactions for ${address}:`, error);
            return [];
        }
    });
}
/**
 * Process transaction data to extract relevant information
 */
function processTransaction(tx, sigInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!tx.transaction || !tx.meta)
                return null;
            // Extract basic transaction info
            const signature = sigInfo.signature;
            const timestamp = sigInfo.blockTime ? sigInfo.blockTime * 1000 : 0;
            const slot = sigInfo.slot;
            const success = tx.meta.err === null;
            const fee = tx.meta.fee / 1e9; // Convert lamports to SOL
            let sender = null;
            let recipient = null;
            let amount = 0;
            let tokenType = "SOL";
            let hasMemo = false;
            let memoContent = "";
            // Process transaction instructions to find transfers
            if (tx.transaction.message.instructions) {
                for (const instruction of tx.transaction.message.instructions) {
                    const parsedInst = instruction;
                    // Check for SOL transfers
                    if (parsedInst.program === "system" &&
                        parsedInst.parsed &&
                        parsedInst.parsed.type === "transfer") {
                        sender = parsedInst.parsed.info.source;
                        recipient = parsedInst.parsed.info.destination;
                        amount = parsedInst.parsed.info.lamports / 1e9; // Convert lamports to SOL
                    }
                    // Check for SPL token transfers
                    else if (parsedInst.program === "spl-token" &&
                        parsedInst.parsed &&
                        parsedInst.parsed.type === "transferChecked") {
                        sender = parsedInst.parsed.info.source;
                        recipient = parsedInst.parsed.info.destination;
                        amount = parsedInst.parsed.info.tokenAmount.uiAmount || 0;
                        tokenType = parsedInst.parsed.info.mint || "Unknown SPL";
                    }
                    // Check for memos (often used in dusting attacks)
                    else if (parsedInst.program === "spl-memo" && parsedInst.parsed) {
                        hasMemo = true;
                        memoContent = parsedInst.parsed;
                    }
                }
            }
            // Check if this might be a dust transaction
            const isPotentialDust = tokenType === "SOL" && amount > 0 && amount < CONFIG.thresholds.dust.sol;
            // Update dusting candidates tracking
            if (isPotentialDust && sender) {
                yield updateDustingCandidates(sender, recipient || "", timestamp);
            }
            // Basic check for potential address poisoning (this would need to be enhanced)
            const isPotentialPoisoning = recipient && checkForAddressPoisoning(recipient);
            // After processing transaction data, store it in the database
            if (sender && recipient) {
                try {
                    yield db_utils_1.default.insertDustTransaction({
                        signature,
                        timestamp: new Date(timestamp),
                        slot,
                        success, // Note: double-check if this negation is intended
                        sender,
                        recipient,
                        amount,
                        fee,
                        tokenType,
                        tokenAddress: tokenType === "SOL" ? undefined : tokenType,
                        isPotentialDust,
                        isPotentialPoisoning,
                        riskScore: 0, // Initial risk score, will be updated after analysis
                    });
                }
                catch (dbError) {
                    console.error("Error storing transaction in database:", dbError);
                }
            }
            return {
                signature,
                timestamp,
                slot,
                success,
                sender,
                recipient,
                amount,
                fee,
                tokenType,
                hasMemo,
                memoContent: hasMemo ? memoContent : undefined,
                isPotentialDust,
                isPotentialPoisoning,
            };
        }
        catch (error) {
            console.error(`Error processing transaction ${sigInfo.signature}:`, error);
            return null;
        }
    });
}
/**
 * Update tracking of potential dusting sources and store in database
 * @param sender The address sending the transaction
 * @param recipient The address receiving the transaction
 * @param timestamp The transaction timestamp
 */
function updateDustingCandidates(sender, recipient, timestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!dustingCandidates.has(sender)) {
            dustingCandidates.set(sender, {
                address: sender,
                smallTransfersCount: 0,
                uniqueRecipients: new Set(),
                timestamps: [],
                riskScore: 0,
                patterns: {
                    temporal: {
                        burstCount: 0,
                        averageTimeBetweenTransfers: 0,
                        regularityScore: 0,
                    },
                    network: {
                        clusterSize: 0,
                        centralityScore: 0,
                        recipientOverlap: 0,
                    },
                },
            });
        }
        const candidate = dustingCandidates.get(sender);
        candidate.smallTransfersCount++;
        candidate.uniqueRecipients.add(recipient);
        candidate.timestamps.push(timestamp);
        // Calculate risk score based on activity
        let riskScore = 0;
        if (candidate.smallTransfersCount >= CONFIG.thresholds.detection.minTransfers) {
            // Basic risk scoring - can be enhanced with more sophisticated algorithms
            riskScore = Math.min(0.3 + (candidate.smallTransfersCount / 100) + (candidate.uniqueRecipients.size / 50), 1.0);
        }
        candidate.riskScore = riskScore;
        // If this sender has sent many small transfers to different recipients, it's a strong dusting indicator
        if (candidate.smallTransfersCount >= CONFIG.thresholds.detection.minTransfers &&
            candidate.uniqueRecipients.size >= CONFIG.thresholds.detection.minTransfers) {
            console.log(`Potential dusting source detected: ${sender} (${candidate.smallTransfersCount} transfers to ${candidate.uniqueRecipients.size} recipients)`);
            // Store the candidate in the database
            try {
                yield db_utils_1.default.insertOrUpdateDustingCandidate({
                    address: candidate.address,
                    smallTransfersCount: candidate.smallTransfersCount,
                    uniqueRecipientsCount: candidate.uniqueRecipients.size,
                    uniqueRecipients: Array.from(candidate.uniqueRecipients),
                    timestamps: candidate.timestamps,
                    riskScore: candidate.riskScore,
                    temporalPattern: {
                        burstCount: candidate.patterns.temporal.burstCount,
                        averageTimeBetweenTransfers: candidate.patterns.temporal.averageTimeBetweenTransfers,
                        regularityScore: candidate.patterns.temporal.regularityScore
                    },
                    networkPattern: {
                        clusterSize: candidate.patterns.network.clusterSize,
                        centralityScore: candidate.patterns.network.centralityScore,
                        recipientOverlap: candidate.patterns.network.recipientOverlap
                    }
                });
                console.log(`Stored dusting candidate in database: ${sender}`);
            }
            catch (error) {
                console.error(`Error storing dusting candidate in database: ${sender}`, error);
            }
        }
    });
}
/**
 * Simple implementation to check for address poisoning
 * This would need to be expanded with more sophisticated similarity checks
 */
function checkForAddressPoisoning(address) {
    // Add the address to our candidates for analysis
    addressPoisoningCandidates.add(address);
    // Log the current set of addresses for debugging purposes 
    console.log("addresses poisoning", addressPoisoningCandidates);
    // We'll use the addressPoisoningCandidates set to check for similar addresses
    for (const existingAddress of addressPoisoningCandidates) {
        // Skip comparing with itself
        if (existingAddress === address)
            continue;
        // Check if addresses are similar but not identical
        const distance = levenshteinDistance(address, existingAddress);
        // If addresses are very similar (differ by just a few characters)
        // but not identical, this might be address poisoning
        if (distance > 0 && distance <= 3) {
            console.log(`Potential address poisoning detected: ${address} similar to ${existingAddress} (distance: ${distance})`);
            return true;
        }
    }
    // No suspicious similarity found
    return false;
}
/**
 * Calculate Levenshtein distance between two strings
 * Useful for address poisoning detection
 */
function levenshteinDistance(a, b) {
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    const matrix = [];
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
/**
 * Find addresses with similar patterns (potential poisoning)
 */
function findSimilarAddresses(addresses) {
    const similarAddresses = {};
    // Group addresses by first 4 and last 4 characters
    const addressMap = {};
    addresses.forEach((address) => {
        if (address) {
            const prefix = address.substring(0, 4);
            const suffix = address.substring(address.length - 4);
            const key = `${prefix}...${suffix}`;
            if (!addressMap[key]) {
                addressMap[key] = [];
            }
            addressMap[key].push(address);
        }
    });
    // Filter groups with more than one address
    Object.entries(addressMap).forEach(([key, addrs]) => {
        if (addrs.length > 1) {
            // Further analyze similar addresses with Levenshtein distance
            const groups = [];
            // For each address, check if it's similar to others
            for (let i = 0; i < addrs.length; i++) {
                let foundGroup = false;
                // Check if this address belongs to any existing group
                for (const group of groups) {
                    // Check similarity with the first address in the group
                    const distance = levenshteinDistance(addrs[i], group[0]);
                    // If addresses are similar enough (distance < 3 means they differ by at most 2 characters)
                    if (distance < 3) {
                        group.push(addrs[i]);
                        foundGroup = true;
                        break;
                    }
                }
                // If not similar to any existing group, create a new group
                if (!foundGroup) {
                    groups.push([addrs[i]]);
                }
            }
            // Add only groups with multiple addresses
            groups.forEach((group, index) => {
                if (group.length > 1) {
                    similarAddresses[`${key}_group${index}`] = group;
                }
            });
        }
    });
    return similarAddresses;
}
/**
 * Analyze transaction patterns to identify potential dusting or poisoning campaigns
 */
function analyzeTransactions(transactions) {
    // Extract potential dusters (addresses making many small transfers)
    const potentialDusters = Array.from(dustingCandidates.values()).filter((candidate) => candidate.smallTransfersCount >=
        CONFIG.thresholds.detection.minTransfers &&
        candidate.uniqueRecipients.size >=
            CONFIG.thresholds.detection.minTransfers);
    // Find potentially similar addresses for poisoning detection
    const addressPool = new Set();
    let dustTransactionCount = 0;
    transactions.forEach((tx) => {
        if (tx.sender)
            addressPool.add(tx.sender);
        if (tx.recipient)
            addressPool.add(tx.recipient);
        if (tx.isPotentialDust)
            dustTransactionCount++;
    });
    const addressSimilarities = findSimilarAddresses(Array.from(addressPool));
    // Analyze time patterns for dusting activities
    const dustingTimestampPatterns = {};
    potentialDusters.forEach((duster) => {
        // Sort timestamps chronologically
        const sortedTimestamps = [...duster.timestamps].sort((a, b) => a - b);
        dustingTimestampPatterns[duster.address] = sortedTimestamps;
    });
    // Analyze temporal patterns for each dusting candidate
    const suspiciousPatterns = {};
    potentialDusters.forEach((duster) => {
        const timestamps = [...duster.timestamps].sort((a, b) => a - b);
        // Look for bursts of activity (multiple transfers in short time windows)
        let burstCount = 0;
        let timeGaps = [];
        for (let i = 1; i < timestamps.length; i++) {
            const timeDiff = timestamps[i] - timestamps[i - 1];
            timeGaps.push(timeDiff);
            // If transfers are less than 5 minutes apart, consider it a burst
            if (timeDiff < 5 * 60 * 1000) {
                burstCount++;
            }
        }
        const averageTimeBetweenTransfers = timeGaps.length > 0
            ? timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length
            : 0;
        // If there are multiple bursts or very regular intervals, it's suspicious
        if (burstCount > 0 ||
            (averageTimeBetweenTransfers > 0 &&
                averageTimeBetweenTransfers < CONFIG.thresholds.detection.timeWindow)) {
            suspiciousPatterns[duster.address] = {
                burstCount,
                averageTimeBetweenTransfers,
            };
        }
    });
    return {
        potentialDusters,
        addressSimilarities,
        dustTransactionCount,
        totalTransactions: transactions.length,
        dustingTimestampPatterns,
        suspiciousPatterns,
    };
}
/**
 * Expand investigation to related addresses
 */
function expandInvestigation(initialTransactions, potentialDusters) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Expanding investigation to related addresses...");
        // Extract addresses from potential dusters for deeper investigation
        const addressesToInvestigate = new Set();
        // Add top dusting sources to investigation list
        potentialDusters.forEach((duster) => {
            addressesToInvestigate.add(duster.address);
        });
        // Limit investigation to prevent excessive API calls
        const maxAdditionalAddresses = 20;
        if (addressesToInvestigate.size > maxAdditionalAddresses) {
            console.log(`Limiting expanded investigation to top ${maxAdditionalAddresses} dusting sources`);
            const topAddresses = Array.from(addressesToInvestigate).slice(0, maxAdditionalAddresses);
            addressesToInvestigate.clear();
            topAddresses.forEach((addr) => addressesToInvestigate.add(addr));
        }
        console.log(`Expanding investigation to ${addressesToInvestigate.size} related addresses`);
        // Fetch transactions for these additional addresses
        const additionalTransactions = [];
        for (const address of addressesToInvestigate) {
            const transactions = yield fetchAddressTransactions(address, 200); // Limit to 200 per address
            additionalTransactions.push(...transactions);
            console.log(`Collected ${transactions.length} additional transactions for ${address}`);
            // Add a small delay to avoid rate limiting
            yield sleep(5000);
        }
        console.log(`Collected ${additionalTransactions.length} additional transactions in total`);
        // Combine with initial transactions, removing duplicates
        const allSignatures = new Set();
        const uniqueTransactions = [];
        // First add initial transactions
        initialTransactions.forEach((tx) => {
            allSignatures.add(tx.signature);
            uniqueTransactions.push(tx);
        });
        // Then add additional transactions, avoiding duplicates
        additionalTransactions.forEach((tx) => {
            if (!allSignatures.has(tx.signature)) {
                allSignatures.add(tx.signature);
                uniqueTransactions.push(tx);
            }
        });
        console.log(`Total unique transactions after expansion: ${uniqueTransactions.length}`);
        return uniqueTransactions;
    });
}
/**
 * Save results to a file
 */
function saveResults(transactions, analysis) {
    const results = {
        metadata: {
            timestamp: new Date().toISOString(),
            totalTransactions: transactions.length,
            dustThreshold: CONFIG.thresholds.dust.sol,
            minTransfersForDusting: CONFIG.thresholds.detection.minTransfers,
            dustTransactionCount: analysis.dustTransactionCount,
            potentialDustersCount: analysis.potentialDusters.length,
            similarAddressGroupsCount: Object.keys(analysis.addressSimilarities)
                .length,
        },
        potentialDusters: analysis.potentialDusters,
        similarAddressGroups: analysis.addressSimilarities,
        transactions: transactions.slice(0, 1000), // Limit to first 1000 to keep file size manageable
    };
    fs.writeFileSync(CONFIG.output.file, JSON.stringify(results, (key, value) => {
        // Convert Sets to Arrays for JSON serialization
        if (value instanceof Set)
            return Array.from(value);
        return value;
    }, 2));
    console.log(`Results saved to ${CONFIG.output.file}`);
    // Save full transaction data to a separate file if needed
    if (transactions.length > 1000) {
        const fullDataFile = "full_transaction_data.json";
        fs.writeFileSync(fullDataFile, JSON.stringify({
            transactions: transactions,
        }, (key, value) => {
            if (value instanceof Set)
                return Array.from(value);
            return value;
        }, 2));
        console.log(`Full transaction data saved to ${fullDataFile}`);
    }
}
// Dynamic threshold management
let currentDustThreshold = CONFIG.thresholds.dust.sol;
function updateDustThreshold() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = getNextConnection();
            const recentBlockhash = yield connection.getRecentBlockhash();
            const currentFee = recentBlockhash.feeCalculator.lamportsPerSignature / 1e9;
            currentDustThreshold =
                currentFee * CONFIG.thresholds.dust.networkFeeMultiplier;
            console.log(`Updated dust threshold to ${currentDustThreshold} SOL`);
        }
        catch (error) {
            console.error("Error updating dust threshold:", error);
        }
    });
}
// Update dust threshold periodically
setInterval(updateDustThreshold, CONFIG.thresholds.dust.updateInterval);
// Threat Intelligence Integration
function checkThreatIntelligence(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = { combinedRisk: 0 };
        try {
            if (CHAINALYSIS_API_KEY) {
                const chainalysisResponse = yield axios_1.default.get(`https://api.chainalysis.com/api/risk/v1/addresses/${address}`, { headers: { "X-API-Key": CHAINALYSIS_API_KEY } });
                results.chainalysisRisk = chainalysisResponse.data.risk;
            }
        }
        catch (error) {
            console.error("Chainalysis API error:", error);
        }
        try {
            if (TRM_LABS_API_KEY) {
                const trmResponse = yield axios_1.default.post("https://api.trmlabs.com/public/v1/screening", { address }, { headers: { "X-API-Key": TRM_LABS_API_KEY } });
                results.trmLabsRisk = trmResponse.data.riskScore;
            }
        }
        catch (error) {
            console.error("TRM Labs API error:", error);
        }
        // Combine risk scores
        const scores = [results.chainalysisRisk, results.trmLabsRisk].filter((score) => score !== undefined);
        results.combinedRisk =
            scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return results;
    });
}
// Network Analysis
class NetworkAnalyzer {
    constructor() {
        this.graph = new Map();
        this.addressPatterns = new Map();
    }
    addTransaction(sender, recipient) {
        if (!this.graph.has(sender)) {
            this.graph.set(sender, new Set());
        }
        this.graph.get(sender).add(recipient);
    }
    findClusters() {
        const clusters = new Map();
        const visited = new Set();
        const dfs = (address, cluster) => {
            if (visited.has(address))
                return;
            visited.add(address);
            cluster.add(address);
            const connections = this.graph.get(address) || new Set();
            for (const connected of connections) {
                dfs(connected, cluster);
            }
        };
        for (const address of this.graph.keys()) {
            if (!visited.has(address)) {
                const cluster = new Set();
                dfs(address, cluster);
                if (cluster.size > 1) {
                    clusters.set(address, cluster);
                }
            }
        }
        return clusters;
    }
    calculateCentrality(address) {
        const connections = this.graph.get(address);
        if (!connections)
            return 0;
        const directConnections = connections.size;
        let secondDegreeConnections = 0;
        for (const recipient of connections) {
            const recipientConnections = this.graph.get(recipient);
            if (recipientConnections)
                secondDegreeConnections += recipientConnections.size;
        }
        return directConnections + secondDegreeConnections * 0.5;
    }
}
// Homoglyph detection for address poisoning
const HOMOGLYPHS = {
    "0": ["O", "o"],
    O: ["0", "o"],
    l: ["I", "1"],
    I: ["l", "1"],
    "1": ["l", "I"],
    // Add more homoglyphs as needed
};
function findHomoglyphPatterns(address) {
    const patterns = [];
    const chars = address.split("");
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (HOMOGLYPHS[char]) {
            HOMOGLYPHS[char].forEach((replacement) => {
                const pattern = [...chars];
                pattern[i] = replacement;
                patterns.push(pattern.join(""));
            });
        }
    }
    return patterns;
}
// Token-aware dust detection
function getTokenMetadata(mint) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const connection = getNextConnection();
            const info = yield connection.getParsedAccountInfo(new web3_js_1.PublicKey(mint));
            if (!((_a = info.value) === null || _a === void 0 ? void 0 : _a.data) || typeof info.value.data !== "object") {
                return null;
            }
            const metadata = {
                address: mint,
                symbol: info.value.data.parsed.info.symbol,
                name: info.value.data.parsed.info.name,
                decimals: info.value.data.parsed.info.decimals,
                dustThreshold: 0,
            };
            // Set token-specific dust threshold based on decimals
            metadata.dustThreshold = 1 / Math.pow(10, metadata.decimals / 2);
            return metadata;
        }
        catch (error) {
            console.error(`Error fetching token metadata for ${mint}:`, error);
            return null;
        }
    });
}
// Enhanced risk scoring
function calculateRiskScore(data) {
    return Object.entries(RISK_WEIGHTS).reduce((score, [key, weight]) => {
        return score + data[key] * weight;
    }, 0);
}
/**
 * Main function to run the analysis
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting enhanced Solana dusting/poisoning detection...");
        // Initialize p-limit first
        yield initializePLimit();
        // Initialize network analyzer
        const networkAnalyzer = new NetworkAnalyzer();
        // Initialize dust threshold
        yield updateDustThreshold();
        // 1. Find active addresses automatically
        const activeAddresses = yield findActiveAddresses();
        console.log(`Found ${activeAddresses.size} active addresses`);
        // 2. Find reported addresses from external sources
        const reportedAddresses = yield findReportedAddresses();
        console.log(`Found ${reportedAddresses.size} reported addresses`);
        // 3. Find potential victims from social media
        const potentialVictims = yield findPotentialVictims();
        console.log(`Found ${potentialVictims.size} potential victims`);
        // Combine all address sources
        const addressesToAnalyze = new Set([
            ...activeAddresses,
            ...reportedAddresses,
            ...potentialVictims,
        ]);
        console.log(`Total unique addresses to analyze: ${addressesToAnalyze.size}`);
        // Process addresses with enhanced analysis
        const allTransactions = [];
        const riskAnalysis = new Map();
        // Process addresses in smaller chunks to manage memory
        const addressesArray = Array.from(addressesToAnalyze);
        const chunkSize = 20;
        for (let i = 0; i < addressesArray.length; i += chunkSize) {
            const addressChunk = addressesArray.slice(i, i + chunkSize);
            console.log(`Processing addresses ${i + 1} to ${i + addressChunk.length} of ${addressesArray.length}`);
            // Process chunk with parallel execution but controlled concurrency
            const chunkPromises = addressChunk.map((address) => limitInstance(() => __awaiter(this, void 0, void 0, function* () {
                const transactions = yield fetchAddressTransactions(address, 200);
                // Check threat intelligence
                const threatIntel = yield checkThreatIntelligence(address);
                // Add transactions to network analyzer
                transactions.forEach((tx) => {
                    if (tx.sender && tx.recipient) {
                        networkAnalyzer.addTransaction(tx.sender, tx.recipient);
                    }
                });
                return { address, transactions, threatIntel };
            })));
            const chunkResults = yield Promise.all(chunkPromises);
            // Process results
            for (const result of chunkResults) {
                allTransactions.push(...result.transactions);
                // Calculate network metrics
                const centralityScore = networkAnalyzer.calculateCentrality(result.address);
                // Find similar addresses
                const similarAddresses = findHomoglyphPatterns(result.address);
                // Store risk analysis
                riskAnalysis.set(result.address, {
                    address: result.address,
                    riskScore: calculateRiskScore({
                        dustAmount: result.transactions.filter((tx) => tx.isPotentialDust).length / result.transactions.length,
                        transferPattern: centralityScore / 10, // Normalize to 0-1
                        addressSimilarity: similarAddresses.length > 0 ? 1 : 0,
                        temporalPattern: 0, // Will be updated in final analysis
                        thirdPartyRisk: result.threatIntel.combinedRisk,
                    }),
                    chainAnalysisData: result.threatIntel.chainalysisRisk,
                    trmLabsData: result.threatIntel.trmLabsRisk,
                    patterns: {
                        temporal: {
                            burstCount: 0,
                            averageTimeBetweenTransfers: 0,
                            regularityScore: 0,
                        },
                        network: {
                            clusterSize: 0,
                            centralityScore,
                            recipientOverlap: 0,
                        },
                    },
                });
            }
            yield sleep(5000); // Rate limiting
        }
        // Final analysis with all data
        const clusters = networkAnalyzer.findClusters();
        const finalAnalysis = analyzeTransactions(allTransactions);
        // Update risk scores with temporal patterns
        for (const [address, analysis] of riskAnalysis) {
            if (finalAnalysis.suspiciousPatterns[address]) {
                const pattern = finalAnalysis.suspiciousPatterns[address];
                analysis.patterns.temporal = {
                    burstCount: pattern.burstCount,
                    averageTimeBetweenTransfers: pattern.averageTimeBetweenTransfers,
                    regularityScore: pattern.burstCount > 0 ? 1 : 0,
                };
                // Update final risk score
                analysis.riskScore = calculateRiskScore({
                    dustAmount: finalAnalysis.dustTransactionCount / finalAnalysis.totalTransactions,
                    transferPattern: analysis.patterns.network.centralityScore / 10,
                    addressSimilarity: analysis.patterns.network.recipientOverlap,
                    temporalPattern: analysis.patterns.temporal.regularityScore,
                    thirdPartyRisk: analysis.chainAnalysisData || analysis.trmLabsData || 0,
                });
            }
        }
        // Save enhanced results
        const enhancedResults = {
            metadata: {
                timestamp: new Date().toISOString(),
                totalTransactions: allTransactions.length,
                dustThreshold: currentDustThreshold,
                networkStats: {
                    totalClusters: clusters.size,
                    averageClusterSize: Array.from(clusters.values()).reduce((sum, cluster) => sum + cluster.size, 0) / clusters.size,
                },
            },
            riskAnalysis: Array.from(riskAnalysis.values()),
            clusters: Array.from(clusters.entries()).map(([key, value]) => ({
                root: key,
                size: value.size,
                addresses: Array.from(value),
            })),
            potentialDusters: finalAnalysis.potentialDusters,
            addressSimilarities: finalAnalysis.addressSimilarities,
        };
        fs.writeFileSync("enhanced_analysis_results.json", JSON.stringify(enhancedResults, (key, value) => {
            if (value instanceof Set)
                return Array.from(value);
            return value;
        }, 2));
        console.log("Enhanced analysis complete!");
        console.log(`Found ${enhancedResults.riskAnalysis.length} addresses with risk scores`);
        console.log(`Identified ${clusters.size} suspicious network clusters`);
    });
}
// Run the main function
main().catch((error) => {
    console.error("Error in main execution:", error);
});
