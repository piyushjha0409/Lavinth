/**
 * Phase 5 Migration: Transaction Simulation
 * Creates tables for transaction simulation and analysis
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log('Starting Phase 5 migration: Transaction Simulation...\n');

  try {
    // Create transaction_simulations table
    console.log('Creating transaction_simulations table...');
    await pool.query(`
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
    console.log('✓ transaction_simulations table created\n');

    // Create verified_programs table
    console.log('Creating verified_programs table...');
    await pool.query(`
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
    console.log('✓ verified_programs table created\n');

    // Create simulation_alerts table
    console.log('Creating simulation_alerts table...');
    await pool.query(`
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
    console.log('✓ simulation_alerts table created\n');

    // Seed verified programs
    console.log('Seeding verified programs...');
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
      await pool.query(
        `INSERT INTO verified_programs
         (program_id, program_name, category, description, is_verified, is_audited, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (program_id) DO UPDATE SET
         program_name = EXCLUDED.program_name,
         is_verified = EXCLUDED.is_verified,
         is_audited = EXCLUDED.is_audited,
         risk_level = EXCLUDED.risk_level,
         updated_at = NOW()`,
        [
          program.program_id,
          program.program_name,
          program.category,
          program.description,
          program.is_verified,
          program.is_audited,
          program.risk_level,
        ]
      );
    }
    console.log(`✓ ${verifiedPrograms.length} verified programs seeded\n`);

    console.log('Phase 5 migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
