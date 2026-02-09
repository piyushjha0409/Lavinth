import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import pool from "../db/config";
import logger from '../logger';

interface ApiKeyDoc {
  id: string;
  key: string;
  is_active: boolean;
  expires_at?: Date;
  permissions: string[];
  usage_limit?: number;
  current_usage: number;
  ip_restrictions: string[];
  last_used?: Date;
  created_at: Date;
}

interface ValidationResult {
  valid: boolean;
  apiKeyDoc?: ApiKeyDoc;
  reason?: string;
}

async function validateApiKeyFromDb(
  apiKey: string,
  action: string = "wallet-check:read",
  ip?: string
): Promise<ValidationResult> {
  const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

  const result = await pool.executeQuery(
    `SELECT id, key, is_active, expires_at, permissions,
            usage_limit, current_usage, ip_restrictions,
            last_used, created_at
     FROM user_api_keys
     WHERE key = $1`,
    [hashedKey]
  );

  if (result.rowCount === 0) {
    return { valid: false, reason: "Invalid API key" };
  }

  const apiKeyDoc = result.rows[0] as ApiKeyDoc;

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
  const updateResult = await pool.executeQuery(
    `UPDATE user_api_keys
     SET last_used = NOW(), current_usage = current_usage + 1
     WHERE id = $1
       AND (usage_limit IS NULL OR current_usage < usage_limit)
     RETURNING current_usage`,
    [apiKeyDoc.id]
  );

  if (updateResult.rowCount === 0) {
    return { valid: false, apiKeyDoc, reason: "Usage limit exceeded" };
  }

  apiKeyDoc.current_usage = updateResult.rows[0].current_usage;
  apiKeyDoc.last_used = new Date();

  return { valid: true, apiKeyDoc };
}

export async function validateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiKey = req.headers["x-api-key"] as string;
    const token = req.headers["x-access-token"] as string;

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
        (req as any).authMethod = "token";
        next();
        return;
      } else {
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

      const validationResult = await validateApiKeyFromDb(
        apiKey,
        permission,
        clientIp
      );
      logger.info({ validationResult }, 'Validation Result');

      if (!validationResult.valid) {
        const statusCode = getStatusCodeForReason(validationResult.reason);
        res.status(statusCode).json({
          status: "error",
          message: validationResult.reason || "API key validation failed",
        });
        return;
      }

      (req as any).apiKeyDoc = validationResult.apiKeyDoc;
      (req as any).authMethod = "api_key";

      next();
      return;
    }
  } catch (error) {
    logger.error({ err: error }, 'Authentication validation error');
    res.status(500).json({
      status: "error",
      message: "Authentication validation failed",
      error: (error as Error).message,
    });
  }
}

function getStatusCodeForReason(reason?: string): number {
  if (!reason) return 500;

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
