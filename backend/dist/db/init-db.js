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
exports.initializeDatabase = initializeDatabase;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield config_1.default.connect();
        console.log("Connected to database, starting initialization...");
        try {
            // Start a transaction
            yield client.query('BEGIN');
            // Drop existing schema and tables if they exist
            console.log("Dropping existing schema and tables...");
            yield client.query(`
      -- First drop all materialized views to avoid dependency issues
      DROP MATERIALIZED VIEW IF EXISTS dust_attack_daily_summary CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS attacker_pattern_summary CASCADE;
      DROP MATERIALIZED VIEW IF EXISTS victim_exposure_summary CASCADE;
      
      -- Drop regular views
      DROP VIEW IF EXISTS high_risk_addresses CASCADE;
      
      -- Drop functions
      DROP FUNCTION IF EXISTS refresh_dust_analysis_views() CASCADE;
      
      -- Drop all tables
      DROP TABLE IF EXISTS dust_transactions CASCADE;
      DROP TABLE IF EXISTS risk_analysis CASCADE;
      DROP TABLE IF EXISTS dusting_attackers CASCADE;
      DROP TABLE IF EXISTS dusting_victims CASCADE;
      DROP TABLE IF EXISTS dusting_candidates CASCADE;
      
      -- Drop the schema itself
      DROP SCHEMA IF EXISTS dust_detector CASCADE;
    `);
            // Read schema SQL from file
            console.log("Reading schema file...");
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
            // Execute schema SQL
            console.log("Creating new database schema...");
            yield client.query(schemaSql);
            // Commit the transaction
            yield client.query('COMMIT');
            console.log("Database initialized successfully!");
            console.log("Tables created:");
            // List created tables for verification
            const tablesResult = yield client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
            tablesResult.rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.table_name}`);
            });
            console.log("\nMaterialized views created:");
            const viewsResult = yield client.query(`
      SELECT matviewname 
      FROM pg_matviews 
      ORDER BY matviewname;
    `);
            viewsResult.rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.matviewname}`);
            });
        }
        catch (error) {
            // Rollback in case of error
            yield client.query('ROLLBACK');
            console.error("Error initializing database:", error);
            throw error;
        }
        finally {
            client.release();
            // Only close the pool if we're running this as a standalone script
            // Don't close if this is imported and used elsewhere
            if (require.main === module) {
                yield config_1.default.end();
            }
        }
    });
}
// Execute the initialization function only if this file is run directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
        console.log("Database initialization completed successfully");
        process.exit(0);
    })
        .catch((error) => {
        console.error("Database initialization failed:", error);
        process.exit(1);
    });
}
