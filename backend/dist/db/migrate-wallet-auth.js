"use strict";
/**
 * Wallet Auth Migration
 * Creates users and user_api_keys tables in the main database.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
const walletAuthSchema = `
-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Table: user_api_keys
CREATE TABLE IF NOT EXISTS user_api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  permissions TEXT[] DEFAULT ARRAY['wallet-check:read'],
  usage_limit INTEGER,
  current_usage INTEGER DEFAULT 0,
  ip_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  description TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_wallet ON user_api_keys(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_key ON user_api_keys(key);
`;
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        try {
            logger_1.default.info("Running wallet auth migration: users & user_api_keys...");
            yield pool.query(walletAuthSchema);
            logger_1.default.info("Wallet auth tables created successfully");
            // Verify
            const tables = yield pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'user_api_keys')
    `);
            logger_1.default.info({ tables: tables.rows.map(r => r.table_name) }, 'Verified tables');
            logger_1.default.info("Wallet auth migration completed successfully!");
        }
        catch (error) {
            logger_1.default.error({ err: error }, 'Wallet auth migration failed');
            throw error;
        }
        finally {
            yield pool.end();
        }
    });
}
migrate().catch((err) => {
    logger_1.default.error({ err }, 'Migration error');
    process.exit(1);
});
