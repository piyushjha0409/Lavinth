"use strict";
/**
 * Phase 5 Migration: Transaction Simulation
 * Creates tables for transaction simulation and analysis
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
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../logger"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Starting Phase 5 migration: Transaction Simulation...');
        try {
            // Create transaction_simulations table
            logger_1.default.info('Creating transaction_simulations table...');
            yield pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_simulations (
        id SERIAL PRIMARY KEY,
        simulation_id VARCHAR(64) UNIQUE NOT NULL,
        wallet_address VARCHAR(64) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        risk_level VARCHAR(20) NOT NULL,
        risk_score INTEGER NOT NULL DEFAULT 0,
        warnings JSONB DEFAULT '[]',
        effects JSONB DEFAULT '[]',
        balance_changes JSONB DEFAULT '[]',
        approval_changes JSONB DEFAULT '[]',
        programs_invoked JSONB DEFAULT '[]',
        estimated_fee BIGINT DEFAULT 0,
        compute_units INTEGER DEFAULT 0,
        raw_logs TEXT[],
        simulated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_simulations_wallet ON transaction_simulations(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_simulations_risk ON transaction_simulations(risk_level);
      CREATE INDEX IF NOT EXISTS idx_simulations_date ON transaction_simulations(simulated_at DESC);
    `);
            logger_1.default.info('transaction_simulations table created');
            // Create verified_programs table
            logger_1.default.info('Creating verified_programs table...');
            yield pool.query(`
      CREATE TABLE IF NOT EXISTS verified_programs (
        id SERIAL PRIMARY KEY,
        program_id VARCHAR(64) UNIQUE NOT NULL,
        program_name VARCHAR(128) NOT NULL,
        category VARCHAR(64),
        description TEXT,
        website_url VARCHAR(256),
        is_verified BOOLEAN DEFAULT false,
        is_audited BOOLEAN DEFAULT false,
        audit_url VARCHAR(256),
        risk_level VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_verified_programs_id ON verified_programs(program_id);
    `);
            logger_1.default.info('verified_programs table created');
            // Create simulation_alerts table
            logger_1.default.info('Creating simulation_alerts table...');
            yield pool.query(`
      CREATE TABLE IF NOT EXISTS simulation_alerts (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(64) UNIQUE NOT NULL,
        simulation_id VARCHAR(64) REFERENCES transaction_simulations(simulation_id),
        wallet_address VARCHAR(64) NOT NULL,
        alert_type VARCHAR(64) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        is_acknowledged BOOLEAN DEFAULT false,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_simulation_alerts_wallet ON simulation_alerts(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_simulation_alerts_simulation ON simulation_alerts(simulation_id);
    `);
            logger_1.default.info('simulation_alerts table created');
            // Seed verified programs
            logger_1.default.info('Seeding verified programs...');
            const verifiedPrograms = [
                {
                    program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                    program_name: 'SPL Token Program',
                    category: 'token',
                    description: 'Official Solana Program Library Token Program',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                    program_name: 'Token-2022 Program',
                    category: 'token',
                    description: 'Solana Token-2022 Program with extensions',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
                    program_name: 'Associated Token Account Program',
                    category: 'token',
                    description: 'Creates associated token accounts',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: '11111111111111111111111111111111',
                    program_name: 'System Program',
                    category: 'system',
                    description: 'Solana System Program for account management',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'ComputeBudget111111111111111111111111111111',
                    program_name: 'Compute Budget Program',
                    category: 'system',
                    description: 'Sets compute unit limits and priority fees',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
                    program_name: 'Memo Program',
                    category: 'utility',
                    description: 'Adds memo/notes to transactions',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
                    program_name: 'Metaplex Token Metadata',
                    category: 'nft',
                    description: 'NFT metadata program by Metaplex',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
                    program_name: 'Jupiter Aggregator v6',
                    category: 'dex',
                    description: 'Jupiter DEX aggregator',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
                    program_name: 'Serum DEX v3',
                    category: 'dex',
                    description: 'Serum decentralized exchange',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
                    program_name: 'Orca Whirlpools',
                    category: 'dex',
                    description: 'Orca concentrated liquidity DEX',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
                    program_name: 'Raydium CPMM',
                    category: 'dex',
                    description: 'Raydium Concentrated Pool Market Maker',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'safe',
                },
                {
                    program_id: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb',
                    program_name: 'Wormhole Token Bridge',
                    category: 'bridge',
                    description: 'Wormhole cross-chain token bridge',
                    is_verified: true,
                    is_audited: true,
                    risk_level: 'low',
                },
            ];
            for (const program of verifiedPrograms) {
                yield pool.query(`INSERT INTO verified_programs
         (program_id, program_name, category, description, is_verified, is_audited, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (program_id) DO UPDATE SET
         program_name = EXCLUDED.program_name,
         is_verified = EXCLUDED.is_verified,
         is_audited = EXCLUDED.is_audited,
         risk_level = EXCLUDED.risk_level,
         updated_at = NOW()`, [
                    program.program_id,
                    program.program_name,
                    program.category,
                    program.description,
                    program.is_verified,
                    program.is_audited,
                    program.risk_level,
                ]);
            }
            logger_1.default.info({ count: verifiedPrograms.length }, 'Verified programs seeded');
            logger_1.default.info('Phase 5 migration completed successfully!');
        }
        catch (error) {
            logger_1.default.error({ err: error }, 'Migration failed');
            throw error;
        }
        finally {
            yield pool.end();
        }
    });
}
migrate().catch((err) => {
    logger_1.default.error({ err }, 'Migration error');
});
