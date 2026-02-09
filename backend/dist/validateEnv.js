"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
/**
 * Validates that all required environment variables are set.
 * Call at startup before the server begins listening.
 */
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'HELIUS_API_KEYS', 'API_KEY'];
function validateEnv(env = process.env) {
    const missing = REQUIRED_ENV_VARS.filter((key) => { var _a; return !((_a = env[key]) === null || _a === void 0 ? void 0 : _a.trim()); });
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
