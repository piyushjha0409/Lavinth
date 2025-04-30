//TODO: to make overview api for dashboard responses
// TODO:
import cors from "cors";
import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import db from "./db/db-utils";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Get all dust transactions with optional filtering
 * Query parameters:
 * - limit: number of records to return (default: 10)
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
app.get("/api/dust-transactions", async (req: Request, res: Response) => {
  try {
    const {
      limit = 10,
      offset = 0,
      sender,
      recipient,
      minRiskScore,
      isPotentialDust,
      isPotentialPoisoning,
      startDate,
      endDate,
      sortBy = "timestamp",
      sortOrder = "desc",
    } = req.query;

    // Build the main query with filters
    let queryBase = "SELECT * FROM dust_transactions WHERE 1=1";
    let countQueryBase =
      "SELECT COUNT(*) as total FROM dust_transactions WHERE 1=1";
    const params: any[] = [];
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
      params.push(new Date(startDate as string));
    }

    if (endDate) {
      const filterClause = ` AND timestamp <= $${paramIndex++}`;
      queryBase += filterClause;
      countQueryBase += filterClause;
      params.push(new Date(endDate as string));
    }

    // Add sorting and pagination to the main query
    const validSortFields = [
      "timestamp",
      "amount",
      "risk_score",
      "slot",
      "fee",
    ];
    const sortField = validSortFields.includes(sortBy as string)
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
    const result = await db.pool.query(queryBase, queryParams);

    // Execute count query to get total records (for pagination metadata)
    const countResult = await db.pool.query(countQueryBase, params);
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
  } catch (error) {
    console.error("Error fetching dust transactions:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dust transactions",
      error: (error as Error).message,
    });
  }
});

/**
 * Get all potential dust transactions
 * Query parameters:
 * - limit: number of records to return (default: 10)
 * - offset: pagination offset (default: 0)
 * - sortBy: field to sort by (default: timestamp)
 * - sortOrder: asc or desc (default: desc)
 */
