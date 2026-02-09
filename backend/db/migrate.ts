/**
 * Database Migration Script
 * Runs schema.sql against the Neon PostgreSQL database
 */

import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import logger from '../logger';

dotenv.config();

async function runMigration() {
  logger.info("Starting database migration...");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    const client = await pool.connect();
    logger.info("Connected to Neon PostgreSQL");

    // Read schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Execute the entire schema as one transaction
    logger.info("Executing schema...");
    await client.query(schema);

    logger.info("Schema executed successfully!");

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    logger.info({ count: tablesResult.rows.length }, 'Tables created');
    tablesResult.rows.forEach((row) => {
      logger.info({ table: row.table_name }, 'Table created');
    });

    // Check seed data
    const exchangeCount = await client.query(`SELECT COUNT(*) FROM known_exchanges`);
    const bridgeCount = await client.query(`SELECT COUNT(*) FROM known_bridges`);

    logger.info('Seed data:');
    logger.info({ count: exchangeCount.rows[0].count }, 'Known exchanges');
    logger.info({ count: bridgeCount.rows[0].count }, 'Known bridges');

    client.release();
    logger.info("Migration complete!");

  } catch (error: any) {
    logger.error({ err: error, position: error.position }, 'Migration failed');

    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
