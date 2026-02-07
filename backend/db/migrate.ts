/**
 * Database Migration Script
 * Runs schema.sql against the Neon PostgreSQL database
 */

import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  console.log("Starting database migration...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log("Connected to Neon PostgreSQL\n");

    // Read schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Execute the entire schema as one transaction
    console.log("Executing schema...\n");
    await client.query(schema);

    console.log("Schema executed successfully!\n");

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`Created ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check seed data
    const exchangeCount = await client.query(`SELECT COUNT(*) FROM known_exchanges`);
    const bridgeCount = await client.query(`SELECT COUNT(*) FROM known_bridges`);

    console.log(`\nSeed data:`);
    console.log(`  - ${exchangeCount.rows[0].count} known exchanges`);
    console.log(`  - ${bridgeCount.rows[0].count} known bridges`);

    client.release();
    console.log("\n✓ Migration complete!");

  } catch (error: any) {
    console.error("Migration failed:", error.message);
    if (error.position) {
      console.error(`Error at position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
