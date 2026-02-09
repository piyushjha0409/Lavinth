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
const logger_1 = __importDefault(require("../logger"));
dotenv_1.default.config();
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield config_1.default.connect();
        logger_1.default.info("Connected to database, starting initialization...");
        try {
            yield client.query('BEGIN');
            logger_1.default.info("Dropping existing tables if they exist...");
            // Get all tables and drop them
            const tablesRes = yield client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
            for (const row of tablesRes.rows) {
                yield client.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE`);
            }
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
            logger_1.default.info("Executing schema...");
            yield client.query(schemaSql);
            yield client.query('COMMIT');
            logger_1.default.info("Database schema created successfully!");
            const tablesResult = yield client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
            logger_1.default.info("Tables created:");
            tablesResult.rows.forEach((row, index) => {
                logger_1.default.info({ index: index + 1, table: row.table_name }, 'Table created');
            });
        }
        catch (error) {
            yield client.query('ROLLBACK');
            logger_1.default.error({ err: error }, 'Error initializing database');
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
        logger_1.default.info("Database initialization complete.");
        process.exit(0);
    })
        .catch((error) => {
        logger_1.default.error({ err: error }, 'Initialization failed');
        process.exit(1);
    });
}
