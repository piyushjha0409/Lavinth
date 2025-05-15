import * as web3 from "@solana/web3.js";
import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  ParsedInstruction,
  BlockResponse,
} from "@solana/web3.js";
import * as fs from "fs";
// Remove the direct import of p-limit
// import pLimit from 'p-limit';
import axios from "axios";
import * as dotenv from "dotenv";
import db from "./db/db-utils";

// Import our wrapper
const createLimiter = require("./p-limit-wrapper");

// Load environment variables
dotenv.config();

// Import enhanced features
import { AdaptiveThresholds } from './adaptive-thresholds';
import { DustDetectionModel } from './ml-detection';
import { DustingAlertSystem } from './dust-alert-system';

// Initialize database
db.initializeDatabase().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});

// Third-party API configurations
const CHAINALYSIS_API_KEY = process.env.CHAINALYSIS_API_KEY || "";
const TRM_LABS_API_KEY = process.env.TRM_LABS_API_KEY || "";

// Parse Helius API keys from environment variable
import { getCombinedScamUrlList } from "./scam-url-service";

const HELIUS_API_KEYS = (process.env.HELIUS_API_KEYS || "")
  .split(",")
  .map(key => key.trim())
  .filter((key) => key.length > 0);

console.log("Parsed HELIUS_API_KEYS array:", HELIUS_API_KEYS);

// Helper to extract URLs from a string (e.g., memo or metadata)
function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s]+|[a-zA-Z0-9\-_.]+\.[a-zA-Z]{2,}/g;
  return text.match(urlRegex) || [];
}

// Check if any extracted URLs match the scam blocklist
async function isScamUrlPresent(text: string, apiKey: string): Promise<boolean> {
  const urls = extractUrls(text);
  if (urls.length === 0) return false;
  const scamList = await getCombinedScamUrlList(apiKey);
  return urls.some(url => scamList.some(scam => url.includes(scam)));
}

console.log(`Found ${HELIUS_API_KEYS.length} Helius API keys`);

if (HELIUS_API_KEYS.length === 0) {
  throw new Error(
    "No Helius API keys configured. Please set HELIUS_API_KEYS in .env file"
  );
}

// Parse Helius API keys from environment variable



