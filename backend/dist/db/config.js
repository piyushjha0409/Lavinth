"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
dotenv.config();
// Create a robust connection pool with retry logic
const createPool = () => {
    const pool = new pg_1.Pool({
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
const executeQuery = (text_1, params_1, ...args_1) => __awaiter(void 0, [text_1, params_1, ...args_1], void 0, function* (text, params, maxRetries = 3) {
    let retries = 0;
    let lastError = null;
    while (retries < maxRetries) {
        let client = null;
        try {
            // Get a client from the pool
            client = yield pool.connect();
            const result = yield client.query(text, params);
            return result;
        }
        catch (error) {
            lastError = error;
            retries++;
            console.error(`Database query error (attempt ${retries}/${maxRetries}):`, error.message);
            // Check if we should retry
            if (retries < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s, etc.
                const backoffTime = 1000 * Math.pow(2, retries - 1);
                console.log(`Retrying database connection in ${backoffTime}ms...`);
                yield new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
        finally {
            // Release the client back to the pool
            if (client) {
                client.release();
            }
        }
    }
    // If we get here, all retries failed
    console.error(`All ${maxRetries} database query attempts failed.`);
    throw lastError;
});
// Add the executeQuery method to the pool
pool.executeQuery = executeQuery;
exports.default = pool;
