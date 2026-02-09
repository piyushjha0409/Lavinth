"use strict";
/**
 * Global process error handlers.
 * Import this module early to ensure unhandled errors are caught.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./logger"));
process.on('unhandledRejection', (reason) => {
    logger_1.default.error({ err: reason }, 'Unhandled Promise Rejection');
});
process.on('uncaughtException', (error) => {
    logger_1.default.fatal({ err: error }, 'Uncaught Exception');
    process.exit(1);
});