const RPC_ENDPOINTS = HELIUS_API_KEYS.map(apiKey => 
  `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
);

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
      networkFeeMultiplier: parseInt(
        process.env.NETWORK_FEE_MULTIPLIER || "10"
      ), // Dust threshold = current network fee * multiplier
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
  transferPattern: parseFloat(
    process.env.RISK_WEIGHT_TRANSFER_PATTERN || "0.2"
  ),
  addressSimilarity: parseFloat(
    process.env.RISK_WEIGHT_ADDRESS_SIMILARITY || "0.2"
  ),
  temporalPattern: parseFloat(
    process.env.RISK_WEIGHT_TEMPORAL_PATTERN || "0.15"
  ),
  thirdPartyRisk: parseFloat(
    process.env.RISK_WEIGHT_THIRD_PARTY_RISK || "0.15"
  ),
};

// Interfaces
interface TransactionData {
  signature: string;
  timestamp: number;
  slot: number;
  success: boolean;
  sender: string | null;
  recipient: string | null;
  amount: number;
  fee: number;
  tokenType: string;
  tokenAddress?: string;
  tokenMetadata?: TokenMetadata;
  hasMemo: boolean;
  memoContent?: string;
  isPotentialDust: boolean;
  isPotentialPoisoning: boolean;
  riskScore?: number;
  isScamUrl?: boolean;
}

interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  dustThreshold?: number;
}

interface TimePattern {
  hourlyDistribution: number[]; // 24-element array showing activity by hour
  weekdayDistribution: number[]; // 7-element array showing activity by day of week
  burstDetection: {
    burstThreshold: number;
    burstWindows: Array<{start: number, end: number}>;
  }
}

interface BehavioralIndicators {
  usesNewAccounts: boolean;
  hasAbnormalFundingPattern: boolean;
  targetsPremiumWallets: boolean;
  usesScriptedTransactions: boolean;
}

interface MLFeatures {
  transactionFrequency: number;
  averageAmount: number;
  recipientCount: number;
  timePatternFeatures: number[];
  networkFeatures: number[];
}

interface MLPrediction {
  attackerScore: number;
  victimScore: number;
  confidence: number;
}

interface VulnerabilityAssessment {
  walletActivity: 'high' | 'medium' | 'low';
  assetValue: 'high' | 'medium' | 'low';
  previousInteractions: boolean;
  riskExposure: number;
}

interface DustingAttacker {
  address: string;
  smallTransfersCount: number;
  uniqueVictims: Set<string>;
  timestamps: number[];
  riskScore: number;
  walletAge?: number; // Days since first transaction
  totalTransactionVolume?: number;
  knownLabels?: string[]; // Labels from external services
  relatedAddresses?: string[];
  previousAttackPatterns?: {
    timestamp: number;
    victimCount: number;
    pattern: string;
  }[];
  timePatterns?: TimePattern;
  patterns: {
    temporal: TemporalPattern;
    network: NetworkPattern;
  };
  behavioralIndicators?: BehavioralIndicators;
  mlFeatures?: MLFeatures;
  mlPrediction?: MLPrediction;
}

interface DustingVictim {
  address: string;
  dustTransactionsCount: number;
  uniqueAttackers: Set<string>;
  timestamps: number[];
  riskScore: number;
  walletAge?: number; // Days since first transaction
  walletValueEstimate?: number;
  timePatterns?: TimePattern;
  vulnerabilityAssessment?: VulnerabilityAssessment;
  mlFeatures?: MLFeatures;
  mlPrediction?: MLPrediction;
}

interface TemporalPattern {
  burstCount: number;
  averageTimeBetweenTransfers: number;
  regularityScore: number;
}

interface NetworkPattern {
  clusterSize: number;
  centralityScore: number;
  recipientOverlap: number;
}

interface RiskAnalysis {
  address: string;
  riskScore: number;
  chainAnalysisData?: any;
  trmLabsData?: any;
  patterns: {
    temporal: TemporalPattern;
    network: NetworkPattern;
  };
}

// Initialize rate limiters and connection pool
// Replace direct usage with a function to initialize p-limit dynamically
let limitInstance: any = null;

async function initializePLimit() {
  try {
    limitInstance = await createLimiter(CONFIG.processing.maxConcurrency);
    console.log(
      `Rate limiter initialized with concurrency: ${CONFIG.processing.maxConcurrency}`
    );
  } catch (error) {
    console.error("Failed to initialize p-limit:", error);
    process.exit(1);
  }
}

// Initialize connections
let currentEndpointIndex = 0;
const connections = RPC_ENDPOINTS.map(
  (endpoint) => new Connection(endpoint, "confirmed")
);

// Helper function to get next connection with round-robin
function getNextConnection(): Connection {
  currentEndpointIndex = (currentEndpointIndex + 1) % connections.length;
  return connections[currentEndpointIndex];
}

// Helper function to add delay between requests
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Store potential dusting attackers (senders of dust transactions)
const dustingAttackers: Map<string, DustingAttacker> = new Map();
// Store potential dusting victims (recipients of dust transactions)
const dustingVictims: Map<string, DustingVictim> = new Map();
// Store potential address poisoning candidates (similar addresses)
const addressPoisoningCandidates: Set<string> = new Set();
// Cache for address transaction counts
const addressActivityCache: Map<string, number> = new Map();

/**
 * Fetch recent blocks to identify active addresses
 */
async function findActiveAddresses(): Promise<Set<string>> {
  try {
    console.log(`Analyzing recent blocks to find active addresses...`);

    // Get latest slot
    const slot = await getNextConnection().getSlot();
    const addresses = new Set<string>();
    const addressTransactionCount: Map<string, number> = new Map();

    // Process recent blocks
    for (let i = 0; i < CONFIG.thresholds.detection.blocksToAnalyze; i++) {
      try {
        const blockSlot = slot - i;
        console.log(`Processing block at slot ${blockSlot}`);

        const block = await getNextConnection().getBlock(blockSlot, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        if (!block || !block.transactions) {
          console.log(`No transactions found in block ${blockSlot}`);
          continue;
        }

        console.log(
          `Found ${block.transactions.length} transactions in block ${blockSlot}`
        );

        // Extract addresses from transactions
        for (const tx of block.transactions) {
          if (!tx.transaction || !tx.meta) continue;

          // Skip transactions that use address table lookups (v0 txs)
          if (
            tx.transaction.message.addressTableLookups &&
            tx.transaction.message.addressTableLookups.length > 0
          ) {
            // Optionally log or count skipped transactions
            continue;
          }

          // Process transaction message accounts
          const accountKeys = tx.transaction.message.getAccountKeys();

          accountKeys.staticAccountKeys.forEach(
            (account: { toString: () => any }) => {
              const address = account.toString();
              addressTransactionCount.set(
                address,
                (addressTransactionCount.get(address) || 0) + 1
              );
            }
          );
        }
      } catch (err) {
        console.error(`Error processing block:`, err);
      }

      // Add a small delay to avoid rate limiting
      await sleep(5000);
    }

    // Find high-activity addresses
    for (const [address, count] of addressTransactionCount.entries()) {
      // Cache the activity count for later use
      addressActivityCache.set(address, count);

      if (count >= CONFIG.thresholds.detection.highActivity) {
        addresses.add(address);
        console.log(
          `Found high activity address: ${address} with ${count} transactions`
        );
      }
    }

    // Limit the number of addresses to analyze
    const addressArray = Array.from(addresses);
    if (addressArray.length > CONFIG.thresholds.detection.maxAddresses) {
      console.log(
        `Limiting analysis to top ${CONFIG.thresholds.detection.maxAddresses} most active addresses`
      );

      // Sort addresses by transaction count (descending)
      addressArray.sort(
        (a, b) =>
          (addressActivityCache.get(b) || 0) -
          (addressActivityCache.get(a) || 0)
      );

      // Take only the top addresses
      const limitedAddresses = new Set(
        addressArray.slice(0, CONFIG.thresholds.detection.maxAddresses)
      );
      return limitedAddresses;
    }

    return addresses;
  } catch (error) {
    console.error(`Error finding active addresses:`, error);
    return new Set<string>();
  }
}

/**
 * Find reported dusting/scam addresses from external sources
 */
async function findReportedAddresses(): Promise<Set<string>> {
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

    return new Set<string>();
  } catch (error) {
    console.error(`Error fetching reported addresses:`, error);
    return new Set<string>();
  }
}

/**
 * Find potential victims of dusting attacks from social media reports
 */
async function findPotentialVictims(): Promise<Set<string>> {
  try {
    // In a real implementation, you might:
    // 1. Query Twitter API for mentions of "Solana dust" or "address poisoning"
    // 2. Extract reported wallet addresses from posts

    console.log("Looking for potential victims from reports...");

    // For this example, we'll assume no external data source
    // but you could implement social media API calls here

    return new Set<string>();
  } catch (error) {
    console.error(`Error finding potential victims:`, error);
    return new Set<string>();
  }
}

/**
 * Fetch transactions for a given address
 */
async function fetchAddressTransactions(
  address: string,
  limit = 1000
): Promise<TransactionData[]> {
  try {
    console.log(`Fetching transactions for address: ${address}`);

    // Get transaction signatures
    const signatures: ConfirmedSignatureInfo[] =
      await getNextConnection().getSignaturesForAddress(
        new PublicKey(address),
        { limit }
      );

    console.log(`Found ${signatures.length} transactions, fetching details...`);

    const transactionDataPromises: Promise<TransactionData | null>[] = [];

    // Process in batches to avoid rate limiting
    for (let i = 0; i < signatures.length; i += CONFIG.processing.batchSize) {
      const batch = signatures.slice(i, i + CONFIG.processing.batchSize);

      // Create promises for each transaction
      const batchPromises = batch.map(async (sigInfo) => {
        let retries = 0;
        while (retries < CONFIG.processing.maxRetries) {
          try {
            await sleep(CONFIG.processing.requestDelay); // Add delay between requests
            const connection = getNextConnection();
            const txData = await connection.getParsedTransaction(
              sigInfo.signature,
              { maxSupportedTransactionVersion: 0 }
            );
            if (!txData) return null;
            return processTransaction(txData, sigInfo);
          } catch (error) {
            retries++;
            if (
              error &&
              typeof error === "object" &&
              "message" in error &&
              typeof error.message === "string"
            ) {
              if (
                error.message.includes("429") ||
                error.message.toLowerCase().includes("too many requests")
              ) {
                const backoffTime =
                  CONFIG.processing.initialBackoff * Math.pow(2, retries);
                console.log(
                  `Rate limited, backing off for ${backoffTime}ms...`
                );
                await sleep(backoffTime);
              }
            } else if (retries === CONFIG.processing.maxRetries) {
              console.error(
                `Failed to fetch transaction ${sigInfo.signature} after ${CONFIG.processing.maxRetries} retries:`,
                error
              );
              return null;
            }
          }
        }
        return null;
      });

      transactionDataPromises.push(...batchPromises);

      // Wait for the current batch to complete before starting the next
      await Promise.all(batchPromises);
      console.log(
        `Processed batch ${i / CONFIG.processing.batchSize + 1}/${Math.ceil(
          signatures.length / CONFIG.processing.batchSize
        )}`
      );

      // Add a longer delay if needed
      await sleep(5000);
    }

    // Wait for all promises to resolve
    const results = await Promise.all(transactionDataPromises);

    // Filter out nulls and return valid transaction data
    return results.filter((data): data is TransactionData => data !== null);
  } catch (error) {
    console.error(`Error fetching transactions for ${address}:`, error);
    return [];
  }
}

/**
 * Process transaction data to extract relevant information
 */
async function processTransaction(
  tx: ParsedTransactionWithMeta,
  sigInfo: ConfirmedSignatureInfo
): Promise<TransactionData | null> {
  try {
    if (!tx.transaction || !tx.meta) return null;

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
        const parsedInst = instruction as ParsedInstruction;

        // Check for SOL transfers
        if (
          parsedInst.program === "system" &&
          parsedInst.parsed &&
          parsedInst.parsed.type === "transfer"
        ) {
          sender = parsedInst.parsed.info.source;
          recipient = parsedInst.parsed.info.destination;
          amount = parsedInst.parsed.info.lamports / 1e9; // Convert lamports to SOL
        }

        // Check for SPL token transfers
        else if (
          parsedInst.program === "spl-token" &&
          parsedInst.parsed &&
          parsedInst.parsed.type === "transferChecked"
        ) {
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

    // Check for scam URLs in memoContent
    let isScamUrl = false;
    if (memoContent && HELIUS_API_KEYS.length > 0) {
      // Use the first API key for scam URL lookup
      try {
        isScamUrl = await isScamUrlPresent(memoContent, HELIUS_API_KEYS[0]);
        if (isScamUrl) {
          console.warn(`Scam URL detected in transaction ${signature}:`, memoContent);
        }
      } catch (err) {
        console.error("Error checking scam URL in memoContent:", err);
      }
    }

    // Check if this might be a dust transaction
    const isPotentialDust =
      tokenType === "SOL" && amount > 0 && amount < CONFIG.thresholds.dust.sol;

    // Update dusting candidates tracking
    if (isPotentialDust && sender) {
      await updateDustingCandidates(sender, recipient || "", timestamp);
    }

    // Basic check for potential address poisoning (this would need to be enhanced)
    const isPotentialPoisoning =
      recipient && checkForAddressPoisoning(recipient);

    // After processing transaction data, store it in the database
    if (sender && recipient) {
      try {
        await db.insertDustTransaction({
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
          isScamUrl,
          memoContent,
        });
      } catch (dbError) {
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
  } catch (error) {
    console.error(`Error processing transaction ${sigInfo.signature}:`, error);
    return null;
  }
}

/**
 * Update tracking of potential dusting attackers and victims and store in database
 * @param sender The address sending the transaction (potential attacker)
 * @param recipient The address receiving the transaction (potential victim)
 * @param timestamp The transaction timestamp
 */
async function updateDustingCandidates(
  sender: string,
  recipient: string,
  timestamp: number
): Promise<void> {
  // Track the sender as a potential attacker
  if (!dustingAttackers.has(sender)) {
    dustingAttackers.set(sender, {
      address: sender,
      smallTransfersCount: 0,
      uniqueVictims: new Set<string>(),
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

  // Track the recipient as a potential victim
  if (!dustingVictims.has(recipient)) {
    dustingVictims.set(recipient, {
      address: recipient,
      dustTransactionsCount: 0,
      uniqueAttackers: new Set<string>(),
      timestamps: [],
      riskScore: 0,
    });
  }

  // Update attacker data
  const attacker = dustingAttackers.get(sender)!;
  attacker.smallTransfersCount++;
  attacker.uniqueVictims.add(recipient);
  attacker.timestamps.push(timestamp);

  // Update victim data
  const victim = dustingVictims.get(recipient)!;
  victim.dustTransactionsCount++;
  victim.uniqueAttackers.add(sender);
  victim.timestamps.push(timestamp);

  // Calculate risk score for attacker based on activity
  let attackerRiskScore = 0;
  if (attacker.smallTransfersCount >= CONFIG.thresholds.detection.minTransfers) {
    // Basic risk scoring - can be enhanced with more sophisticated algorithms
    attackerRiskScore = Math.min(
      0.3 + (attacker.smallTransfersCount / 100) + (attacker.uniqueVictims.size / 50),
      1.0
    );
  }
  attacker.riskScore = attackerRiskScore;

  // Calculate risk score for victim based on number of dust transactions received
  let victimRiskScore = 0;
  if (victim.dustTransactionsCount >= 2) { // Even a few dust transactions can be concerning
    victimRiskScore = Math.min(
      0.2 + (victim.dustTransactionsCount / 20) + (victim.uniqueAttackers.size / 10),
      1.0
    );
  }
  victim.riskScore = victimRiskScore;

  // If this sender has sent many small transfers to different recipients, it's a strong dusting attacker indicator
  if (
    attacker.smallTransfersCount >= CONFIG.thresholds.detection.minTransfers &&
    attacker.uniqueVictims.size >= CONFIG.thresholds.detection.minTransfers
  ) {
    console.log(
      `Potential dusting attacker detected: ${sender} (${attacker.smallTransfersCount} transfers to ${attacker.uniqueVictims.size} victims)`
    );
    
    // Store the attacker in the database
    try {
      // Create a database-compatible attacker object with default values for required fields
      const dbAttacker = {
        address: attacker.address,
        smallTransfersCount: attacker.smallTransfersCount,
        uniqueVictimsCount: attacker.uniqueVictims.size,
        uniqueVictims: Array.from(attacker.uniqueVictims),
        timestamps: attacker.timestamps,
        riskScore: attacker.riskScore,
        temporalPattern: JSON.stringify({
          burstCount: attacker.patterns.temporal.burstCount,
          averageTimeBetweenTransfers: attacker.patterns.temporal.averageTimeBetweenTransfers,
          regularityScore: attacker.patterns.temporal.regularityScore
        }),
        networkPattern: JSON.stringify({
          clusterSize: attacker.patterns.network.clusterSize,
          centralityScore: attacker.patterns.network.centralityScore,
          recipientOverlap: attacker.patterns.network.recipientOverlap
        }),
        // Add optional fields with default values to match the database schema
        walletAgeDays: null,
        totalTransactionVolume: null,
        knownLabels: null,
        relatedAddresses: null,
        previousAttackPatterns: null,
        // Use default JSON structures for required fields that don't accept NULL
        timePatterns: JSON.stringify({
          hourlyDistribution: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
          weekdayDistribution: [0,0,0,0,0,0,0], 
          burstDetection: {burstThreshold: 300000, burstWindows: []}
        }),
        behavioralIndicators: JSON.stringify({
          usesNewAccounts: false, 
          hasAbnormalFundingPattern: false, 
          targetsPremiumWallets: false, 
          usesScriptedTransactions: false
        }),
        mlFeatures: null,
        mlPrediction: null
      };
      
      // Use the pool directly since we're having issues with the method
      await db.pool.query(
        `INSERT INTO dusting_attackers 
        (address, small_transfers_count, unique_victims_count, unique_victims, timestamps, 
            risk_score, temporal_pattern, network_pattern, wallet_age_days, total_transaction_volume,
            known_labels, related_addresses, previous_attack_patterns, time_patterns,
            behavioral_indicators, ml_features, ml_prediction, last_updated) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
        ON CONFLICT (address) DO UPDATE SET
            small_transfers_count = EXCLUDED.small_transfers_count,
            unique_victims_count = EXCLUDED.unique_victims_count,
            unique_victims = EXCLUDED.unique_victims,
            timestamps = EXCLUDED.timestamps,
            risk_score = EXCLUDED.risk_score,
            temporal_pattern = EXCLUDED.temporal_pattern,
            network_pattern = EXCLUDED.network_pattern,
            wallet_age_days = EXCLUDED.wallet_age_days,
            total_transaction_volume = EXCLUDED.total_transaction_volume,
            known_labels = EXCLUDED.known_labels,
            related_addresses = EXCLUDED.related_addresses,
            previous_attack_patterns = EXCLUDED.previous_attack_patterns,
            time_patterns = EXCLUDED.time_patterns,
            behavioral_indicators = EXCLUDED.behavioral_indicators,
            ml_features = EXCLUDED.ml_features,
            ml_prediction = EXCLUDED.ml_prediction,
            last_updated = CURRENT_TIMESTAMP
        RETURNING *`,
        [
            dbAttacker.address, 
            dbAttacker.smallTransfersCount, 
            dbAttacker.uniqueVictimsCount,
            dbAttacker.uniqueVictims, 
            dbAttacker.timestamps, 
            dbAttacker.riskScore,
            dbAttacker.temporalPattern,
            dbAttacker.networkPattern,
            dbAttacker.walletAgeDays,
            dbAttacker.totalTransactionVolume,
            dbAttacker.knownLabels,
            dbAttacker.relatedAddresses,
            dbAttacker.previousAttackPatterns,
            dbAttacker.timePatterns,
            dbAttacker.behavioralIndicators,
            dbAttacker.mlFeatures,
            dbAttacker.mlPrediction
        ]
      );
      console.log(`Stored dusting attacker in database: ${sender}`);
    } catch (error) {
      console.error(`Error storing dusting attacker in database: ${sender}`, error);
    }
  }

  // If this recipient has received multiple dust transactions, track as a potential victim
  if (victim.dustTransactionsCount >= 2) {
    console.log(
      `Potential dusting victim detected: ${recipient} (${victim.dustTransactionsCount} dust transactions from ${victim.uniqueAttackers.size} attackers)`
    );
    
    // Store the victim in the database
    try {
      // Create a database-compatible victim object with default values for required fields
      const dbVictim = {
        address: victim.address,
        dustTransactionsCount: victim.dustTransactionsCount,
        uniqueAttackersCount: victim.uniqueAttackers.size,
        uniqueAttackers: Array.from(victim.uniqueAttackers),
        timestamps: victim.timestamps,
        riskScore: victim.riskScore,
        // Add optional fields with default values to match the database schema
        walletAgeDays: null,
        walletValueEstimate: null,
        // Use default JSON structures for required fields that don't accept NULL
        timePatterns: JSON.stringify({
          hourlyDistribution: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
          weekdayDistribution: [0,0,0,0,0,0,0], 
          burstDetection: {burstThreshold: 300000, burstWindows: []}
        }),
        vulnerabilityAssessment: JSON.stringify({
          walletActivity: "low", 
          assetValue: "low", 
          previousInteractions: false, 
          riskExposure: 0
        }),
        mlFeatures: null,
        mlPrediction: null
      };
      
      // Use the pool directly since we're having issues with the method
      await db.pool.query(
        `INSERT INTO dusting_victims 
        (address, dust_transactions_count, unique_attackers_count, unique_attackers, timestamps, 
            risk_score, wallet_age_days, wallet_value_estimate, time_patterns, vulnerability_assessment,
            ml_features, ml_prediction, last_updated) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT (address) DO UPDATE SET
            dust_transactions_count = EXCLUDED.dust_transactions_count,
            unique_attackers_count = EXCLUDED.unique_attackers_count,
            unique_attackers = EXCLUDED.unique_attackers,
            timestamps = EXCLUDED.timestamps,
            risk_score = EXCLUDED.risk_score,
            wallet_age_days = EXCLUDED.wallet_age_days,
            wallet_value_estimate = EXCLUDED.wallet_value_estimate,
            time_patterns = EXCLUDED.time_patterns,
            vulnerability_assessment = EXCLUDED.vulnerability_assessment,
            ml_features = EXCLUDED.ml_features,
            ml_prediction = EXCLUDED.ml_prediction,
            last_updated = CURRENT_TIMESTAMP
        RETURNING *`,
        [
            dbVictim.address, 
            dbVictim.dustTransactionsCount, 
            dbVictim.uniqueAttackersCount,
            dbVictim.uniqueAttackers, 
            dbVictim.timestamps, 
            dbVictim.riskScore,
            dbVictim.walletAgeDays,
            dbVictim.walletValueEstimate,
            dbVictim.timePatterns,
            dbVictim.vulnerabilityAssessment,
            dbVictim.mlFeatures,
            dbVictim.mlPrediction
        ]
      );
      console.log(`Stored dusting victim in database: ${recipient}`);
    } catch (error) {
      console.error(`Error storing dusting victim in database: ${recipient}`, error);
    }
  }
}

/**
 * Simple implementation to check for address poisoning
 * This would need to be expanded with more sophisticated similarity checks
 */
function checkForAddressPoisoning(address: string): boolean {
  // Add the address to our candidates for analysis
  addressPoisoningCandidates.add(address);

  // Log the current set of addresses for debugging purposes 
  console.log("addresses poisoning", addressPoisoningCandidates);
  
  // We'll use the addressPoisoningCandidates set to check for similar addresses
  for (const existingAddress of addressPoisoningCandidates) {
    // Skip comparing with itself
    if (existingAddress === address) continue;
    
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
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

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
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
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
function findSimilarAddresses(addresses: string[]): Record<string, string[]> {
  const similarAddresses: Record<string, string[]> = {};

  // Group addresses by first 4 and last 4 characters
  const addressMap: Record<string, string[]> = {};

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
      const groups: string[][] = [];

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
function analyzeTransactions(transactions: TransactionData[]): {
  potentialAttackers: DustingAttacker[];
  potentialVictims: DustingVictim[];
  addressSimilarities: Record<string, string[]>;
  dustTransactionCount: number;
  totalTransactions: number;
  dustingTimestampPatterns: Record<string, number[]>;
  suspiciousPatterns: Record<
    string,
    {
      burstCount: number;
      averageTimeBetweenTransfers: number;
    }
  >;
} {
  // Extract potential attackers (addresses making many small transfers)
  const potentialAttackers = Array.from(dustingAttackers.values()).filter(
    (attacker) =>
      attacker.smallTransfersCount >=
        CONFIG.thresholds.detection.minTransfers &&
      attacker.uniqueVictims.size >=
        CONFIG.thresholds.detection.minTransfers
  );
  
  // Extract potential victims (addresses receiving dust transactions)
  const potentialVictims = Array.from(dustingVictims.values()).filter(
    (victim) => victim.dustTransactionsCount >= 2
  );

  // Find potentially similar addresses for poisoning detection
  const addressPool = new Set<string>();
  let dustTransactionCount = 0;

  transactions.forEach((tx) => {
    if (tx.sender) addressPool.add(tx.sender);
    if (tx.recipient) addressPool.add(tx.recipient);
    if (tx.isPotentialDust) dustTransactionCount++;
  });

  const addressSimilarities = findSimilarAddresses(Array.from(addressPool));

  // Analyze time patterns for dusting activities
  const dustingTimestampPatterns: Record<string, number[]> = {};
  potentialAttackers.forEach((attacker) => {
    // Sort timestamps chronologically
    const sortedTimestamps = [...attacker.timestamps].sort((a, b) => a - b);
    dustingTimestampPatterns[attacker.address] = sortedTimestamps;
  });

  // Analyze temporal patterns for each dusting attacker
  const suspiciousPatterns: Record<
    string,
    {
      burstCount: number;
      averageTimeBetweenTransfers: number;
    }
  > = {};

  potentialAttackers.forEach((attacker) => {
    const timestamps = [...attacker.timestamps].sort((a, b) => a - b);

    // Look for bursts of activity (multiple transfers in short time windows)
    let burstCount = 0;
    let timeGaps: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      const timeDiff = timestamps[i] - timestamps[i - 1];
      timeGaps.push(timeDiff);

      // If transfers are less than 5 minutes apart, consider it a burst
      if (timeDiff < 5 * 60 * 1000) {
        burstCount++;
      }
    }

    const averageTimeBetweenTransfers =
      timeGaps.length > 0
        ? timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length
        : 0;

    // If there are multiple bursts or very regular intervals, it's suspicious
    if (
      burstCount > 0 ||
      (averageTimeBetweenTransfers > 0 &&
        averageTimeBetweenTransfers < CONFIG.thresholds.detection.timeWindow)
    ) {
      suspiciousPatterns[attacker.address] = {
        burstCount,
        averageTimeBetweenTransfers,
      };
    }
  });

  return {
    potentialAttackers,
    potentialVictims,
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
async function expandInvestigation(
  initialTransactions: TransactionData[],
  potentialAttackers: DustingAttacker[],
  potentialVictims: DustingVictim[] = []
): Promise<TransactionData[]> {
  console.log("Expanding investigation to related addresses...");

  // Extract addresses from potential attackers and victims for deeper investigation
  const addressesToInvestigate = new Set<string>();

  // Add top dusting attackers to investigation list
  potentialAttackers.forEach((attacker) => {
    addressesToInvestigate.add(attacker.address);
  });
  
  // Add selected victims to investigation list (optional)
  // Limiting to top 10 victims with highest risk scores to avoid excessive API calls
  potentialVictims
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .forEach((victim) => {
      addressesToInvestigate.add(victim.address);
    });

  // Limit investigation to prevent excessive API calls
  const maxAdditionalAddresses = 20;
  if (addressesToInvestigate.size > maxAdditionalAddresses) {
    console.log(
      `Limiting expanded investigation to top ${maxAdditionalAddresses} dusting sources`
    );
    const topAddresses = Array.from(addressesToInvestigate).slice(
      0,
      maxAdditionalAddresses
    );
    addressesToInvestigate.clear();
    topAddresses.forEach((addr) => addressesToInvestigate.add(addr));
  }

  console.log(
    `Expanding investigation to ${addressesToInvestigate.size} related addresses`
  );

  // Fetch transactions for these additional addresses
  const additionalTransactions: TransactionData[] = [];

  for (const address of addressesToInvestigate) {
    const transactions = await fetchAddressTransactions(address, 200); // Limit to 200 per address
    additionalTransactions.push(...transactions);
    console.log(
      `Collected ${transactions.length} additional transactions for ${address}`
    );

    // Add a small delay to avoid rate limiting
    await sleep(5000);
  }

  console.log(
    `Collected ${additionalTransactions.length} additional transactions in total`
  );

  // Combine with initial transactions, removing duplicates
  const allSignatures = new Set<string>();
  const uniqueTransactions: TransactionData[] = [];

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

  console.log(
    `Total unique transactions after expansion: ${uniqueTransactions.length}`
  );

  return uniqueTransactions;
}

/**
 * Save results to a file
 */
function saveResults(transactions: TransactionData[], analysis: any): void {
  const results = {
    metadata: {
      timestamp: new Date().toISOString(),
      totalTransactions: transactions.length,
      dustThreshold: CONFIG.thresholds.dust.sol,
      minTransfersForDusting: CONFIG.thresholds.detection.minTransfers,
      dustTransactionCount: analysis.dustTransactionCount,
      potentialAttackersCount: analysis.potentialAttackers.length,
      potentialVictimsCount: analysis.potentialVictims.length,
      similarAddressGroupsCount: Object.keys(analysis.addressSimilarities)
        .length,
    },
    potentialAttackers: analysis.potentialAttackers,
    potentialVictims: analysis.potentialVictims,
    similarAddressGroups: analysis.addressSimilarities,
    transactions: transactions.slice(0, 1000), // Limit to first 1000 to keep file size manageable
  };

  fs.writeFileSync(
    CONFIG.output.file,
    JSON.stringify(
      results,
      (key, value) => {
        // Convert Sets to Arrays for JSON serialization
        if (value instanceof Set) return Array.from(value);
        return value;
      },
      2
    )
  );

  console.log(`Results saved to ${CONFIG.output.file}`);

  // Save full transaction data to a separate file if needed
  if (transactions.length > 1000) {
    const fullDataFile = "full_transaction_data.json";
    fs.writeFileSync(
      fullDataFile,
      JSON.stringify(
        {
          transactions: transactions,
        },
        (key, value) => {
          if (value instanceof Set) return Array.from(value);
          return value;
        },
        2
      )
    );
    console.log(`Full transaction data saved to ${fullDataFile}`);
  }
}

// Dynamic threshold management
let currentDustThreshold = CONFIG.thresholds.dust.sol;

async function updateDustThreshold() {
  try {
    const connection = getNextConnection();
    
    // Get current network fee using the newer getFeeForMessage API
    const { blockhash } = await connection.getLatestBlockhash();
    
    // Create a dummy keypair for fee calculation
    const payer = web3.Keypair.generate();
    
    // Create a simple transfer transaction
    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 1000,
      })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    
    // Get the message from the transaction
    const message = transaction.compileMessage();
    
    // Get the fee for this message
    let currentFee = 0.000005; // Default fallback fee (5000 lamports) if API call fails
    
    try {
      const feeResponse = await connection.getFeeForMessage(message);
      
      if (feeResponse && feeResponse.value) {
        currentFee = feeResponse.value / 1e9; // Convert lamports to SOL
        console.log(`Successfully retrieved current network fee: ${currentFee} SOL`);
      } else {
        console.warn('Fee response value is null or undefined, using fallback fee');
      }
    } catch (error: any) {
      console.warn(`Error getting fee for message, using fallback fee: ${error?.message || 'Unknown error'}`);
    }
    
    currentDustThreshold = currentFee * CONFIG.thresholds.dust.networkFeeMultiplier;
    console.log(`Updated dust threshold to ${currentDustThreshold} SOL`);
  } catch (error) {
    console.error("Error updating dust threshold:", error);
  }
}

// Update dust threshold periodically
setInterval(updateDustThreshold, CONFIG.thresholds.dust.updateInterval);

// Threat Intelligence Integration
async function checkThreatIntelligence(address: string): Promise<{
  chainalysisRisk?: number;
  trmLabsRisk?: number;
  combinedRisk: number;
}> {
  const results: {
    combinedRisk: number;
    chainalysisRisk?: number;
    trmLabsRisk?: number;
  } = { combinedRisk: 0 };

  try {
    if (CHAINALYSIS_API_KEY) {
      const chainalysisResponse = await axios.get(
        `https://api.chainalysis.com/api/risk/v1/addresses/${address}`,
        { headers: { "X-API-Key": CHAINALYSIS_API_KEY } }
      );
      results.chainalysisRisk = chainalysisResponse.data.risk;
    }
  } catch (error) {
    console.error("Chainalysis API error:", error);
  }

  try {
    if (TRM_LABS_API_KEY) {
      const trmResponse = await axios.post(
        "https://api.trmlabs.com/public/v1/screening",
        { address },
        { headers: { "X-API-Key": TRM_LABS_API_KEY } }
      );
      results.trmLabsRisk = trmResponse.data.riskScore;
    }
  } catch (error) {
    console.error("TRM Labs API error:", error);
  }

  // Combine risk scores
  const scores = [results.chainalysisRisk, results.trmLabsRisk].filter(
    (score) => score !== undefined
  ) as number[];

  results.combinedRisk =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return results;
}

