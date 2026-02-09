import { QueryResult } from "pg";
import * as fs from "fs";
import * as path from "path";
import pool, { CustomPool } from "./config";
import logger from '../logger';

export class DatabaseUtils {
  pool: CustomPool;

  constructor() {
    this.pool = pool;
  }

  async initializeDatabase(): Promise<void> {
    const client = await pool.connect();
    try {
      const schemaPath = path.join(__dirname, "schema.sql");
      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      await client.query(schemaSql);
    } catch (error) {
      logger.error({ err: error }, 'Error initializing database schema');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default new DatabaseUtils();
