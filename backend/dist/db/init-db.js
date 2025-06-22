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
dotenv_1.default.config();
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield config_1.default.connect();
        console.log("Connected to database, starting initialization...");
        try {
            yield client.query('BEGIN');
            console.log("Dropping existing tables if they exist...");
            yield client.query(`
      DROP TABLE IF EXISTS dust_transactions CASCADE;
      DROP TABLE IF EXISTS dusting_attackers CASCADE;
      DROP TABLE IF EXISTS dusting_candidates CASCADE;
      DROP TABLE IF EXISTS dusting_victims CASCADE;
      DROP TABLE IF EXISTS risk_analysis CASCADE;
    `);
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
            console.log("Executing schema...");
            yield client.query(schemaSql);
            yield client.query('COMMIT');
            console.log("✅ Database schema created successfully!");
            const tablesResult = yield client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
            console.log("Tables created:");
            tablesResult.rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ${row.table_name}`);
            });
        }
        catch (error) {
            yield client.query('ROLLBACK');
            console.error("❌ Error initializing database:", error);
            throw error;
        }
        finally {
            client.release();
            if (require.main === module) {
                yield config_1.default.end();
            }
        }
    });
}
if (require.main === module) {
    initializeDatabase()
        .then(() => {
        console.log("🎉 Database initialization complete.");
        process.exit(0);
    })
        .catch((error) => {
        console.error("Initialization failed:", error);
        process.exit(1);
    });
}