// Network Analysis
class NetworkAnalyzer {
  private graph: Map<string, Set<string>> = new Map();
  private addressPatterns: Map<string, string[]> = new Map();
  // Track multi-hop relationships (A->B->C)
  private multiHopConnections: Map<string, Set<string>> = new Map();
  // Track transaction amounts for each edge
  private edgeWeights: Map<string, Map<string, number[]>> = new Map();
  // Cache for betweenness centrality calculations
  private betweennessCentralityCache: Map<string, number> = new Map();

  addTransaction(sender: string, recipient: string, amount: number = 0) {
    // Add to direct graph
    if (!this.graph.has(sender)) {
      this.graph.set(sender, new Set());
    }
    this.graph.get(sender)!.add(recipient);
    
    // Track edge weights (transaction amounts)
    if (!this.edgeWeights.has(sender)) {
      this.edgeWeights.set(sender, new Map());
    }
    if (!this.edgeWeights.get(sender)!.has(recipient)) {
      this.edgeWeights.get(sender)!.set(recipient, []);
    }
    this.edgeWeights.get(sender)!.get(recipient)!.push(amount);
    
    // Update multi-hop connections (up to 2 hops)
    this.updateMultiHopConnections(sender, recipient);
    
    // Invalidate centrality cache when graph changes
    this.betweennessCentralityCache.clear();
  }

