import { Pool, QueryResult } from "pg";
declare class AuthCustomPool extends Pool {
    constructor();
    executeQuery(text: string, params?: any[], maxRetries?: number): Promise<QueryResult>;
}
declare const authPool: AuthCustomPool;
export default authPool;
