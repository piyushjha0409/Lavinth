import { Request, Response, NextFunction } from "express";
import { AuthDatabaseUtils } from "../auth_db/utils";

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
      
      const validationResult = await AuthDatabaseUtils.validateApiKey(
        apiKey,
        permission,
        clientIp
      );
      console.log("Validation Result:", validationResult);

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
    console.error("Authentication validation error:", error);
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