  private updateMultiHopConnections(sender: string, recipient: string) {
    // Initialize multi-hop connections for sender if not exists
    if (!this.multiHopConnections.has(sender)) {
      this.multiHopConnections.set(sender, new Set());
    }
    
    // Add direct connection
    this.multiHopConnections.get(sender)!.add(recipient);
    
    // Find all addresses that the recipient connects to (2nd hop)
    const recipientConnections = this.graph.get(recipient);
    if (recipientConnections) {
      for (const secondHop of recipientConnections) {
        this.multiHopConnections.get(sender)!.add(secondHop);
      }
    }
    
    // Update connections for addresses that connect to sender (reverse 2nd hop)
    for (const [address, connections] of this.graph.entries()) {
      if (connections.has(sender)) {
        if (!this.multiHopConnections.has(address)) {
          this.multiHopConnections.set(address, new Set());
        }
        this.multiHopConnections.get(address)!.add(recipient);
      }
    }
  }

  findClusters(): Map<string, Set<string>> {
    const clusters = new Map<string, Set<string>>();
    const visited = new Set<string>();

    const dfs = (address: string, cluster: Set<string>, depth: number = 0, maxDepth: number = 3) => {
      if (visited.has(address) || depth > maxDepth) return;
      visited.add(address);
      cluster.add(address);

      const connections = this.graph.get(address) || new Set();
      for (const connected of connections) {
        dfs(connected, cluster, depth + 1, maxDepth);
      }
    };

    for (const address of this.graph.keys()) {
      if (!visited.has(address)) {
        const cluster = new Set<string>();
        dfs(address, cluster);
        if (cluster.size > 1) {
          clusters.set(address, cluster);
        }
      }
    }

    return clusters;
  }

