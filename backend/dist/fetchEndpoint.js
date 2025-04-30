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
//TODO: to make overview api for dashboard responses 
// TODO: 
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_utils_1 = __importDefault(require("./db/db-utils"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
/**
 * Get all dust transactions with optional filtering
 * Request parameters:
 * - limit: number of records to return
 * Query parameters:
 * - offset: pagination offset (default: 0)
 * - sender: filter by sender address
 * - recipient: filter by recipient address
 * - minRiskScore: minimum risk score (0-1)
 * - isPotentialDust: filter by potential dust status (true/false)
 * - isPotentialPoisoning: filter by potential poisoning status (true/false)
 * - startDate: filter by transactions after this date (ISO format)
 * - endDate: filter by transactions before this date (ISO format)
 * - sortBy: field to sort by (default: timestamp)
 * - sortOrder: asc or desc (default: desc)
 */
app.get('/api/dust-transactions/:limit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.params.limit;
        const { offset = 0, sender, recipient, minRiskScore, isPotentialDust, isPotentialPoisoning, startDate, endDate, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
        // Build the query with filters
        let query = 'SELECT * FROM dust_transactions WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        // Add filters if provided
        if (sender) {
            query += ` AND sender = $${paramIndex++}`;
            params.push(sender);
        }
        if (recipient) {
            query += ` AND recipient = $${paramIndex++}`;
            params.push(recipient);
        }
        if (minRiskScore !== undefined) {
            query += ` AND risk_score >= $${paramIndex++}`;
            params.push(minRiskScore);
        }
        if (isPotentialDust !== undefined) {
            query += ` AND is_potential_dust = $${paramIndex++}`;
            params.push(isPotentialDust === 'true');
        }
        if (isPotentialPoisoning !== undefined) {
            query += ` AND is_potential_poisoning = $${paramIndex++}`;
            params.push(isPotentialPoisoning === 'true');
        }
        if (startDate) {
            query += ` AND timestamp >= $${paramIndex++}`;
            params.push(new Date(startDate));
        }
        if (endDate) {
            query += ` AND timestamp <= $${paramIndex++}`;
            params.push(new Date(endDate));
        }
        // Add sorting and pagination
        const validSortFields = ['timestamp', 'amount', 'risk_score', 'slot', 'fee'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${order}`;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(Number(limit), Number(offset));
        // Execute the query
        const result = yield db_utils_1.default.pool.query(query, params);
        // Return the results
        res.status(200).json({
            status: 'success',
            count: result.rowCount,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching dust transactions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dust transactions',
            error: error.message
        });
    }
}));
/**
 * Get all potential dust transactions
 * Request parameters:
 * - limit: number of records to return
 * Query parameters:
 * - offset: pagination offset (default: 0)
 * - sortBy: field to sort by (default: timestamp)
 * - sortOrder: asc or desc (default: desc)
 */
app.get('/api/dust-transactions/potential-dust/:limit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.params.limit;
        const { offset = 0, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
        // Build the query for potential dust transactions
        let query = 'SELECT * FROM dust_transactions WHERE is_potential_dust = true';
        const params = [];
        // Add sorting and pagination
        const validSortFields = ['timestamp', 'amount', 'risk_score', 'slot', 'fee'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${order}`;
        query += ' LIMIT $1 OFFSET $2';
        params.push(Number(limit), Number(offset));
        // Execute the query
        const result = yield db_utils_1.default.pool.query(query, params);
        // Return the results
        res.status(200).json({
            status: 'success',
            count: result.rowCount,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching potential dust transactions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch potential dust transactions',
            error: error.message
        });
    }
}));
/**
 * Get all potential poisoning transactions
 * Request parameters:
 * - limit: number of records to return
 * Query parameters:
 * - offset: pagination offset (default: 0)
 * - sortBy: field to sort by (default: timestamp)
 * - sortOrder: asc or desc (default: desc)
 */
app.get('/api/dust-transactions/potential-poisoning/:limit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.params.limit;
        const { offset = 0, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
        // Build the query for potential poisoning transactions
        let query = 'SELECT * FROM dust_transactions WHERE is_potential_poisoning = true';
        const params = [];
        // Add sorting and pagination
        const validSortFields = ['timestamp', 'amount', 'risk_score', 'slot', 'fee'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${order}`;
        query += ' LIMIT $1 OFFSET $2';
        params.push(Number(limit), Number(offset));
        // Execute the query
        const result = yield db_utils_1.default.pool.query(query, params);
        // Return the results
        res.status(200).json({
            status: 'success',
            count: result.rowCount,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching potential poisoning transactions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch potential poisoning transactions',
            error: error.message
        });
    }
}));
/**
 * Get overview statistics for dashboard
 * Returns:
 * 1. Total transactions count
 * 2. Successful transactions count
 * 3. Failed transactions count
 * 4. Dusted transactions count
 * 5. Poisoned transactions count
 * 6. Volume (in SOL)
 * 7. Suspicious wallet count
 * 8. Dusting sources count
 */
app.get('/api/overview', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Query for total transactions count
        const totalTransactionsQuery = 'SELECT COUNT(*) as total FROM dust_transactions';
        const totalTransactionsResult = yield db_utils_1.default.pool.query(totalTransactionsQuery);
        const totalTransactions = parseInt(totalTransactionsResult.rows[0].total);
        // Query for successful transactions count
        const successfulTransactionsQuery = 'SELECT COUNT(*) as successful FROM dust_transactions WHERE success = true';
        const successfulTransactionsResult = yield db_utils_1.default.pool.query(successfulTransactionsQuery);
        const successfulTransactions = parseInt(successfulTransactionsResult.rows[0].successful);
        // Calculate failed transactions
        const failedTransactions = totalTransactions - successfulTransactions;
        // Query for dusted transactions count
        const dustedTransactionsQuery = 'SELECT COUNT(*) as dusted FROM dust_transactions WHERE is_potential_dust = true';
        const dustedTransactionsResult = yield db_utils_1.default.pool.query(dustedTransactionsQuery);
        const dustedTransactions = parseInt(dustedTransactionsResult.rows[0].dusted);
        // Query for poisoned transactions count
        const poisonedTransactionsQuery = 'SELECT COUNT(*) as poisoned FROM dust_transactions WHERE is_potential_poisoning = true';
        const poisonedTransactionsResult = yield db_utils_1.default.pool.query(poisonedTransactionsQuery);
        const poisonedTransactions = parseInt(poisonedTransactionsResult.rows[0].poisoned);
        // Query for total volume in SOL
        const volumeQuery = "SELECT SUM(amount) as total_volume FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
        const volumeResult = yield db_utils_1.default.pool.query(volumeQuery);
        const volume = parseFloat(volumeResult.rows[0].total_volume || 0);
        // Query for suspicious wallet count (wallets with risk score >= 0.7)
        const suspiciousWalletsQuery = 'SELECT COUNT(DISTINCT address) as suspicious FROM risk_analysis WHERE risk_score >= 0.7';
        const suspiciousWalletsResult = yield db_utils_1.default.pool.query(suspiciousWalletsQuery);
        const suspiciousWallets = parseInt(suspiciousWalletsResult.rows[0].suspicious || 0);
        // Query for dusting sources count (addresses that are potential dusting sources)
        const dustingSourcesQuery = 'SELECT COUNT(*) as sources FROM dusting_candidates WHERE risk_score >= 0.5';
        const dustingSourcesResult = yield db_utils_1.default.pool.query(dustingSourcesQuery);
        const dustingSources = parseInt(dustingSourcesResult.rows[0].sources || 0);
        // Return all statistics
        res.status(200).json({
            status: 'success',
            data: {
                totalTransactions,
                successfulTransactions,
                failedTransactions,
                dustedTransactions,
                poisonedTransactions,
                volume,
                suspiciousWallets,
                dustingSources
            }
        });
    }
    catch (error) {
        console.error('Error fetching overview statistics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch overview statistics',
            error: error.message
        });
    }
}));
// Start the server
app.listen(PORT, () => {
    console.log(`Solana Dust Detector API running on port ${PORT}`);
});
// Export the Express app
exports.default = app;
