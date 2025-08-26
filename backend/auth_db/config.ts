import { Pool, PoolClient, QueryResult } from "pg";
import dotenv from "dotenv";

dotenv.config();

class AuthCustomPool extends Pool {
  constructor() {
    super({
      connectionString: process.env.DATABASE_URL_AUTH,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
    });

    this.on("connect", () => {
      console.log("Connected to Neon PostgreSQL");
    });

    this.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }

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
        console.error(
          `Query error (attempt ${retries}/${maxRetries}):`,
          error.message
        );

        if (retries < maxRetries) {
          const delay = 1000 * 2 ** (retries - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((res) => setTimeout(res, delay));
        }
      } finally {
        if (client) client.release();
      }
    }

    console.error(`All ${maxRetries} database query attempts failed.`);
    throw lastError;
  }
}

const authPool = new AuthCustomPool();

export default authPool;
