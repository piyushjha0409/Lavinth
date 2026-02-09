import * as dotenv from 'dotenv';
import { Pool, PoolClient, QueryResult } from 'pg';
import logger from '../logger';

dotenv.config();

// Create a custom pool class with built-in retry logic
export class CustomPool extends Pool {
  constructor() {
    super({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20, // Max number of clients in pool
      idleTimeoutMillis: 60000, // 1 minute
      connectionTimeoutMillis: 10000, // 10 seconds
      statement_timeout: 30000, // Optional: kills long queries
    });

    // On successful connection
    this.on('connect', () => {
      logger.info('Connected to Neon PostgreSQL');
    });

    // Log idle client errors
    this.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });
  }

  // Add retry-enabled query execution function
  async executeQuery(
    text: string,
    params: any[] = [],
    maxRetries = 3
  ): Promise<QueryResult> {
    let retries = 0;
    let lastError: any = null;

    while (retries < maxRetries) {
      let client: PoolClient | null = null;
      try {
        client = await this.connect();
        const result = await client.query(text, params);
        return result;
      } catch (error: any) {
        lastError = error;
        retries++;
        logger.error({ err: error, attempt: retries, maxRetries }, 'Query error');

        if (retries < maxRetries) {
          const delay = 1000 * 2 ** (retries - 1);
          logger.info({ delay }, 'Retrying database query');
          await new Promise((res) => setTimeout(res, delay));
        }
      } finally {
        if (client) client.release();
      }
    }

    logger.error({ maxRetries }, 'All database query attempts failed');
    throw lastError;
  }
}

// Create and export a single instance of the custom pool
const pool = new CustomPool();
export default pool;
