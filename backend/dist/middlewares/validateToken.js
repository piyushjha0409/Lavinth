"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = validateToken;
const VALID_TOKEN = process.env.API_KEY;
function validateToken(req, res, next) {
    const token = req.headers["x-access-token"];
    if (!token) {
        res.status(401).json({
            status: "error",
            message: "No token provided",
        });
        return;
    }
    if (token !== VALID_TOKEN) {
        res.status(401).json({
            status: "error",
            message: "Invalid token",
        });
        return;
    }
    next();
}