app.get(
  "/api/dust-transactions/potential-dust",
  async (req: Request, res: Response) => {
    try {
      const {
        limit = 10,
        offset = 0,
        sortBy = "timestamp",
        sortOrder = "desc",
      } = req.query;

      // Build the query for potential dust transactions
      let queryBase =
        "SELECT * FROM dust_transactions WHERE is_potential_dust = true";
      const countQueryBase =
        "SELECT COUNT(*) as total FROM dust_transactions WHERE is_potential_dust = true";

      // Add sorting and pagination
      const validSortFields = [
        "timestamp",
        "amount",
        "risk_score",
        "slot",
        "fee",
      ];
      const sortField = validSortFields.includes(sortBy as string)
        ? sortBy
        : "timestamp";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      queryBase += ` ORDER BY ${sortField} ${order}`;
      queryBase += " LIMIT $1 OFFSET $2";

      const limitValue = Number(limit);
      const offsetValue = Number(offset);
      const params = [limitValue, offsetValue];

      // Execute the query
      const result = await db.pool.query(queryBase, params);

      // Execute count query to get total records (for pagination metadata)
      const countResult = await db.pool.query(countQueryBase);
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
    } catch (error) {
      console.error("Error fetching potential dust transactions:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch potential dust transactions",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Get all potential poisoning transactions
 * Query parameters:
 * - limit: number of records to return (default: 10)
 * - offset: pagination offset (default: 0)
 * - sortBy: field to sort by (default: timestamp)
 * - sortOrder: asc or desc (default: desc)
 */
app.get(
  "/api/dust-transactions/potential-poisoning",
  async (req: Request, res: Response) => {
    try {
      const {
        limit = 10,
        offset = 0,
        sortBy = "timestamp",
        sortOrder = "desc",
      } = req.query;

      // Build the query for potential poisoning transactions
      let queryBase =
        "SELECT * FROM dust_transactions WHERE is_potential_poisoning = true";
      const countQueryBase =
        "SELECT COUNT(*) as total FROM dust_transactions WHERE is_potential_poisoning = true";

      // Add sorting and pagination
      const validSortFields = [
        "timestamp",
        "amount",
        "risk_score",
        "slot",
        "fee",
      ];
      const sortField = validSortFields.includes(sortBy as string)
        ? sortBy
        : "timestamp";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      queryBase += ` ORDER BY ${sortField} ${order}`;
      queryBase += " LIMIT $1 OFFSET $2";

      const limitValue = Number(limit);
      const offsetValue = Number(offset);
      const params = [limitValue, offsetValue];

      // Execute the query
      const result = await db.pool.query(queryBase, params);

      // Execute count query to get total records (for pagination metadata)
      const countResult = await db.pool.query(countQueryBase);
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
    } catch (error) {
      console.error("Error fetching potential poisoning transactions:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch potential poisoning transactions",
        error: (error as Error).message,
      });
    }
  }
);

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
app.get("/api/overview", async (req: Request, res: Response) => {
  try {
    // Query for total transactions count
    const totalTransactionsQuery =
      "SELECT COUNT(*) as total FROM dust_transactions";
    const totalTransactionsResult = await db.pool.query(totalTransactionsQuery);
    const totalTransactions = parseInt(totalTransactionsResult.rows[0].total);

    // Query for successful transactions count
    const successfulTransactionsQuery =
      "SELECT COUNT(*) as successful FROM dust_transactions WHERE success = true";
    const successfulTransactionsResult = await db.pool.query(
      successfulTransactionsQuery
    );
    const successfulTransactions = parseInt(
      successfulTransactionsResult.rows[0].successful
    );

    // Calculate failed transactions
    const failedTransactions = totalTransactions - successfulTransactions;

    // Query for dusted transactions count
    const dustedTransactionsQuery =
      "SELECT COUNT(*) as dusted FROM dust_transactions WHERE is_potential_dust = true";
    const dustedTransactionsResult = await db.pool.query(
      dustedTransactionsQuery
    );
    const dustedTransactions = parseInt(
      dustedTransactionsResult.rows[0].dusted
    );

    // Query for poisoned transactions count
    const poisonedTransactionsQuery =
      "SELECT COUNT(*) as poisoned FROM dust_transactions WHERE is_potential_poisoning = true";
    const poisonedTransactionsResult = await db.pool.query(
      poisonedTransactionsQuery
    );
    const poisonedTransactions = parseInt(
      poisonedTransactionsResult.rows[0].poisoned
    );

    // Query for total volume in SOL
    const volumeQuery =
      "SELECT SUM(amount) as total_volume FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
    const volumeResult = await db.pool.query(volumeQuery);
    const volume = parseFloat(volumeResult.rows[0].total_volume || 0);

    // // Query for suspicious wallet count (wallets with risk score >= 0.7)
    // const suspiciousWalletsQuery =
    //   "SELECT COUNT(DISTINCT address) as suspicious FROM risk_analysis WHERE risk_score >= 0.7";
    // const suspiciousWalletsResult = await db.pool.query(suspiciousWalletsQuery);
    // const suspiciousWallets = parseInt(
    //   suspiciousWalletsResult.rows[0].suspicious || 0
    // );

    // Query for dusting sources count (addresses that are potential dusting sources)
    const dustingSourcesQuery =
      "SELECT COUNT(*) as sources FROM dusting_candidates WHERE risk_score >= 0.5";
    const dustingSourcesResult = await db.pool.query(dustingSourcesQuery);
    const dustingSources = parseInt(dustingSourcesResult.rows[0].sources || 0);

    // Return all statistics
    res.status(200).json({
      status: "success",
      data: {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        dustedTransactions,
        poisonedTransactions,
        volume,
        dustingSources,
      },
    });
  } catch (error) {
    console.error("Error fetching overview statistics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch overview statistics",
      error: (error as Error).message,
    });
  }
});

/**
 * Check if a wallet address is flagged as a dusting candidate
 * Returns:
 * - status: success or error
 * - isDusted: boolean indicating if the address is flagged as a dusting candidate
 * - riskScore: risk score of the address if it exists in the dusting_candidates table
 * - message: description of the result
 */
app.get("/api/check-wallet/:address", async (req: Request, res: Response): Promise<any> => {
  try {
    const { address } = req.params;

    // Validate the address format (basic validation for Solana address)
    if (!address || address.length !== 44) {
      return res.status(400).json({
        status: "error",
        message: "Invalid wallet address format",
      });
    }

    // Query to check if the address exists in the dusting_candidates table
    const query = "SELECT address, risk_score FROM dusting_candidates WHERE address = $1";
    const result = await db.pool.query(query, [address]);
   
    if (result.rowCount && result.rowCount > 0) {
      // Address exists in the dusting_candidates table
      const riskScore = parseFloat(result.rows[0].risk_score);
      
      return res.status(200).json({
        status: "success",
        isDusted: true,
        riskScore,
        message: `This wallet address is flagged as a potential dusting source with a risk score of ${riskScore.toFixed(4)}.`,
      });
    } else {
      // Address does not exist in the dusting_candidates table
      return res.status(200).json({
        status: "success",
        isDusted: false,
        riskScore: 0,
        message: "This wallet address is not flagged as a dusting source and appears to be safe.",
      });
    }
  } catch (error) {
    console.error("Error checking wallet address:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check wallet address",
      error: (error as Error).message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Solana Dust Detector API running on port ${PORT}`);
});

// Export the Express app
export default app;
