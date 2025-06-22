import { Pool, QueryResult } from 'pg';
export declare class CustomPool extends Pool {
    constructor();
    executeQuery(text: string, params?: any[], maxRetries?: number): Promise<QueryResult>;
}
declare const pool: CustomPool;
export default pool;
