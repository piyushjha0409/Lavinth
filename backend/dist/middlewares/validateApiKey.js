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
exports.validateApiKey = validateApiKey;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../db/config"));
const logger_1 = __importDefault(require("../logger"));
function validateApiKeyFromDb(apiKey_1) {
    return __awaiter(this, arguments, void 0, function* (apiKey, action = "wallet-check:read", ip) {
        const hashedKey = crypto_1.default.createHash("sha256").update(apiKey).digest("hex");
        const result = yield config_1.default.executeQuery(`SELECT id, key, is_active, expires_at, permissions,
            usage_limit, current_usage, ip_restrictions,
            last_used, created_at
     FROM user_api_keys
     WHERE key = $1`, [hashedKey]);
        if (result.rowCount === 0) {
            return { valid: false, reason: "Invalid API key" };
        }
        const apiKeyDoc = result.rows[0];
        if (!apiKeyDoc.is_active) {
            return { valid: false, apiKeyDoc, reason: "API key is inactive" };
        }
        if (apiKeyDoc.expires_at && new Date(apiKeyDoc.expires_at) < new Date()) {
            return { valid: false, apiKeyDoc, reason: "API key has expired" };
        }
        const permissions = apiKeyDoc.permissions || [];
        if (!permissions.includes(action)) {
            return { valid: false, apiKeyDoc, reason: "Insufficient permissions" };
        }
        if (ip && apiKeyDoc.ip_restrictions && apiKeyDoc.ip_restrictions.length > 0) {
            if (!apiKeyDoc.ip_restrictions.includes(ip)) {
                return { valid: false, apiKeyDoc, reason: "IP not allowed" };
            }
        }
        // Atomic check-and-increment: only bumps usage if still under the limit
        const updateResult = yield config_1.default.executeQuery(`UPDATE user_api_keys
     SET last_used = NOW(), current_usage = current_usage + 1
     WHERE id = $1
       AND (usage_limit IS NULL OR current_usage < usage_limit)
     RETURNING current_usage`, [apiKeyDoc.id]);
        if (updateResult.rowCount === 0) {
            return { valid: false, apiKeyDoc, reason: "Usage limit exceeded" };
        }
        apiKeyDoc.current_usage = updateResult.rows[0].current_usage;
        apiKeyDoc.last_used = new Date();
        return { valid: true, apiKeyDoc };
    });
}
function validateApiKey(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const apiKey = req.headers["x-api-key"];
            const token = req.headers["x-access-token"];
            if (!apiKey && !token) {
                res.status(401).json({
                    status: "error",
                    message: "No API key or token provided",
                });
                return;
            }
            if (token) {
                const validToken = process.env.API_KEY;
                if (token === validToken) {
                    req.authMethod = "token";
                    next();
                    return;
                }
                else {
                    res.status(401).json({
                        status: "error",
                        message: "Invalid token",
                    });
                    return;
                }
            }
            if (apiKey) {
                const clientIp = req.ip || req.socket.remoteAddress;
                const permission = "wallet-check:read";
                const validationResult = yield validateApiKeyFromDb(apiKey, permission, clientIp);
                logger_1.default.info({ validationResult }, 'Validation Result');
                if (!validationResult.valid) {
                    const statusCode = getStatusCodeForReason(validationResult.reason);
                    res.status(statusCode).json({
                        status: "error",
                        message: validationResult.reason || "API key validation failed",
                    });
                    return;
                }
                req.apiKeyDoc = validationResult.apiKeyDoc;
                req.authMethod = "api_key";
                next();
                return;
            }
        }
        catch (error) {
            logger_1.default.error({ err: error }, 'Authentication validation error');
            res.status(500).json({
                status: "error",
                message: "Authentication validation failed",
                error: error.message,
            });
        }
    });
}
function getStatusCodeForReason(reason) {
    if (!reason)
        return 500;
    switch (reason) {
        case "Invalid API key":
            return 401;
        case "API key is inactive":
        case "API key has expired":
        case "Insufficient permissions":
        case "IP not allowed":
            return 403;
        case "Usage limit exceeded":
            return 429;
        default:
            return 500;
    }
}
