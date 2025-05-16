import { Pool } from 'pg';
declare const pool: Pool;
declare module 'pg' {
    interface Pool {
        executeQuery(text: string, params: any[], maxRetries?: number): Promise<any>;
    }
}
export default pool;