  calculateCentrality(address: string): number {
    const connections = this.graph.get(address);
    if (!connections) return 0;

    const directConnections = connections.size;
    let secondDegreeConnections = 0;

    for (const recipient of connections) {
      const recipientConnections = this.graph.get(recipient);
      if (recipientConnections) secondDegreeConnections += recipientConnections.size;
    }

    return directConnections + secondDegreeConnections * 0.5;
  }
  
  calculateBetweennessCentrality(address: string): number {
    // Check cache first
    if (this.betweennessCentralityCache.has(address)) {
      return this.betweennessCentralityCache.get(address)!;
    }
    
    // Get all nodes in the graph
    const nodes = new Set<string>();
    for (const [node, connections] of this.graph.entries()) {
      nodes.add(node);
      for (const connection of connections) {
        nodes.add(connection);
      }
    }
    
    // If there are too many nodes, use an approximation
    if (nodes.size > 1000) {
      const approximation = this.approximateBetweennessCentrality(address);
      this.betweennessCentralityCache.set(address, approximation);
      return approximation;
    }
    
    // Calculate betweenness centrality (number of shortest paths that pass through this node)
    let betweenness = 0;
    const nodeArray = Array.from(nodes);
    
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        if (i === j) continue;
        
        const source = nodeArray[i];
        const target = nodeArray[j];
        
        // Skip if source or target is the address we're calculating for
        if (source === address || target === address) continue;
        
        // Find all shortest paths between source and target
        const paths = this.findAllShortestPaths(source, target);
        if (paths.length === 0) continue;
        
        // Count paths that pass through address
        let pathsThroughAddress = 0;
        for (const path of paths) {
          if (path.includes(address)) {
            pathsThroughAddress++;
          }
        }
        
        // Add contribution to betweenness
        betweenness += pathsThroughAddress / paths.length;
      }
    }
    
    // Normalize by the maximum possible betweenness
    const n = nodes.size;
    if (n > 2) {  // Avoid division by zero
      betweenness = betweenness / ((n - 1) * (n - 2) / 2);
    }
    
    // Cache the result
    this.betweennessCentralityCache.set(address, betweenness);
    return betweenness;
  }
  
  private approximateBetweennessCentrality(address: string): number {
    // For large graphs, use an approximation based on local structure
    const connections = this.graph.get(address);
    if (!connections || connections.size === 0) return 0;
    
    // Calculate how many pairs of neighbors would need to go through this node
    let pairs = 0;
    const neighbors = Array.from(connections);
    
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const neighbor1 = neighbors[i];
        const neighbor2 = neighbors[j];
        
        // Check if these neighbors are directly connected
        const neighbor1Connections = this.graph.get(neighbor1);
        if (neighbor1Connections && neighbor1Connections.has(neighbor2)) {
          // They're directly connected, so they don't need to go through address
          continue;
        }
        
        // These neighbors would need to go through address to reach each other
        pairs++;
      }
    }
    
    // Normalize by the maximum possible pairs
    const n = connections.size;
    const maxPairs = (n * (n - 1)) / 2;  // n choose 2
    
    return maxPairs > 0 ? pairs / maxPairs : 0;
  }
  
  private findAllShortestPaths(source: string, target: string): string[][] {
    // Use BFS to find all shortest paths between source and target
    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: source, path: [source] }];
    const shortestPaths: string[][] = [];
    let shortestLength = Infinity;
    
    visited.add(source);
    
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      // If we've found paths longer than the shortest one, stop searching
      if (path.length > shortestLength) break;
      
      // If we've reached the target
      if (node === target) {
        if (path.length < shortestLength) {
          // Found a shorter path, clear previous paths
          shortestLength = path.length;
          shortestPaths.length = 0;
        }
        shortestPaths.push(path);
        continue;
      }
      
      // Explore neighbors
      const neighbors = this.graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    
    return shortestPaths;
  }
  
  // Find common funding sources for a set of addresses
  async findCommonFundingSources(addresses: string[]): Promise<Map<string, string[]>> {
    const commonSources = new Map<string, string[]>();
    const addressSet = new Set(addresses);
    
    // For each address in the graph, check if it's a source for multiple addresses in our set
    for (const [source, targets] of this.graph.entries()) {
      const connectedAddresses: string[] = [];
      
      for (const target of targets) {
        if (addressSet.has(target)) {
          connectedAddresses.push(target);
        }
      }
      
      // If this source connects to multiple addresses in our set, it's a common source
      if (connectedAddresses.length > 1) {
        commonSources.set(source, connectedAddresses);
      }
    }
    
    return commonSources;
  }
  
  // Analyze transaction patterns for an address
  analyzeTransactionPatterns(address: string): {
    outgoingCount: number;
    incomingCount: number;
    uniqueTargets: number;
    uniqueSources: number;
    averageOutgoingAmount: number;
    averageIncomingAmount: number;
    patternRegularity: number;
  } {
    let outgoingCount = 0;
    let incomingCount = 0;
    let uniqueTargets = 0;
    let uniqueSources = 0;
    let totalOutgoingAmount = 0;
    let totalIncomingAmount = 0;
    
    // Outgoing transactions
    const outgoingConnections = this.graph.get(address);
    if (outgoingConnections) {
      uniqueTargets = outgoingConnections.size;
      
      // Calculate total outgoing amount
      const outgoingAmounts = this.edgeWeights.get(address);
      if (outgoingAmounts) {
        for (const [_, amounts] of outgoingAmounts) {
          outgoingCount += amounts.length;
          totalOutgoingAmount += amounts.reduce((sum, amount) => sum + amount, 0);
        }
      }
    }
    
    // Incoming transactions
    for (const [source, targets] of this.graph.entries()) {
      if (targets.has(address)) {
        uniqueSources++;
        
        // Calculate total incoming amount
        const sourceAmounts = this.edgeWeights.get(source);
        if (sourceAmounts && sourceAmounts.has(address)) {
          const amounts = sourceAmounts.get(address)!;
          incomingCount += amounts.length;
          totalIncomingAmount += amounts.reduce((sum, amount) => sum + amount, 0);
        }
      }
    }
    
    // Calculate averages
    const averageOutgoingAmount = outgoingCount > 0 ? totalOutgoingAmount / outgoingCount : 0;
    const averageIncomingAmount = incomingCount > 0 ? totalIncomingAmount / incomingCount : 0;
    
    // Calculate pattern regularity (0-1) based on consistency of transaction amounts
    let patternRegularity = 0;
    if (outgoingCount > 1) {
      const outgoingAmounts = this.edgeWeights.get(address);
      if (outgoingAmounts) {
        // Flatten all amounts into a single array
        const allAmounts: number[] = [];
        for (const [_, amounts] of outgoingAmounts) {
          allAmounts.push(...amounts);
        }
        
        // Calculate standard deviation
        const mean = allAmounts.reduce((sum, val) => sum + val, 0) / allAmounts.length;
        const variance = allAmounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allAmounts.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate coefficient of variation (lower means more regular)
        const cv = mean > 0 ? stdDev / mean : 0;
        
        // Convert to regularity score (1 - normalized CV)
        patternRegularity = Math.max(0, Math.min(1, 1 - (cv / (1 + cv))));
      }
    }
    
    return {
      outgoingCount,
      incomingCount,
      uniqueTargets,
      uniqueSources,
      averageOutgoingAmount,
      averageIncomingAmount,
      patternRegularity
    };
  }
}

