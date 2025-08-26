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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
const utils_1 = require("../auth_db/utils");
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
                const validationResult = yield utils_1.AuthDatabaseUtils.validateApiKey(apiKey, permission, clientIp);
                console.log("Validation Result:", validationResult);
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
            console.error("Authentication validation error:", error);
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
