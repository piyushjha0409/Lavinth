import fs from 'fs';
import path from 'path';
import { QueryResult } from 'pg';
import pool from './config';
import dotenv from 'dotenv';
import logger from '../logger';

dotenv.config();

async function initializeDatabase() {
  const client = await pool.connect();
  logger.info("Connected to database, starting initialization...");

  try {
    await client.query('BEGIN');

    logger.info("Dropping existing tables if they exist...");
    // Get all tables and drop them
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    for (const row of tablesRes.rows) {
      await client.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE`);
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    logger.info("Executing schema...");
    await client.query(schemaSql);

    await client.query('COMMIT');
    logger.info("Database schema created successfully!");

    const tablesResult: QueryResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    logger.info("Tables created:");
    tablesResult.rows.forEach((row, index) => {
      logger.info({ index: index + 1, table: row.table_name }, 'Table created');
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Error initializing database');
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
      logger.info("Database initialization complete.");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, 'Initialization failed');
      process.exit(1);
    });
}

export { initializeDatabase };