// Enhanced address similarity detection for poisoning
const HOMOGLYPHS: Record<string, string[]> = {
  "0": ["O", "o", "Q", "D"],
  "O": ["0", "o", "Q", "D"],
  "o": ["0", "O", "Q", "a"],
  "l": ["I", "1", "|", "i"],
  "I": ["l", "1", "|", "i"],
  "1": ["l", "I", "|", "i"],
  "|": ["l", "I", "1", "i"],
  "i": ["l", "I", "1", "|"],
  "5": ["S", "s"],
  "S": ["5", "s"],
  "s": ["5", "S"],
  "B": ["8", "b"],
  "8": ["B", "b"],
  "b": ["B", "8"],
  "n": ["m", "r"],
  "m": ["n", "w"],
  "w": ["vv", "W", "m"],
  "vv": ["w", "W"],
  "W": ["w", "vv"],
  "g": ["q", "9"],
  "q": ["g", "9"],
  "9": ["g", "q"],
  "Z": ["2", "z"],
  "z": ["Z", "2"],
  "2": ["Z", "z"]
};

// Keyboard layout for typosquatting detection
const KEYBOARD_ADJACENCY: Record<string, string[]> = {
  "1": ["2", "q", "w"],
  "2": ["1", "3", "q", "w", "e"],
  "3": ["2", "4", "w", "e", "r"],
  "4": ["3", "5", "e", "r", "t"],
  "5": ["4", "6", "r", "t", "y"],
  "6": ["5", "7", "t", "y", "u"],
  "7": ["6", "8", "y", "u", "i"],
  "8": ["7", "9", "u", "i", "o"],
  "9": ["8", "0", "i", "o", "p"],
  "0": ["9", "o", "p"],
  "q": ["1", "2", "w", "a", "s"],
  "w": ["1", "2", "3", "q", "e", "a", "s", "d"],
  "e": ["2", "3", "4", "w", "r", "s", "d", "f"],
  "r": ["3", "4", "5", "e", "t", "d", "f", "g"],
  "t": ["4", "5", "6", "r", "y", "f", "g", "h"],
  "y": ["5", "6", "7", "t", "u", "g", "h", "j"],
  "u": ["6", "7", "8", "y", "i", "h", "j", "k"],
  "i": ["7", "8", "9", "u", "o", "j", "k", "l"],
  "o": ["8", "9", "0", "i", "p", "k", "l"],
  "p": ["9", "0", "o", "l"],
  "a": ["q", "w", "s", "z", "x"],
  "s": ["q", "w", "e", "a", "d", "z", "x", "c"],
  "d": ["w", "e", "r", "s", "f", "x", "c", "v"],
  "f": ["e", "r", "t", "d", "g", "c", "v", "b"],
  "g": ["r", "t", "y", "f", "h", "v", "b", "n"],
  "h": ["t", "y", "u", "g", "j", "b", "n", "m"],
  "j": ["y", "u", "i", "h", "k", "n", "m"],
  "k": ["u", "i", "o", "j", "l", "m"],
  "l": ["i", "o", "p", "k"],
  "z": ["a", "s", "x"],
  "x": ["z", "a", "s", "d", "c"],
  "c": ["x", "s", "d", "f", "v"],
  "v": ["c", "d", "f", "g", "b"],
  "b": ["v", "f", "g", "h", "n"],
  "n": ["b", "g", "h", "j", "m"],
  "m": ["n", "h", "j", "k"]
};

