import crypto from "crypto";
import authPool from "./config";

export interface ApiKeyDoc {
  id: string;
  key: string;
  isActive: boolean;
  expiresAt?: Date;
  permissions: string[];
  usageLimit?: number;
  currentUsage: number;
  ipRestrictions: string[];
  lastUsed?: Date;
  createdAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  apiKeyDoc?: ApiKeyDoc;
  reason?: string;
}

export class AuthDatabaseUtils {
  static async validateApiKey(
    apiKey: string,
    action: string = "wallet-check:read",
    ip?: string
  ): Promise<ValidationResult> {
    try {
      const hashedKey = crypto
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

      const result = await authPool.executeQuery(query, [hashedKey]);

      if (result.rowCount === 0) {
        return { valid: false, reason: "Invalid API key" };
      }

      const apiKeyDoc = result.rows[0] as ApiKeyDoc;

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
      if (
        apiKeyDoc.usageLimit &&
        apiKeyDoc.currentUsage >= apiKeyDoc.usageLimit
      ) {
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

      await authPool.executeQuery(updateQuery, [apiKeyDoc.id]);

      apiKeyDoc.currentUsage += 1;
      apiKeyDoc.lastUsed = new Date();

      return { valid: true, apiKeyDoc };
    } catch (error) {
      console.error("API key validation error:", error);
      throw error;
    }
  }

  static async getApiKeyByHash(hashedKey: string): Promise<ApiKeyDoc | null> {
    try {
      const query = `
        SELECT 
          id, key, "isActive", "expiresAt", permissions, 
          "usageLimit", "currentUsage", "ipRestrictions", 
          "lastUsed", "createdAt"
        FROM api_keys 
        WHERE key = $1
      `;

      const result = await authPool.executeQuery(query, [hashedKey]);

      if (result.rowCount === 0) {
        return null;
      }

      return result.rows[0] as ApiKeyDoc;
    } catch (error) {
      console.error("Error fetching API key:", error);
      throw error;
    }
  }

  static async updateApiKeyUsage(apiKeyId: string): Promise<ApiKeyDoc> {
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

      const result = await authPool.executeQuery(updateQuery, [apiKeyId]);

      if (result.rowCount === 0) {
        throw new Error("API key not found for usage update");
      }

      return result.rows[0] as ApiKeyDoc;
    } catch (error) {
      console.error("Error updating API key usage:", error);
      throw error;
    }
  }

  static async hasPermission(
    apiKeyId: string,
    action: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT permissions 
        FROM api_keys 
        WHERE id = $1 AND "isActive" = true
      `;

      const result = await authPool.executeQuery(query, [apiKeyId]);

      if (result.rowCount === 0) {
        return false;
      }

      const permissions = result.rows[0].permissions || [];
      return permissions.includes(action);
    } catch (error) {
      console.error("Error checking API key permission:", error);
      throw error;
    }
  }
}
