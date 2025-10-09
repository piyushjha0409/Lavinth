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
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const db_utils_1 = __importDefault(require("./db/db-utils"));
const validateToken_1 = require("./middlewares/validateToken");
const validateApiKey_1 = require("./middlewares/validateApiKey");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: "https://www.lavinth.com",
    methods: ["GET"],
    allowedHeaders: ["Content-Type", "x-access-token", "x-api-key"],
}));
app.use(express_1.default.json());
app.get("/api/dust-transactions", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `dust-tx-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dust transactions request`);
    console.log(`[${requestId}] Query parameters:`, req.query);
    try {
        const { limit = 10, offset = 0, sender, recipient, minRiskScore, isPotentialDust, isPotentialPoisoning, startDate, endDate, sortBy = "timestamp", sortOrder = "desc", } = req.query;
        console.log(`[${requestId}] Parsed parameters:`, {
            limit,
            offset,
            sender,
            recipient,
            minRiskScore,
            isPotentialDust,
            isPotentialPoisoning,
            startDate,
            endDate,
            sortBy,
            sortOrder,
        });
        // Build the main query with filters
        let queryBase = "SELECT * FROM dust_transactions WHERE 1=1";
        let countQueryBase = "SELECT COUNT(*) as total FROM dust_transactions WHERE 1=1";
        const params = [];
        let paramIndex = 1;
        // Add filters if provided
        if (sender) {
            const filterClause = ` AND sender = $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(sender);
        }
        if (recipient) {
            const filterClause = ` AND recipient = $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(recipient);
        }
        if (minRiskScore !== undefined) {
            const filterClause = ` AND risk_score >= $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(minRiskScore);
        }
        if (isPotentialDust !== undefined) {
            const filterClause = ` AND is_potential_dust = $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(isPotentialDust === "true");
        }
        if (isPotentialPoisoning !== undefined) {
            const filterClause = ` AND is_potential_poisoning = $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(isPotentialPoisoning === "true");
        }
        if (startDate) {
            const filterClause = ` AND timestamp >= $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(new Date(startDate));
        }
        if (endDate) {
            const filterClause = ` AND timestamp <= $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(new Date(endDate));
        }
        // Add sorting and pagination to the main query
        const validSortFields = [
            "timestamp",
            "amount",
            "risk_score",
            "slot",
            "fee",
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "timestamp";
        const order = sortOrder === "asc" ? "ASC" : "DESC";
        queryBase += ` ORDER BY ${sortField} ${order}`;
        queryBase += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        const limitValue = Number(limit);
        const offsetValue = Number(offset);
        const paginationParams = [limitValue, offsetValue];
        const queryParams = [...params, ...paginationParams];
        // Execute the main query
        const result = yield db_utils_1.default.pool.executeQuery(queryBase, queryParams);
        // Execute count query to get total records (for pagination metadata)
        const countResult = yield db_utils_1.default.pool.executeQuery(countQueryBase, params);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limitValue);
        const currentPage = Math.floor(offsetValue / limitValue) + 1;
        // Return the results with pagination metadata
        res.status(200).json({
            status: "success",
            count: result.rowCount,
            pagination: {
                total: totalCount,
                totalPages,
                currentPage,
                limit: limitValue,
                offset: offsetValue,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            },
            data: result.rows,
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching dust transactions:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch dust transactions",
            error: error.message,
        });
    }
}));
app.get("/api/dust-transactions/potential-dust", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `pot-dust-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting potential dust transactions request`);
    console.log(`[${requestId}] Query parameters:`, req.query);
    try {
        const { limit = 10, offset = 0, sortBy = "timestamp", sortOrder = "desc", } = req.query;
        console.log(`[${requestId}] Parsed parameters:`, {
            limit,
            offset,
            sortBy,
            sortOrder,
        });
        // Build the query for potential dust transactions
        let queryBase = "SELECT * FROM dust_transactions WHERE is_potential_dust = true";
        const countQueryBase = "SELECT COUNT(*) as total FROM dust_transactions WHERE is_potential_dust = true";
        // Add sorting and pagination
        const validSortFields = [
            "timestamp",
            "amount",
            "risk_score",
            "slot",
            "fee",
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "timestamp";
        const order = sortOrder === "asc" ? "ASC" : "DESC";
        queryBase += ` ORDER BY ${sortField} ${order}`;
        queryBase += " LIMIT $1 OFFSET $2";
        const limitValue = Number(limit);
        const offsetValue = Number(offset);
        const params = [limitValue, offsetValue];
        // Execute the query
        const result = yield db_utils_1.default.pool.executeQuery(queryBase, params);
        // Execute count query to get total records (for pagination metadata)
        const countResult = yield db_utils_1.default.pool.executeQuery(countQueryBase);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limitValue);
        const currentPage = Math.floor(offsetValue / limitValue) + 1;
        // Return the results with pagination metadata
        res.status(200).json({
            status: "success",
            count: result.rowCount,
            pagination: {
                total: totalCount,
                totalPages,
                currentPage,
                limit: limitValue,
                offset: offsetValue,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            },
            data: result.rows,
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching potential dust transactions:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch potential dust transactions",
            error: error.message,
        });
    }
}));
app.get("/api/dust-transactions/potential-poisoning", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `pot-poison-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting potential poisoning transactions request`);
    console.log(`[${requestId}] Query parameters:`, req.query);
    try {
        const { limit = 10, offset = 0, sortBy = "timestamp", sortOrder = "desc", } = req.query;
        console.log(`[${requestId}] Parsed parameters:`, {
            limit,
            offset,
            sortBy,
            sortOrder,
        });
        // Build the query for potential poisoning transactions
        let queryBase = "SELECT * FROM dust_transactions WHERE is_potential_poisoning = true";
        const countQueryBase = "SELECT COUNT(*) as total FROM dust_transactions WHERE is_potential_poisoning = true";
        // Add sorting and pagination
        const validSortFields = [
            "timestamp",
            "amount",
            "risk_score",
            "slot",
            "fee",
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "timestamp";
        const order = sortOrder === "asc" ? "ASC" : "DESC";
        queryBase += ` ORDER BY ${sortField} ${order}`;
        queryBase += " LIMIT $1 OFFSET $2";
        const limitValue = Number(limit);
        const offsetValue = Number(offset);
        const params = [limitValue, offsetValue];
        // Execute the query
        const result = yield db_utils_1.default.pool.executeQuery(queryBase, params);
        // Execute count query to get total records (for pagination metadata)
        const countResult = yield db_utils_1.default.pool.executeQuery(countQueryBase);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limitValue);
        const currentPage = Math.floor(offsetValue / limitValue) + 1;
        // Return the results with pagination metadata
        res.status(200).json({
            status: "success",
            count: result.rowCount,
            pagination: {
                total: totalCount,
                totalPages,
                currentPage,
                limit: limitValue,
                offset: offsetValue,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            },
            data: result.rows,
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching potential poisoning transactions:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch potential poisoning transactions",
            error: error.message,
        });
    }
}));
app.get("/api/overview", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `overview-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting overview statistics request`);
    try {
        // Use the new getOverviewStatistics method to fetch all statistics at once
        console.log(`[${requestId}] Fetching overview statistics...`);
        const statistics = yield db_utils_1.default.getOverviewStatistics();
        console.log(`[${requestId}] Overview statistics retrieved:`, statistics);
        // Return all statistics
        console.log(`[${requestId}] Sending successful response`);
        res.status(200).json({
            status: "success",
            data: statistics,
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching overview statistics:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch overview statistics",
            error: error.message,
        });
    }
}));
app.get("/api/check-wallet/:address", validateApiKey_1.validateApiKey, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `wallet-check-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting wallet check request`);
    try {
        const { address } = req.params;
        console.log(`[${requestId}] Checking wallet address:`, address);
        // Validate the address format (basic validation for Solana address)
        if (!address) {
            console.log(`[${requestId}] Invalid address format - empty address`);
            return res.status(400).json({
                status: "error",
                message: "Invalid wallet address format",
            });
        }
        // Check both dusting_candidates and dusting_attackers tables
        const candidateQuery = "SELECT address, risk_score FROM dusting_candidates WHERE address = $1";
        const attackerQuery = "SELECT * FROM dusting_attackers WHERE address = $1";
        console.log(`[${requestId}] Executing parallel queries for candidates and attackers...`);
        const [candidateResult, attackerResult] = yield Promise.all([
            db_utils_1.default.pool.executeQuery(candidateQuery, [address]),
            db_utils_1.default.pool.executeQuery(attackerQuery, [address]),
        ]);
        console.log(`[${requestId}] Candidate query result: ${candidateResult.rowCount} rows`);
        console.log(`[${requestId}] Attacker query result: ${attackerResult.rowCount} rows`);
        // Check if address exists in dusting_attackers (more detailed information)
        if (attackerResult.rowCount && attackerResult.rowCount > 0) {
            console.log(`[${requestId}] Found in dusting_attackers table`);
            const attacker = attackerResult.rows[0];
            const riskScore = parseFloat(attacker.risk_score);
            console.log(`[${requestId}] Attacker risk score:`, riskScore);
            return res.status(200).json({
                status: "success",
                isDusted: true,
                riskScore,
                attackerDetails: {
                    smallTransfersCount: attacker.small_transfers_count,
                    uniqueVictimsCount: attacker.unique_victims_count,
                    temporalPattern: attacker.temporal_pattern,
                    networkPattern: attacker.network_pattern,
                    behavioralIndicators: attacker.behavioral_indicators,
                    lastUpdated: attacker.last_updated,
                },
                message: `This wallet address is flagged as a confirmed dusting attacker with a risk score of ${riskScore.toFixed(4)}.`,
            });
        }
        // Check if address exists in dusting_candidates (basic information)
        if (candidateResult.rowCount && candidateResult.rowCount > 0) {
            console.log(`[${requestId}] Found in dusting_candidates table`);
            const riskScore = parseFloat(candidateResult.rows[0].risk_score);
            console.log(`[${requestId}] Candidate risk score:`, riskScore);
            return res.status(200).json({
                status: "success",
                isDusted: true,
                riskScore,
                message: `This wallet address is flagged as a potential dusting source with a risk score of ${riskScore.toFixed(4)}.`,
            });
        }
        else {
            // Address does not exist in the dusting_candidates table
            console.log(`[${requestId}] Address not found in any dusting tables - clean wallet`);
            return res.status(200).json({
                status: "success",
                isDusted: false,
                riskScore: 0,
                message: "This wallet address is not flagged as a dusting source and appears to be safe.",
            });
        }
    }
    catch (error) {
        console.error(`[${requestId}] Error checking wallet address:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to check wallet address",
            error: error.message,
        });
    }
}));
app.get("/api/dusting-attackers", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `dust-attackers-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting attackers request`);
    console.log(`[${requestId}] Query parameters:`, req.query);
    try {
        const { limit = 10, offset = 0, minRiskScore, sortBy = "risk_score", sortOrder = "desc", } = req.query;
        console.log(`[${requestId}] Parsed parameters:`, {
            limit,
            offset,
            minRiskScore,
            sortBy,
            sortOrder,
        });
        // Build the main query with filters
        let queryBase = "SELECT * FROM dusting_attackers WHERE 1=1";
        let countQueryBase = "SELECT COUNT(*) as total FROM dusting_attackers WHERE 1=1";
        const params = [];
        let paramIndex = 1;
        // Add filters if provided
        if (minRiskScore !== undefined) {
            const filterClause = ` AND risk_score >= $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(minRiskScore);
        }
        // Add sorting and pagination to the main query
        const validSortFields = [
            "risk_score",
            "small_transfers_count",
            "unique_victims_count",
            "last_updated",
            "wallet_age_days",
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "risk_score";
        const order = sortOrder === "asc" ? "ASC" : "DESC";
        queryBase += ` ORDER BY ${sortField} ${order}`;
        queryBase += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        const limitValue = Number(limit);
        const offsetValue = Number(offset);
        const paginationParams = [limitValue, offsetValue];
        const queryParams = [...params, ...paginationParams];
        // Execute the main query
        const result = yield db_utils_1.default.pool.executeQuery(queryBase, queryParams);
        // Execute count query to get total records (for pagination metadata)
        const countResult = yield db_utils_1.default.pool.executeQuery(countQueryBase, params);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limitValue);
        const currentPage = Math.floor(offsetValue / limitValue) + 1;
        // Return the results with pagination metadata
        res.status(200).json({
            status: "success",
            count: result.rowCount,
            pagination: {
                total: totalCount,
                totalPages,
                currentPage,
                limit: limitValue,
                offset: offsetValue,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            },
            data: result.rows,
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching dusting attackers:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch dusting attackers",
            error: error.message,
        });
    }
}));
app.get("/api/dusting-victims", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `dust-victims-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting victims request`);
    console.log(`[${requestId}] Query parameters:`, req.query);
    try {
        const { limit = 10, offset = 0, minRiskScore, sortBy = "risk_score", sortOrder = "desc", } = req.query;
        console.log(`[${requestId}] Parsed parameters:`, {
            limit,
            offset,
            minRiskScore,
            sortBy,
            sortOrder,
        });
        // Build the main query with filters
        let queryBase = "SELECT * FROM dusting_victims WHERE 1=1";
        let countQueryBase = "SELECT COUNT(*) as total FROM dusting_victims WHERE 1=1";
        const params = [];
        let paramIndex = 1;
        // Add filters if provided
        if (minRiskScore !== undefined) {
            const filterClause = ` AND risk_score >= $${paramIndex++}`;
            queryBase += filterClause;
            countQueryBase += filterClause;
            params.push(minRiskScore);
        }
        // Add sorting and pagination to the main query
        const validSortFields = [
            "risk_score",
            "dust_transactions_count",
            "unique_attackers_count",
            "last_updated",
            "wallet_age_days",
        ];
        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : "risk_score";
        const order = sortOrder === "asc" ? "ASC" : "DESC";
        queryBase += ` ORDER BY ${sortField} ${order}`;
        queryBase += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        const limitValue = Number(limit);
        const offsetValue = Number(offset);
        const paginationParams = [limitValue, offsetValue];
        const queryParams = [...params, ...paginationParams];
        console.log(`[${requestId}] Final query:`, queryBase);
        console.log(`[${requestId}] Query parameters:`, queryParams);
        // Execute the main query
        console.log(`[${requestId}] Executing main query...`);
        const result = yield db_utils_1.default.pool.executeQuery(queryBase, queryParams);
        console.log(`[${requestId}] Main query result: ${result.rowCount} rows`);
        // Execute count query to get total records (for pagination metadata)
        console.log(`[${requestId}] Executing count query...`);
        const countResult = yield db_utils_1.default.pool.executeQuery(countQueryBase, params);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limitValue);
        const currentPage = Math.floor(offsetValue / limitValue) + 1;
        console.log(`[${requestId}] Pagination metadata:`, {
            totalCount,
            totalPages,
            currentPage,
            limitValue,
            offsetValue,
        });
        // Return the results with pagination metadata
        console.log(`[${requestId}] Sending successful response`);
        res.status(200).json({
            status: "success",
            count: result.rowCount,
            pagination: {
                total: totalCount,
                totalPages,
                currentPage,
                limit: limitValue,
                offset: offsetValue,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            },
            data: result.rows,
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching dusting victims:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch dusting victims",
            error: error.message,
        });
    }
}));
/**
 * Get detailed information about a specific dusting attacker
 */
app.get("/api/dusting-attackers/:address", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `attacker-detail-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting attacker detail request`);
    try {
        const { address } = req.params;
        console.log(`[${requestId}] Fetching details for attacker address:`, address);
        // Validate the address format (basic validation for Solana address)
        if (!address || address.length !== 44) {
            console.log(`[${requestId}] Invalid address format - length: ${address === null || address === void 0 ? void 0 : address.length}`);
            return res.status(400).json({
                status: "error",
                message: "Invalid wallet address format",
            });
        }
        const query = "SELECT * FROM dusting_attackers WHERE address = $1";
        console.log(`[${requestId}] Executing query:`, query);
        const result = yield db_utils_1.default.pool.executeQuery(query, [address]);
        console.log(`[${requestId}] Query result: ${result.rowCount} rows`);
        if (result.rowCount === 0) {
            console.log(`[${requestId}] Dusting attacker not found`);
            return res.status(404).json({
                status: "error",
                message: "Dusting attacker not found",
            });
        }
        console.log(`[${requestId}] Sending successful response with attacker details`);
        res.status(200).json({
            status: "success",
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching dusting attacker details:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch dusting attacker details",
            error: error.message,
        });
    }
}));
/**
 * Get detailed information about a specific dusting victim
 */
app.get("/api/dusting-victims/:address", validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `victim-detail-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting victim detail request`);
    try {
        const { address } = req.params;
        console.log(`[${requestId}] Fetching details for victim address:`, address);
        // Validate the address format (basic validation for Solana address)
        if (!address || address.length !== 44) {
            console.log(`[${requestId}] Invalid address format - length: ${address === null || address === void 0 ? void 0 : address.length}`);
            return res.status(400).json({
                status: "error",
                message: "Invalid wallet address format",
            });
        }
        const query = "SELECT * FROM dusting_victims WHERE address = $1";
        console.log(`[${requestId}] Executing query:`, query);
        const result = yield db_utils_1.default.pool.executeQuery(query, [address]);
        console.log(`[${requestId}] Query result: ${result.rowCount} rows`);
        if (result.rowCount === 0) {
            console.log(`[${requestId}] Dusting victim not found`);
            return res.status(404).json({
                status: "error",
                message: "Dusting victim not found",
            });
        }
        console.log(`[${requestId}] Sending successful response with victim details`);
        res.status(200).json({
            status: "success",
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching dusting victim details:`, error);
        console.error(`[${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch dusting victim details",
            error: error.message,
        });
    }
}));
/**
 * Real-time threat metrics endpoint
 */
app.get('/api/threat-metrics', validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `threat-metrics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Starting threat metrics request`);
    try {
        const metrics = yield db_utils_1.default.pool.executeQuery(`
      SELECT 
        COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as dust_24h,
        COUNT(CASE WHEN is_potential_poisoning = true THEN 1 END) as poisoning_24h,
        COUNT(DISTINCT sender) as active_attackers_24h,
        COUNT(DISTINCT recipient) as active_victims_24h,
        AVG(risk_score) as avg_risk_score,
        MAX(timestamp) as last_activity
      FROM dust_transactions 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `);
        console.log(`[${requestId}] Threat metrics retrieved successfully`);
        res.json(metrics.rows[0]);
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching threat metrics:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
/**
 * Attack patterns timeline endpoint
 */
app.get('/api/attack-patterns', validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `attack-patterns-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Starting attack patterns request`);
    try {
        const { hours = 24 } = req.query;
        const patterns = yield db_utils_1.default.pool.executeQuery(`
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as attack_count,
        COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as dust_count,
        COUNT(CASE WHEN is_potential_poisoning = true THEN 1 END) as poisoning_count,
        COUNT(DISTINCT sender) as unique_attackers,
        AVG(amount) as avg_amount
      FROM dust_transactions 
      WHERE timestamp > NOW() - INTERVAL '${parseInt(hours)} hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
    `);
        console.log(`[${requestId}] Attack patterns retrieved: ${patterns.rows.length} hours`);
        res.json(patterns.rows);
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching attack patterns:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
/**
 * Network graph data endpoint
 */
app.get('/api/network-graph', validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `network-graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Starting network graph request`);
    try {
        const { limit = 500, minWeight = 2 } = req.query;
        const networkData = yield db_utils_1.default.pool.executeQuery(`
      SELECT 
        sender as source,
        recipient as target,
        COUNT(*) as weight,
        AVG(amount) as avg_amount,
        MAX(timestamp) as last_interaction,
        COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as dust_txs,
        COUNT(CASE WHEN is_potential_poisoning = true THEN 1 END) as poisoning_txs
      FROM dust_transactions 
      WHERE sender IS NOT NULL 
        AND recipient IS NOT NULL
        AND timestamp > NOW() - INTERVAL '7 days'
      GROUP BY sender, recipient
      HAVING COUNT(*) >= $1
      ORDER BY weight DESC
      LIMIT $2
    `, [minWeight, limit]);
        console.log(`[${requestId}] Network graph data retrieved: ${networkData.rows.length} edges`);
        res.json(networkData.rows);
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching network graph:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
/**
 * Top threats summary endpoint
 */
app.get('/api/top-threats', validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `top-threats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Starting top threats request`);
    try {
        const topAttackers = yield db_utils_1.default.pool.executeQuery(`
      SELECT address, small_transfers_count, unique_victims_count, risk_score, wallet_age_days, total_transaction_volume
      FROM dusting_attackers 
      ORDER BY small_transfers_count DESC 
      LIMIT 10
    `);
        const topVictims = yield db_utils_1.default.pool.executeQuery(`
      SELECT address, dust_transactions_count, unique_attackers_count, risk_score, wallet_age_days, wallet_value_estimate
      FROM dusting_victims 
      ORDER BY dust_transactions_count DESC 
      LIMIT 10
    `);
        console.log(`[${requestId}] Top threats retrieved: ${topAttackers.rows.length} attackers, ${topVictims.rows.length} victims`);
        res.json({
            topAttackers: topAttackers.rows,
            topVictims: topVictims.rows
        });
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching top threats:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
/**
 * Dusting candidates endpoint
 */
app.get('/api/dusting-candidates', validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `candidates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting candidates request`);
    try {
        const { minRiskScore = 0.3, limit = 100 } = req.query;
        const candidates = yield db_utils_1.default.pool.executeQuery(`
      SELECT address, risk_score, first_detected_at, last_updated
      FROM dusting_candidates 
      WHERE risk_score >= $1
      ORDER BY risk_score DESC, last_updated DESC
      LIMIT $2
    `, [minRiskScore, limit]);
        console.log(`[${requestId}] Dusting candidates retrieved: ${candidates.rows.length} candidates`);
        res.json(candidates.rows);
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching dusting candidates:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
/**
 * System status endpoint for dynamic status indicators
 */
app.get('/api/system-status', validateToken_1.validateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `system-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Starting system status request`);
    try {
        // Get real-time system metrics
        const [dbStatus, recentActivity, systemHealth] = yield Promise.all([
            // Check database connectivity
            db_utils_1.default.pool.executeQuery('SELECT 1 as status'),
            // Check recent activity (last 5 minutes)
            db_utils_1.default.pool.executeQuery(`
        SELECT COUNT(*) as recent_count 
        FROM dust_transactions 
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
      `),
            // Get system health metrics
            db_utils_1.default.pool.executeQuery(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT sender) as unique_addresses,
          AVG(risk_score) as avg_risk_score
        FROM dust_transactions 
        WHERE timestamp > NOW() - INTERVAL '24 hours'
      `)
        ]);
        const isDbConnected = dbStatus.rows.length > 0;
        const hasRecentActivity = parseInt(recentActivity.rows[0].recent_count) > 0;
        const healthMetrics = systemHealth.rows[0];
        // Calculate improvement metrics based on actual data
        const totalTransactions = parseInt(healthMetrics.total_transactions);
        const uniqueAddresses = parseInt(healthMetrics.unique_addresses);
        const coverageRatio = uniqueAddresses > 0 ? Math.round(totalTransactions / uniqueAddresses) : 1;
        const systemStatus = {
            enhancedDetection: {
                status: isDbConnected ? 'enabled' : 'disabled',
                label: isDbConnected ? 'Enabled' : 'Disabled'
            },
            walletIntelligence: {
                status: uniqueAddresses > 100 ? 'active' : 'limited',
                label: uniqueAddresses > 100 ? 'Active' : 'Limited'
            },
            realTimeUpdates: {
                status: hasRecentActivity ? 'live' : 'idle',
                label: hasRecentActivity ? 'Live' : 'Idle'
            },
            coverageImprovement: {
                ratio: Math.min(coverageRatio, 10), // Cap at 10x for display
                label: `${Math.min(coverageRatio, 10)}x Better`
            },
            lastUpdated: new Date().toISOString()
        };
        console.log(`[${requestId}] System status retrieved successfully`);
        res.json(systemStatus);
    }
    catch (error) {
        console.error(`[${requestId}] Error fetching system status:`, error);
        res.status(500).json({
            error: 'Internal server error',
            systemStatus: {
                enhancedDetection: { status: 'error', label: 'Error' },
                walletIntelligence: { status: 'error', label: 'Error' },
                realTimeUpdates: { status: 'error', label: 'Error' },
                coverageImprovement: { ratio: 1, label: 'Unknown' },
                lastUpdated: new Date().toISOString()
            }
        });
    }
}));
// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Solana Dust Detector API running on port ${PORT}`);
    console.log(`📊 Debug logging enabled for all endpoints`);
    console.log(`🔍 Request IDs will be generated for tracking`);
    console.log(`🆕 New endpoints added: /api/threat-metrics, /api/attack-patterns, /api/network-graph, /api/top-threats, /api/dusting-candidates, /api/system-status`);
});
// Export the Express app
exports.default = app;