function findHomoglyphPatterns(address: string): string[] {
  const patterns: string[] = [];
  const chars = address.split("");

  // Generate single-character substitutions
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
  
  // Generate keyboard typo patterns (limited to 2 to avoid explosion)
  for (let i = 0; i < Math.min(chars.length, 8); i++) {
    const char = chars[i].toLowerCase();
    if (KEYBOARD_ADJACENCY[char]) {
      KEYBOARD_ADJACENCY[char].forEach((replacement) => {
        const pattern = [...chars];
        pattern[i] = replacement;
        patterns.push(pattern.join(""));
      });
    }
  }

  return patterns;
}

// Calculate visual similarity between two addresses
function calculateVisualSimilarity(address1: string, address2: string): number {
  if (address1 === address2) return 1.0;
  if (address1.length !== address2.length) return 0.0;
  
  let matchCount = 0;
  const chars1 = address1.split("");
  const chars2 = address2.split("");
  
  for (let i = 0; i < chars1.length; i++) {
    // Exact match
    if (chars1[i] === chars2[i]) {
      matchCount += 1;
      continue;
    }
    
    // Homoglyph match
    const homoglyphs1 = HOMOGLYPHS[chars1[i]] || [];
    if (homoglyphs1.includes(chars2[i])) {
      matchCount += 0.8; // 80% similarity for homoglyphs
      continue;
    }
    
    // Keyboard adjacency match
    const adjacent1 = KEYBOARD_ADJACENCY[chars1[i].toLowerCase()] || [];
    if (adjacent1.includes(chars2[i].toLowerCase())) {
      matchCount += 0.4; // 40% similarity for adjacent keys
    }
  }
  
  return matchCount / chars1.length;
}

