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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseUtils = void 0;
var fs = require("fs");
var path = require("path");
var config_1 = require("./config");
var DatabaseUtils = /** @class */ (function () {
    function DatabaseUtils() {
        this.pool = config_1.default;
    }
    DatabaseUtils.prototype.initializeDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var schemaPath, schema, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        schemaPath = path.join(__dirname, 'schema.sql');
                        schema = fs.readFileSync(schemaPath, 'utf8');
                        return [4 /*yield*/, this.pool.query(schema)];
                    case 1:
                        _a.sent();
                        console.log('Database schema initialized successfully');
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error initializing database schema:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseUtils.prototype.insertDustTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                query = "\n            INSERT INTO dust_transactions (\n                signature, timestamp, slot, success, sender, recipient,\n                amount, fee, token_type, token_address, is_potential_dust,\n                is_potential_poisoning, risk_score\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\n            ON CONFLICT (signature) DO UPDATE SET\n                risk_score = EXCLUDED.risk_score,\n                is_potential_dust = EXCLUDED.is_potential_dust,\n                is_potential_poisoning = EXCLUDED.is_potential_poisoning\n            RETURNING *;\n        ";
                return [2 /*return*/, this.pool.query(query, [
                        transaction.signature,
                        transaction.timestamp,
                        transaction.slot,
                        transaction.success,
                        transaction.sender,
                        transaction.recipient,
                        transaction.amount,
                        transaction.fee,
                        transaction.tokenType,
                        transaction.tokenAddress,
                        transaction.isPotentialDust,
                        transaction.isPotentialPoisoning,
                        transaction.riskScore
                    ])];
            });
        });
    };
    DatabaseUtils.prototype.updateRiskAnalysis = function (analysis) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                query = "\n            INSERT INTO risk_analysis (\n                address, risk_score, chain_analysis_data, trm_labs_data,\n                temporal_pattern, network_pattern, last_updated\n            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)\n            ON CONFLICT (address) DO UPDATE SET\n                risk_score = EXCLUDED.risk_score,\n                chain_analysis_data = EXCLUDED.chain_analysis_data,\n                trm_labs_data = EXCLUDED.trm_labs_data,\n                temporal_pattern = EXCLUDED.temporal_pattern,\n                network_pattern = EXCLUDED.network_pattern,\n                last_updated = CURRENT_TIMESTAMP\n            RETURNING *;\n        ";
                return [2 /*return*/, this.pool.query(query, [
                        analysis.address,
                        analysis.riskScore,
                        analysis.chainAnalysisData,
                        analysis.trmLabsData,
                        analysis.temporalPattern,
                        analysis.networkPattern
                    ])];
            });
        });
    };
    DatabaseUtils.prototype.getHighRiskAddresses = function () {
        return __awaiter(this, arguments, void 0, function (minRiskScore) {
            if (minRiskScore === void 0) { minRiskScore = 0.7; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.query('SELECT * FROM risk_analysis WHERE risk_score >= $1 ORDER BY risk_score DESC', [minRiskScore])];
            });
        });
    };
    DatabaseUtils.prototype.getAddressTransactions = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.pool.query('SELECT * FROM dust_transactions WHERE sender = $1 OR recipient = $1 ORDER BY timestamp DESC', [address])];
            });
        });
    };
    DatabaseUtils.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.end()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return DatabaseUtils;
}());
exports.DatabaseUtils = DatabaseUtils;
exports.default = new DatabaseUtils();
