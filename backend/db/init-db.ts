import fs from 'fs';
import path from 'path';
import { QueryResult } from 'pg';
import pool from './config';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  const client = await pool.connect();
  console.log("Connected to database, starting initialization...");

  try {
    await client.query('BEGIN');

    console.log("Dropping existing tables if they exist...");
    await client.query(`
      DROP TABLE IF EXISTS dust_transactions CASCADE;
      DROP TABLE IF EXISTS dusting_attackers CASCADE;
      DROP TABLE IF EXISTS dusting_candidates CASCADE;
      DROP TABLE IF EXISTS dusting_victims CASCADE;
      DROP TABLE IF EXISTS risk_analysis CASCADE;
    `);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Executing schema...");
    await client.query(schemaSql);

    await client.query('COMMIT');
    console.log("✅ Database schema created successfully!");

    const tablesResult: QueryResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("Tables created:");
    tablesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error initializing database:", error);
    throw error;
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("🎉 Database initialization complete.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Initialization failed:", error);
      process.exit(1);
    });
}

export { initializeDatabase };
