"use strict";
/**
 * Database Migration Script
 * Runs schema.sql against the Neon PostgreSQL database
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const logger_1 = __importDefault(require("../logger"));
dotenv.config();
function runMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info("Starting database migration...");
        const pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        });
        try {
            // Test connection
            const client = yield pool.connect();
            logger_1.default.info("Connected to Neon PostgreSQL");
            // Read schema file
            const schemaPath = path.join(__dirname, "schema.sql");
            const schema = fs.readFileSync(schemaPath, "utf-8");
            // Execute the entire schema as one transaction
            logger_1.default.info("Executing schema...");
            yield client.query(schema);
            logger_1.default.info("Schema executed successfully!");
            // Verify tables were created
            const tablesResult = yield client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
            logger_1.default.info({ count: tablesResult.rows.length }, 'Tables created');
            tablesResult.rows.forEach((row) => {
                logger_1.default.info({ table: row.table_name }, 'Table created');
            });
            // Check seed data
            const exchangeCount = yield client.query(`SELECT COUNT(*) FROM known_exchanges`);
            const bridgeCount = yield client.query(`SELECT COUNT(*) FROM known_bridges`);
            logger_1.default.info('Seed data:');
            logger_1.default.info({ count: exchangeCount.rows[0].count }, 'Known exchanges');
            logger_1.default.info({ count: bridgeCount.rows[0].count }, 'Known bridges');
            client.release();
            logger_1.default.info("Migration complete!");
        }
        catch (error) {
            logger_1.default.error({ err: error, position: error.position }, 'Migration failed');
            process.exit(1);
        }
        finally {
            yield pool.end();
        }
    });
}
runMigration();
