import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface ApiKeyCreateOptions {
  name: string;
  userId: string;
  expiresAt?: Date;
  permissions?: string[];
  usageLimit?: number;
  ipRestrictions?: string[];
  description?: string;
}

export class ApiKeyService {
  static async generateApiKey(options: ApiKeyCreateOptions) {
    const {
      name,
      userId,
      expiresAt,
      permissions,
      usageLimit,
      ipRestrictions,
      description,
    } = options;

    const randomBytes = crypto.randomBytes(32);
    const apiKey = `lav_live_${randomBytes
      .toString("base64")
      .replace(/[+/=]/g, "")}`;
    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

    const apiKeyDoc = await prisma.apiKey.create({
      data: {
        name,
        key: hashedKey,
        userId,
        expiresAt,
        permissions: permissions || ["wallet-check:read"],
        usageLimit,
        ipRestrictions: ipRestrictions || [],
        description,
      },
    });

    return {
      apiKey,
      apiKeyDoc: {
        ...apiKeyDoc,
        key:
          apiKeyDoc.key.substring(0, 8) +
          "..." +
          apiKeyDoc.key.substring(apiKeyDoc.key.length - 4),
      },
    };
  }

  static async validateApiKey(
    apiKey: string,
    action: string = "wallet-check:read",
    ip?: string
  ) {
    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

    const apiKeyDoc = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
    });

    if (!apiKeyDoc) {
      return { valid: false, reason: "Invalid API key" };
    }

    if (!apiKeyDoc.isActive) {
      return { valid: false, apiKeyDoc, reason: "API key is inactive" };
    }

    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      return { valid: false, apiKeyDoc, reason: "API key has expired" };
    }

    if (!apiKeyDoc.permissions.includes(action)) {
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

    await prisma.apiKey.update({
      where: { id: apiKeyDoc.id },
      data: {
        lastUsed: new Date(),
        currentUsage: apiKeyDoc.currentUsage + 1,
      },
    });

    return { valid: true, apiKeyDoc };
  }

  static async listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getApiKey(id: string, userId: string) {
    return prisma.apiKey.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  static async revokeApiKey(id: string, userId: string) {
    const result = await prisma.apiKey.updateMany({
      where: {
        id,
        userId,
      },
      data: { isActive: false },
    });

    return result.count > 0;
  }
}
