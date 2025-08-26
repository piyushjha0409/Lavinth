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
exports.AuthDatabaseUtils = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("./config"));
class AuthDatabaseUtils {
    static validateApiKey(apiKey_1) {
        return __awaiter(this, arguments, void 0, function* (apiKey, action = "wallet-check:read", ip) {
            try {
                const hashedKey = crypto_1.default
                    .createHash("sha256")
                    .update(apiKey)
                    .digest("hex");
                const query = `
        SELECT 
          id, key, "isActive", "expiresAt", permissions, 
          "usageLimit", "currentUsage", "ipRestrictions", 
          "lastUsed", "createdAt"
        FROM api_keys 
        WHERE key = $1
      `;
                const result = yield config_1.default.executeQuery(query, [hashedKey]);
                if (result.rowCount === 0) {
                    return { valid: false, reason: "Invalid API key" };
                }
                const apiKeyDoc = result.rows[0];
                if (!apiKeyDoc.isActive) {
                    return { valid: false, apiKeyDoc, reason: "API key is inactive" };
                }
                if (apiKeyDoc.expiresAt && new Date(apiKeyDoc.expiresAt) < new Date()) {
                    return { valid: false, apiKeyDoc, reason: "API key has expired" };
                }
                const permissions = apiKeyDoc.permissions || [];
                if (!permissions.includes(action)) {
                    return { valid: false, apiKeyDoc, reason: "Insufficient permissions" };
                }
                if (apiKeyDoc.usageLimit &&
                    apiKeyDoc.currentUsage >= apiKeyDoc.usageLimit) {
                    return { valid: false, apiKeyDoc, reason: "Usage limit exceeded" };
                }
                if (ip && apiKeyDoc.ipRestrictions.length > 0) {
                    if (!apiKeyDoc.ipRestrictions.includes(ip)) {
                        return { valid: false, apiKeyDoc, reason: "IP not allowed" };
                    }
                }
                const updateQuery = `
        UPDATE api_keys 
        SET 
          "lastUsed" = NOW(),
          "currentUsage" = "currentUsage" + 1
        WHERE id = $1
      `;
                yield config_1.default.executeQuery(updateQuery, [apiKeyDoc.id]);
                apiKeyDoc.currentUsage += 1;
                apiKeyDoc.lastUsed = new Date();
                return { valid: true, apiKeyDoc };
            }
            catch (error) {
                console.error("API key validation error:", error);
                throw error;
            }
        });
    }
    static getApiKeyByHash(hashedKey) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `
        SELECT 
          id, key, "isActive", "expiresAt", permissions, 
          "usageLimit", "currentUsage", "ipRestrictions", 
          "lastUsed", "createdAt"
        FROM api_keys 
        WHERE key = $1
      `;
                const result = yield config_1.default.executeQuery(query, [hashedKey]);
                if (result.rowCount === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error("Error fetching API key:", error);
                throw error;
            }
        });
    }
    static updateApiKeyUsage(apiKeyId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updateQuery = `
        UPDATE api_keys 
        SET 
          "lastUsed" = NOW(),
          "currentUsage" = "currentUsage" + 1
        WHERE id = $1
        RETURNING 
          id, key, "isActive", "expiresAt", permissions, 
          "usageLimit", "currentUsage", "ipRestrictions", 
          "lastUsed", "createdAt"
      `;
                const result = yield config_1.default.executeQuery(updateQuery, [apiKeyId]);
                if (result.rowCount === 0) {
                    throw new Error("API key not found for usage update");
                }
                return result.rows[0];
            }
            catch (error) {
                console.error("Error updating API key usage:", error);
                throw error;
            }
        });
    }
    static hasPermission(apiKeyId, action) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `
        SELECT permissions 
        FROM api_keys 
        WHERE id = $1 AND "isActive" = true
      `;
                const result = yield config_1.default.executeQuery(query, [apiKeyId]);
                if (result.rowCount === 0) {
                    return false;
                }
                const permissions = result.rows[0].permissions || [];
                return permissions.includes(action);
            }
            catch (error) {
                console.error("Error checking API key permission:", error);
                throw error;
            }
        });
    }
}
exports.AuthDatabaseUtils = AuthDatabaseUtils;
