import fs from 'fs';
import path from 'path';
import { QueryResult } from 'pg';
import pool from './config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeDatabase() {
  const client = await pool.connect();
  console.log("Connected to database, starting initialization...");
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Drop existing schema and tables if they exist
    console.log("Dropping existing schema and tables...");
    await client.query(`
      -- First drop all materialized views to avoid dependency issues
      DROP MATERIALIZED VIEW IF EXISTS dust_attack_daily_summary CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS attacker_pattern_summary CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS victim_exposure_summary CASCADE;
      
      -- Drop regular views
      DROP VIEW IF EXISTS high_risk_addresses CASCADE;
      
      -- Drop functions
      DROP FUNCTION IF EXISTS refresh_dust_analysis_views() CASCADE;
      
      -- Drop all tables
      DROP TABLE IF EXISTS dust_transactions CASCADE;
      DROP TABLE IF EXISTS risk_analysis CASCADE;
      DROP TABLE IF EXISTS dusting_attackers CASCADE;
      DROP TABLE IF EXISTS dusting_victims CASCADE;
      DROP TABLE IF EXISTS dusting_candidates CASCADE;
      
      -- Drop the schema itself
      DROP SCHEMA IF EXISTS dust_detector CASCADE;
    `);
    
    // Read schema SQL from file
    console.log("Reading schema file...");
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL
    console.log("Creating new database schema...");
    await client.query(schemaSql);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log("Database initialized successfully!");
    console.log("Tables created:");
    
    // List created tables for verification
    const tablesResult: QueryResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    console.log("\nMaterialized views created:");
    const viewsResult: QueryResult = await client.query(`
      SELECT matviewname 
      FROM pg_matviews 
      ORDER BY matviewname;
    `);
    
    viewsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.matviewname}`);
    });
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
    // Only close the pool if we're running this as a standalone script
    // Don't close if this is imported and used elsewhere
    if (require.main === module) {
      await pool.end();
    }
  }
}

// Execute the initialization function only if this file is run directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialization completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}

export { initializeDatabase };