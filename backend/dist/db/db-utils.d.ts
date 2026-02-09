import { CustomPool } from "./config";
export declare class DatabaseUtils {
    pool: CustomPool;
    constructor();
    initializeDatabase(): Promise<void>;
    close(): Promise<void>;
}
declare const _default: DatabaseUtils;
export default _default;
