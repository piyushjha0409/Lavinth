"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class AuthCustomPool extends pg_1.Pool {
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
const authPool = new AuthCustomPool();
exports.default = authPool;
