import * as dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';

dotenv.config();

// Create a robust connection pool with retry logic
const createPool = () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '31146'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 60000, // 1 minute idle timeout
    connectionTimeoutMillis: 10000, // 10 seconds connection timeout
    // Add statement timeout to prevent long-running queries
    statement_timeout: 30000, // 30 seconds
  });

  // Test the connection
  pool.on('connect', () => {
    console.log('Connected to TimescaleDB');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process, just log the error
    // process.exit(-1);
  });

  return pool;
};

// Create the initial pool
const pool = createPool();

// Add a wrapper function for query with retry logic
const executeQuery = async (text: string, params: any[], maxRetries = 3): Promise<any> => {
  let retries = 0;
  let lastError: any = null;

  while (retries < maxRetries) {
    let client: PoolClient | null = null;
    try {
      // Get a client from the pool
      client = await pool.connect();
      const result = await client.query(text, params);
      return result;
    } catch (error: any) {
      lastError = error;
      retries++;

      console.error(`Database query error (attempt ${retries}/${maxRetries}):`, error.message);

      // Check if we should retry
      if (retries < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const backoffTime = 1000 * Math.pow(2, retries - 1);
        console.log(`Retrying database connection in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    } finally {
      // Release the client back to the pool
      if (client) {
        client.release();
      }
    }
  }

  // If we get here, all retries failed
  console.error(`All ${maxRetries} database query attempts failed.`);
  throw lastError;
};

// Add the executeQuery method to the pool
pool.executeQuery = executeQuery;

// Add a type declaration for the extended pool
declare module 'pg' {
  interface Pool {
    executeQuery(text: string, params: any[], maxRetries?: number): Promise<any>;
  }
}

export default pool;
