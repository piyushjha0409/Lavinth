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
export declare class AuthDatabaseUtils {
    static validateApiKey(apiKey: string, action?: string, ip?: string): Promise<ValidationResult>;
    static getApiKeyByHash(hashedKey: string): Promise<ApiKeyDoc | null>;
    static updateApiKeyUsage(apiKeyId: string): Promise<ApiKeyDoc>;
    static hasPermission(apiKeyId: string, action: string): Promise<boolean>;
}
