"use strict";
/**
 * Phase 3 Database Migration
 * Creates exchange coordination and freeze request tables
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
const phase3Schema = `
-- Table: exchange_contacts
CREATE TABLE IF NOT EXISTS exchange_contacts (
  id SERIAL PRIMARY KEY,
  exchange_id TEXT UNIQUE NOT NULL,
  exchange_name TEXT NOT NULL,
  exchange_type TEXT DEFAULT 'cex',
  compliance_email TEXT,
  compliance_phone TEXT,
  emergency_email TEXT,
  api_endpoint TEXT,
  response_time_sla INTEGER DEFAULT 24,
  freeze_capability BOOLEAN DEFAULT TRUE,
  kyc_required BOOLEAN DEFAULT TRUE,
  min_freeze_amount NUMERIC DEFAULT 0,
  supported_tokens TEXT[],
  documentation_url TEXT,
  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_contacted_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  successful_freezes INTEGER DEFAULT 0,
  avg_response_time NUMERIC,
  success_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: freeze_requests_v2
CREATE TABLE IF NOT EXISTS freeze_requests_v2 (
  id SERIAL PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  trace_id TEXT NOT NULL,
  exchange_id TEXT NOT NULL,
  exchange_name TEXT NOT NULL,
  victim_wallet TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  deposit_signature TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_mint TEXT,
  token_symbol TEXT,
  status TEXT DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  evidence_package_id TEXT,
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  frozen_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  exchange_ticket_id TEXT,
  exchange_response TEXT,
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: evidence_packages
CREATE TABLE IF NOT EXISTS evidence_packages (
  id SERIAL PRIMARY KEY,
  package_id TEXT UNIQUE NOT NULL,
  trace_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  victim_wallet TEXT NOT NULL,
  victim_statement TEXT,
  incident_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  total_stolen_amount NUMERIC NOT NULL,
  token_mint TEXT,
  transaction_signatures JSONB NOT NULL,
  fund_flow_summary JSONB NOT NULL,
  exchange_deposits JSONB NOT NULL,
  blockchain_evidence JSONB NOT NULL,
  supporting_documents JSONB,
  hash_signature TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exchange_contacts_name ON exchange_contacts(exchange_name);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_trace ON freeze_requests_v2(trace_id);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_status ON freeze_requests_v2(status);
CREATE INDEX IF NOT EXISTS idx_freeze_requests_v2_priority ON freeze_requests_v2(priority);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_trace ON evidence_packages(trace_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_request ON evidence_packages(request_id);

-- Seed exchange contacts
INSERT INTO exchange_contacts (exchange_id, exchange_name, exchange_type, compliance_email, emergency_email, response_time_sla, freeze_capability, kyc_required, min_freeze_amount, is_verified) VALUES
('binance', 'Binance', 'cex', 'compliance@binance.com', 'security@binance.com', 24, true, true, 0.1, true),
('coinbase', 'Coinbase', 'cex', 'compliance@coinbase.com', 'security@coinbase.com', 24, true, true, 0.1, true),
('kraken', 'Kraken', 'cex', 'compliance@kraken.com', 'security@kraken.com', 48, true, true, 0.5, true),
('okx', 'OKX', 'cex', 'compliance@okx.com', 'security@okx.com', 24, true, true, 0.1, true),
('bybit', 'Bybit', 'cex', 'compliance@bybit.com', 'security@bybit.com', 24, true, true, 0.1, true),
('kucoin', 'KuCoin', 'cex', 'compliance@kucoin.com', 'security@kucoin.com', 48, true, true, 0.5, true),
('gate-io', 'Gate.io', 'cex', 'compliance@gate.io', 'security@gate.io', 48, true, true, 0.5, true),
('htx', 'HTX (Huobi)', 'cex', 'compliance@htx.com', 'security@htx.com', 48, true, true, 0.5, true),
('crypto-com', 'Crypto.com', 'cex', 'compliance@crypto.com', 'security@crypto.com', 24, true, true, 0.1, true),
('jupiter', 'Jupiter', 'dex', NULL, NULL, 72, false, false, 1.0, false),
('raydium', 'Raydium AMM', 'dex', NULL, NULL, 72, false, false, 1.0, false),
('orca', 'Orca Whirlpool', 'dex', NULL, NULL, 72, false, false, 1.0, false)
ON CONFLICT (exchange_id) DO NOTHING;
`;
function runMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info("Starting Phase 3 migration...");
        const pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        try {
            const client = yield pool.connect();
            logger_1.default.info("Connected to Neon PostgreSQL");
            logger_1.default.info("Creating Phase 3 tables...");
            yield client.query(phase3Schema);
            logger_1.default.info("Phase 3 tables created successfully!");
            // Verify
            const tablesResult = yield client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('exchange_contacts', 'freeze_requests_v2', 'evidence_packages')
      ORDER BY table_name
    `);
            logger_1.default.info("Phase 3 tables:");
            tablesResult.rows.forEach((row) => {
                logger_1.default.info({ table: row.table_name }, 'Phase 3 table created');
            });
            // Check exchange contacts
            const contactsResult = yield client.query(`SELECT COUNT(*) FROM exchange_contacts`);
            logger_1.default.info({ count: contactsResult.rows[0].count }, 'Exchange contacts seeded');
            client.release();
            logger_1.default.info("Phase 3 migration complete!");
        }
        catch (error) {
            logger_1.default.error({ err: error }, 'Migration failed');
            process.exit(1);
        }
        finally {
            yield pool.end();
        }
    });
}
runMigration();
