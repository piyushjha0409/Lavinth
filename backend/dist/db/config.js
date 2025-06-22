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
exports.CustomPool = void 0;
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
dotenv.config();
// Create a custom pool class with built-in retry logic
class CustomPool extends pg_1.Pool {
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
            console.log('Connected to Neon PostgreSQL');
        });
        // Log idle client errors
        this.on('error', (err) => {
            console.error('Unexpected error on idle PostgreSQL client:', err);
        });
    }
    // Add retry-enabled query execution function
    executeQuery(text_1) {
        return __awaiter(this, arguments, void 0, function* (text, params = [], maxRetries = 3) {
            let retries = 0;
            let lastError = null;
            while (retries < maxRetries) {
                let client = null;
                try {
                    client = yield this.connect();
                    const result = yield client.query(text, params);
                    return result;
                }
                catch (error) {
                    lastError = error;
                    retries++;
                    console.error(`Query error (attempt ${retries}/${maxRetries}):`, error.message);
                    if (retries < maxRetries) {
                        const delay = 1000 * Math.pow(2, (retries - 1));
                        console.log(`Retrying in ${delay}ms...`);
                        yield new Promise((res) => setTimeout(res, delay));
                    }
                }
                finally {
                    if (client)
                        client.release();
                }
            }
            console.error(`All ${maxRetries} database query attempts failed.`);
            throw lastError;
        });
    }
}
exports.CustomPool = CustomPool;
// Create and export a single instance of the custom pool
const pool = new CustomPool();
exports.default = pool;
