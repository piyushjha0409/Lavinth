
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
    const result = await db.pool.executeQuery(queryBase, queryParams);

    // Execute count query to get total records (for pagination metadata)
    const countResult = await db.pool.executeQuery(countQueryBase, params);
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
      const result = await db.pool.executeQuery(queryBase, params);

      // Execute count query to get total records (for pagination metadata)
      const countResult = await db.pool.executeQuery(countQueryBase);
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
      const result = await db.pool.executeQuery(queryBase, params);

      // Execute count query to get total records (for pagination metadata)
      const countResult = await db.pool.executeQuery(countQueryBase);
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
    // Use the new getOverviewStatistics method to fetch all statistics at once
    const statistics = await db.getOverviewStatistics();
    
    // Return all statistics
    res.status(200).json({
      status: "success",
      data: statistics,
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
 * Check if a wallet address is flagged as a dusting candidate or attacker
 * Returns:
 * - status: success or error
 * - isDusted: boolean indicating if the address is flagged as a dusting candidate or attacker
 * - riskScore: risk score of the address
 * - attackerDetails: detailed information if found in dusting_attackers table
 * - message: description of the result
 */
app.get("/api/check-wallet/:address", async (req: Request, res: Response): Promise<any> => {
  try {
    const { address } = req.params;

    // Validate the address format (basic validation for Solana address)
    if (!address) {
      return res.status(400).json({
        status: "error",
        message: "Invalid wallet address format",
      });
    }

    // Check both dusting_candidates and dusting_attackers tables
    const candidateQuery = "SELECT address, risk_score FROM dusting_candidates WHERE address = $1";
    const attackerQuery = "SELECT * FROM dusting_attackers WHERE address = $1";
    
    const [candidateResult, attackerResult] = await Promise.all([
      db.pool.executeQuery(candidateQuery, [address]),
      db.pool.executeQuery(attackerQuery, [address])
    ]);
    
    // Check if address exists in dusting_attackers (more detailed information)
    if (attackerResult.rowCount && attackerResult.rowCount > 0) {
      const attacker = attackerResult.rows[0];
      const riskScore = parseFloat(attacker.risk_score);
      
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
          lastUpdated: attacker.last_updated
        },
        message: `This wallet address is flagged as a confirmed dusting attacker with a risk score of ${riskScore.toFixed(4)}.`,
      });
    }
    
    // Check if address exists in dusting_candidates (basic information)
    if (candidateResult.rowCount && candidateResult.rowCount > 0) {
      const riskScore = parseFloat(candidateResult.rows[0].risk_score);
      
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



/**
 * Get dusting attackers with pagination and filtering
 * Query parameters:
 * - limit: number of records to return (default: 10)
 * - offset: pagination offset (default: 0)
 * - minRiskScore: minimum risk score (0-1)
 * - sortBy: field to sort by (default: risk_score)
 * - sortOrder: asc or desc (default: desc)
 */
app.get("/api/dusting-attackers", async (req: Request, res: Response) => {
  try {
    const {
      limit = 10,
      offset = 0,
      minRiskScore,
      sortBy = "risk_score",
      sortOrder = "desc",
    } = req.query;

    // Build the main query with filters
    let queryBase = "SELECT * FROM dusting_attackers WHERE 1=1";
    let countQueryBase = "SELECT COUNT(*) as total FROM dusting_attackers WHERE 1=1";
    const params: any[] = [];
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
      "wallet_age_days"
    ];
    const sortField = validSortFields.includes(sortBy as string)
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
    const result = await db.pool.executeQuery(queryBase, queryParams);

    // Execute count query to get total records (for pagination metadata)
    const countResult = await db.pool.executeQuery(countQueryBase, params);
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
    console.error("Error fetching dusting attackers:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dusting attackers",
      error: (error as Error).message,
    });
  }
});

/**
 * Get dusting victims with pagination and filtering
 * Query parameters:
 * - limit: number of records to return (default: 10)
 * - offset: pagination offset (default: 0)
 * - minRiskScore: minimum risk score (0-1)
 * - sortBy: field to sort by (default: risk_score)
 * - sortOrder: asc or desc (default: desc)
 */
app.get("/api/dusting-victims", async (req: Request, res: Response) => {
  try {
    const {
      limit = 10,
      offset = 0,
      minRiskScore,
      sortBy = "risk_score",
      sortOrder = "desc",
    } = req.query;

    // Build the main query with filters
    let queryBase = "SELECT * FROM dusting_victims WHERE 1=1";
    let countQueryBase = "SELECT COUNT(*) as total FROM dusting_victims WHERE 1=1";
    const params: any[] = [];
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
      "wallet_age_days"
    ];
    const sortField = validSortFields.includes(sortBy as string)
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
    const result = await db.pool.executeQuery(queryBase, queryParams);

    // Execute count query to get total records (for pagination metadata)
    const countResult = await db.pool.executeQuery(countQueryBase, params);
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
    console.error("Error fetching dusting victims:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dusting victims",
      error: (error as Error).message,
    });
  }
});

/**
 * Get detailed information about a specific dusting attacker
 */
app.get("/api/dusting-attackers/:address", async (req: Request, res: Response): Promise<any> => {
  try {
    const { address } = req.params;

    // Validate the address format (basic validation for Solana address)
    if (!address || address.length !== 44) {
      return res.status(400).json({
        status: "error",
        message: "Invalid wallet address format",
      });
    }

    const query = "SELECT * FROM dusting_attackers WHERE address = $1";
    const result = await db.pool.executeQuery(query, [address]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Dusting attacker not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching dusting attacker details:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dusting attacker details",
      error: (error as Error).message,
    });
  }
});

/**
 * Get detailed information about a specific dusting victim
 */
app.get("/api/dusting-victims/:address", async (req: Request, res: Response): Promise<any> => {
  try {
    const { address } = req.params;

    // Validate the address format (basic validation for Solana address)
    if (!address || address.length !== 44) {
      return res.status(400).json({
        status: "error",
        message: "Invalid wallet address format",
      });
    }

    const query = "SELECT * FROM dusting_victims WHERE address = $1";
    const result = await db.pool.executeQuery(query, [address]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Dusting victim not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching dusting victim details:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch dusting victim details",
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