// Calculate comprehensive address similarity score
function calculateAddressSimilarity(address1: string, address2: string): number {
  // Calculate visual similarity score
  const visualSimilarity = calculateVisualSimilarity(address1, address2);
  
  // Calculate Levenshtein distance-based similarity
  const levDistance = levenshteinDistance(address1, address2);
  const maxLength = Math.max(address1.length, address2.length);
  const levenshteinSimilarity = 1 - (levDistance / maxLength);
  
  // Calculate prefix/suffix similarity
  let prefixSimilarity = 0;
  let suffixSimilarity = 0;
  
  // Check for common prefix (first 4-8 chars)
  const prefixLength = Math.min(8, Math.min(address1.length, address2.length));
  const prefix1 = address1.substring(0, prefixLength);
  const prefix2 = address2.substring(0, prefixLength);
  prefixSimilarity = calculateVisualSimilarity(prefix1, prefix2);
  
  // Check for common suffix (last 4-8 chars)
  const suffixLength = Math.min(8, Math.min(address1.length, address2.length));
  const suffix1 = address1.substring(address1.length - suffixLength);
  const suffix2 = address2.substring(address2.length - suffixLength);
  suffixSimilarity = calculateVisualSimilarity(suffix1, suffix2);
  
  // Combine scores with appropriate weights
  // Prefix and suffix similarity are weighted higher for Solana addresses
  return (
    0.3 * visualSimilarity +
    0.2 * levenshteinSimilarity +
    0.3 * prefixSimilarity +
    0.2 * suffixSimilarity
  );
}

// Token-aware dust detection
async function getTokenMetadata(mint: string): Promise<TokenMetadata | null> {
  try {
    const connection = getNextConnection();
    const info = await connection.getParsedAccountInfo(new PublicKey(mint));

    if (!info.value?.data || typeof info.value.data !== "object") {
      return null;
    }

    const metadata = {
      address: mint,
      symbol: (info.value.data as any).parsed.info.symbol,
      name: (info.value.data as any).parsed.info.name,
      decimals: (info.value.data as any).parsed.info.decimals,
      dustThreshold: 0,
    };

    // Set token-specific dust threshold based on decimals
    metadata.dustThreshold = 1 / Math.pow(10, metadata.decimals / 2);

    return metadata;
  } catch (error) {
    console.error(`Error fetching token metadata for ${mint}:`, error);
    return null;
  }
}

// Enhanced risk scoring
function calculateRiskScore(data: {
  dustAmount: number;
  transferPattern: number;
  addressSimilarity: number;
  temporalPattern: number;
  thirdPartyRisk: number;
}): number {
  return Object.entries(RISK_WEIGHTS).reduce((score, [key, weight]) => {
    return score + data[key as keyof typeof data] * weight;
  }, 0);
}

/**
 * Main function to run the analysis
 */
async function main() {
  console.log("Starting enhanced Solana dusting/poisoning detection...");

  // Initialize p-limit first
  await initializePLimit();

  // Initialize network analyzer
  const networkAnalyzer = new NetworkAnalyzer();
  
  // Initialize adaptive thresholds
  const adaptiveThresholds = new AdaptiveThresholds(getNextConnection());
  await adaptiveThresholds.updateThresholds();
  const thresholds = adaptiveThresholds.getCurrentThresholds();
  console.log('Using adaptive thresholds:', thresholds);
  
  // Initialize ML model
  const mlModel = new DustDetectionModel();
  
  // Initialize alert system if enabled
  const alertSystem = process.env.ENABLE_ALERTS === 'true' ? 
    new DustingAlertSystem({
      enabled: true,
      channels: {
        discord: process.env.DISCORD_WEBHOOK_URL ? {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL
        } : undefined,
        email: process.env.EMAIL_RECIPIENTS ? {
          recipients: process.env.EMAIL_RECIPIENTS.split(','),
          smtpConfig: {
            host: process.env.SMTP_HOST || '',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || ''
            }
          }
        } : undefined
      }
    }) : null;
  
  // Start alert monitoring if enabled
  if (alertSystem) {
    alertSystem.monitorInRealTime().catch(error => {
      console.error('Error starting alert system:', error);
    });
  }
  
  // Initialize dust threshold
  await updateDustThreshold();

  // 1. Find active addresses automatically
  const activeAddresses = await findActiveAddresses();
  console.log(`Found ${activeAddresses.size} active addresses`);

  // 2. Find reported addresses from external sources
  const reportedAddresses = await findReportedAddresses();
  console.log(`Found ${reportedAddresses.size} reported addresses`);

  // 3. Find potential victims from social media
  const potentialVictims = await findPotentialVictims();
  console.log(`Found ${potentialVictims.size} potential victims`);

  // Combine all address sources
  const addressesToAnalyze = new Set<string>([
    ...activeAddresses,
    ...reportedAddresses,
    ...potentialVictims,
  ]);

  console.log(`Total unique addresses to analyze: ${addressesToAnalyze.size}`);

  // Process addresses with enhanced analysis
  const allTransactions: TransactionData[] = [];
  const riskAnalysis: Map<string, RiskAnalysis> = new Map();

  // Process addresses in smaller chunks to manage memory
  const addressesArray = Array.from(addressesToAnalyze);
  const chunkSize = 20;

  for (let i = 0; i < addressesArray.length; i += chunkSize) {
    const addressChunk = addressesArray.slice(i, i + chunkSize);
    console.log(
      `Processing addresses ${i + 1} to ${i + addressChunk.length} of ${
        addressesArray.length
      }`
    );

    // Process chunk with parallel execution but controlled concurrency
    const chunkPromises = addressChunk.map((address) =>
      limitInstance(async () => {
        const transactions = await fetchAddressTransactions(address, 200);

        // Check threat intelligence
        const threatIntel = await checkThreatIntelligence(address);

        // Add transactions to network analyzer
        transactions.forEach((tx) => {
          if (tx.sender && tx.recipient) {
            networkAnalyzer.addTransaction(tx.sender, tx.recipient);
          }
        });

        return { address, transactions, threatIntel };
      })
    );

    const chunkResults = await Promise.all(chunkPromises);

    // Process results
    for (const result of chunkResults) {
      allTransactions.push(...result.transactions);

      // Calculate network metrics
      const centralityScore = networkAnalyzer.calculateCentrality(
        result.address
      );

      // Find similar addresses
      const similarAddresses = findHomoglyphPatterns(result.address);

      // Store risk analysis
      riskAnalysis.set(result.address, {
        address: result.address,
        riskScore: calculateRiskScore({
          dustAmount:
            result.transactions.filter(
              (tx: { isPotentialDust: any }) => tx.isPotentialDust
            ).length / result.transactions.length,
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

    await sleep(5000); // Rate limiting
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
        dustAmount:
          finalAnalysis.dustTransactionCount / finalAnalysis.totalTransactions,
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
        averageClusterSize:
          Array.from(clusters.values()).reduce(
            (sum, cluster) => sum + cluster.size,
            0
          ) / clusters.size,
      },
    },
    riskAnalysis: Array.from(riskAnalysis.values()),
    clusters: Array.from(clusters.entries()).map(([key, value]) => ({
      root: key,
      size: value.size,
      addresses: Array.from(value),
    })),
    potentialAttackers: finalAnalysis.potentialAttackers,
    potentialVictims: finalAnalysis.potentialVictims,
    addressSimilarities: finalAnalysis.addressSimilarities,
  };

  fs.writeFileSync(
    "enhanced_analysis_results.json",
    JSON.stringify(
      enhancedResults,
      (key, value) => {
        if (value instanceof Set) return Array.from(value);
        return value;
      },
      2
    )
  );

  console.log("Enhanced analysis complete!");
  console.log(
    `Found ${enhancedResults.riskAnalysis.length} addresses with risk scores`
  );
  console.log(`Identified ${clusters.size} suspicious network clusters`);
}

// Run the main function
main().catch((error) => {
  console.error("Error in main execution:", error);
});

// Export for API server usage
export { analyzeTransactions, processTransaction };

