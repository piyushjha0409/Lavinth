import cors from "cors";
import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import db from "./db/db-utils";
import { validateToken } from "./middlewares/validateToken";
import { validateApiKey } from "./middlewares/validateApiKey";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: ["https://www.lavinth.com", "http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "x-access-token", "x-api-key"],
  })
);
app.use(express.json());

// Helper: sanitize pagination params to prevent Postgres errors
function sanitizeLimit(val: any, defaultVal = 10, max = 10000): number {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}
function sanitizeOffset(val: any, defaultVal = 0): number {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) return defaultVal;
  return n;
}

app.get(
  "/api/dust-transactions",
  validateToken,
  async (req: Request, res: Response) => {
    const requestId = `dust-tx-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dust transactions request`);
    console.log(`[${requestId}] Query parameters:`, req.query);

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

      const limitValue = sanitizeLimit(limit);
      const offsetValue = sanitizeOffset(offset);
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
      console.error(`[${requestId}] Error fetching dust transactions:`, error);
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch dust transactions",
        error: (error as Error).message,
      });
    }
  }
);

app.get(
  "/api/dust-transactions/potential-dust",
  validateToken,
  async (req: Request, res: Response) => {
    const requestId = `pot-dust-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`[${requestId}] Starting potential dust transactions request`);
    console.log(`[${requestId}] Query parameters:`, req.query);

    try {
      const {
        limit = 10,
        offset = 0,
        sortBy = "timestamp",
        sortOrder = "desc",
      } = req.query;

      console.log(`[${requestId}] Parsed parameters:`, {
        limit,
        offset,
        sortBy,
        sortOrder,
      });

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

      const limitValue = sanitizeLimit(limit);
      const offsetValue = sanitizeOffset(offset);
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
      console.error(
        `[${requestId}] Error fetching potential dust transactions:`,
        error
      );
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch potential dust transactions",
        error: (error as Error).message,
      });
    }
  }
);

app.get(
  "/api/dust-transactions/potential-poisoning",
  validateToken,
  async (req: Request, res: Response) => {
    const requestId = `pot-poison-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(
      `[${requestId}] Starting potential poisoning transactions request`
    );
    console.log(`[${requestId}] Query parameters:`, req.query);

    try {
      const {
        limit = 10,
        offset = 0,
        sortBy = "timestamp",
        sortOrder = "desc",
      } = req.query;

      console.log(`[${requestId}] Parsed parameters:`, {
        limit,
        offset,
        sortBy,
        sortOrder,
      });

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

      const limitValue = sanitizeLimit(limit);
      const offsetValue = sanitizeOffset(offset);
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
      console.error(
        `[${requestId}] Error fetching potential poisoning transactions:`,
        error
      );
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch potential poisoning transactions",
        error: (error as Error).message,
      });
    }
  }
);

app.get("/api/overview", validateToken, async (req: Request, res: Response) => {
  const requestId = `overview-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(`[${requestId}] Starting overview statistics request`);

  try {
    // Use the new getOverviewStatistics method to fetch all statistics at once
    console.log(`[${requestId}] Fetching overview statistics...`);
    const statistics = await db.getOverviewStatistics();
    console.log(`[${requestId}] Overview statistics retrieved:`, statistics);

    // Return all statistics
    console.log(`[${requestId}] Sending successful response`);
    res.status(200).json({
      status: "success",
      data: statistics,
    });
  } catch (error) {
    console.error(`[${requestId}] Error fetching overview statistics:`, error);
    console.error(`[${requestId}] Error stack:`, (error as Error).stack);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch overview statistics",
      error: (error as Error).message,
    });
  }
});

app.get(
  "/api/check-wallet/:address",
  validateApiKey,
  async (req: Request, res: Response): Promise<any> => {
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
      const candidateQuery =
        "SELECT address, risk_score FROM dusting_candidates WHERE address = $1";
      const attackerQuery =
        "SELECT * FROM dusting_attackers WHERE address = $1";

      console.log(
        `[${requestId}] Executing parallel queries for candidates and attackers...`
      );
      const [candidateResult, attackerResult] = await Promise.all([
        db.pool.executeQuery(candidateQuery, [address]),
        db.pool.executeQuery(attackerQuery, [address]),
      ]);

      console.log(
        `[${requestId}] Candidate query result: ${candidateResult.rowCount} rows`
      );
      console.log(
        `[${requestId}] Attacker query result: ${attackerResult.rowCount} rows`
      );

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
          message: `This wallet address is flagged as a confirmed dusting attacker with a risk score of ${riskScore.toFixed(
            4
          )}.`,
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
          message: `This wallet address is flagged as a potential dusting source with a risk score of ${riskScore.toFixed(
            4
          )}.`,
        });
      } else {
        // Address does not exist in the dusting_candidates table
        console.log(
          `[${requestId}] Address not found in any dusting tables - clean wallet`
        );
        return res.status(200).json({
          status: "success",
          isDusted: false,
          riskScore: 0,
          message:
            "This wallet address is not flagged as a dusting source and appears to be safe.",
        });
      }
    } catch (error) {
      console.error(`[${requestId}] Error checking wallet address:`, error);
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to check wallet address",
        error: (error as Error).message,
      });
    }
  }
);

app.get(
  "/api/dusting-attackers",
  validateToken,
  async (req: Request, res: Response) => {
    const requestId = `dust-attackers-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting attackers request`);
    console.log(`[${requestId}] Query parameters:`, req.query);

    try {
      const {
        limit = 10,
        offset = 0,
        minRiskScore,
        sortBy = "risk_score",
        sortOrder = "desc",
      } = req.query;

      console.log(`[${requestId}] Parsed parameters:`, {
        limit,
        offset,
        minRiskScore,
        sortBy,
        sortOrder,
      });

      // Build the main query with filters
      let queryBase = "SELECT * FROM dusting_attackers WHERE 1=1";
      let countQueryBase =
        "SELECT COUNT(*) as total FROM dusting_attackers WHERE 1=1";
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
        "wallet_age_days",
      ];
      const sortField = validSortFields.includes(sortBy as string)
        ? sortBy
        : "risk_score";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      queryBase += ` ORDER BY ${sortField} ${order}`;
      queryBase += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

      const limitValue = sanitizeLimit(limit);
      const offsetValue = sanitizeOffset(offset);
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
      console.error(`[${requestId}] Error fetching dusting attackers:`, error);
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch dusting attackers",
        error: (error as Error).message,
      });
    }
  }
);

app.get(
  "/api/dusting-victims",
  validateToken,
  async (req: Request, res: Response) => {
    const requestId = `dust-victims-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting victims request`);
    console.log(`[${requestId}] Query parameters:`, req.query);

    try {
      const {
        limit = 10,
        offset = 0,
        minRiskScore,
        sortBy = "risk_score",
        sortOrder = "desc",
      } = req.query;

      console.log(`[${requestId}] Parsed parameters:`, {
        limit,
        offset,
        minRiskScore,
        sortBy,
        sortOrder,
      });

      // Build the main query with filters
      let queryBase = "SELECT * FROM dusting_victims WHERE 1=1";
      let countQueryBase =
        "SELECT COUNT(*) as total FROM dusting_victims WHERE 1=1";
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
        "wallet_age_days",
      ];
      const sortField = validSortFields.includes(sortBy as string)
        ? sortBy
        : "risk_score";
      const order = sortOrder === "asc" ? "ASC" : "DESC";

      queryBase += ` ORDER BY ${sortField} ${order}`;
      queryBase += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

      const limitValue = sanitizeLimit(limit);
      const offsetValue = sanitizeOffset(offset);
      const paginationParams = [limitValue, offsetValue];
      const queryParams = [...params, ...paginationParams];

      console.log(`[${requestId}] Final query:`, queryBase);
      console.log(`[${requestId}] Query parameters:`, queryParams);

      // Execute the main query
      console.log(`[${requestId}] Executing main query...`);
      const result = await db.pool.executeQuery(queryBase, queryParams);
      console.log(`[${requestId}] Main query result: ${result.rowCount} rows`);

      // Execute count query to get total records (for pagination metadata)
      console.log(`[${requestId}] Executing count query...`);
      const countResult = await db.pool.executeQuery(countQueryBase, params);
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
    } catch (error) {
      console.error(`[${requestId}] Error fetching dusting victims:`, error);
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch dusting victims",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Get detailed information about a specific dusting attacker
 */
app.get(
  "/api/dusting-attackers/:address",
  validateToken,
  async (req: Request, res: Response): Promise<any> => {
    const requestId = `attacker-detail-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting attacker detail request`);

    try {
      const { address } = req.params;
      console.log(
        `[${requestId}] Fetching details for attacker address:`,
        address
      );

      // Validate the address format (basic validation for Solana address)
      if (!address || address.length !== 44) {
        console.log(
          `[${requestId}] Invalid address format - length: ${address?.length}`
        );
        return res.status(400).json({
          status: "error",
          message: "Invalid wallet address format",
        });
      }

      const query = "SELECT * FROM dusting_attackers WHERE address = $1";
      console.log(`[${requestId}] Executing query:`, query);
      const result = await db.pool.executeQuery(query, [address]);
      console.log(`[${requestId}] Query result: ${result.rowCount} rows`);

      if (result.rowCount === 0) {
        console.log(`[${requestId}] Dusting attacker not found`);
        return res.status(404).json({
          status: "error",
          message: "Dusting attacker not found",
        });
      }

      console.log(
        `[${requestId}] Sending successful response with attacker details`
      );
      res.status(200).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error(
        `[${requestId}] Error fetching dusting attacker details:`,
        error
      );
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch dusting attacker details",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Get detailed information about a specific dusting victim
 */
app.get(
  "/api/dusting-victims/:address",
  validateToken,
  async (req: Request, res: Response): Promise<any> => {
    const requestId = `victim-detail-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`[${requestId}] Starting dusting victim detail request`);

    try {
      const { address } = req.params;
      console.log(
        `[${requestId}] Fetching details for victim address:`,
        address
      );

      // Validate the address format (basic validation for Solana address)
      if (!address || address.length !== 44) {
        console.log(
          `[${requestId}] Invalid address format - length: ${address?.length}`
        );
        return res.status(400).json({
          status: "error",
          message: "Invalid wallet address format",
        });
      }

      const query = "SELECT * FROM dusting_victims WHERE address = $1";
      console.log(`[${requestId}] Executing query:`, query);
      const result = await db.pool.executeQuery(query, [address]);
      console.log(`[${requestId}] Query result: ${result.rowCount} rows`);

      if (result.rowCount === 0) {
        console.log(`[${requestId}] Dusting victim not found`);
        return res.status(404).json({
          status: "error",
          message: "Dusting victim not found",
        });
      }

      console.log(
        `[${requestId}] Sending successful response with victim details`
      );
      res.status(200).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error(
        `[${requestId}] Error fetching dusting victim details:`,
        error
      );
      console.error(`[${requestId}] Error stack:`, (error as Error).stack);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch dusting victim details",
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Real-time threat metrics endpoint
 */
app.get('/api/threat-metrics', validateToken, async (req: Request, res: Response) => {
  const requestId = `threat-metrics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting threat metrics request`);
  
  try {
    const metrics = await db.pool.executeQuery(`
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
  } catch (error) {
    console.error(`[${requestId}] Error fetching threat metrics:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Attack patterns timeline endpoint
 */
app.get('/api/attack-patterns', validateToken, async (req: Request, res: Response) => {
  const requestId = `attack-patterns-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting attack patterns request`);
  
  try {
    const { hours = 24 } = req.query;
    const patterns = await db.pool.executeQuery(`
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as attack_count,
        COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as dust_count,
        COUNT(CASE WHEN is_potential_poisoning = true THEN 1 END) as poisoning_count,
        COUNT(DISTINCT sender) as unique_attackers,
        AVG(amount) as avg_amount
      FROM dust_transactions 
      WHERE timestamp > NOW() - INTERVAL '${parseInt(hours as string)} hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
    `);
    
    console.log(`[${requestId}] Attack patterns retrieved: ${patterns.rows.length} hours`);
    res.json(patterns.rows);
  } catch (error) {
    console.error(`[${requestId}] Error fetching attack patterns:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Network graph data endpoint
 */
app.get('/api/network-graph', validateToken, async (req: Request, res: Response) => {
  const requestId = `network-graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting network graph request`);
  
  try {
    const { limit = 500, minWeight = 2 } = req.query;
    const networkData = await db.pool.executeQuery(`
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
  } catch (error) {
    console.error(`[${requestId}] Error fetching network graph:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Top threats summary endpoint
 */
app.get('/api/top-threats', validateToken, async (req: Request, res: Response) => {
  const requestId = `top-threats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting top threats request`);
  
  try {
    const topAttackers = await db.pool.executeQuery(`
      SELECT address, small_transfers_count, unique_victims_count, risk_score, wallet_age_days, total_transaction_volume
      FROM dusting_attackers 
      ORDER BY small_transfers_count DESC 
      LIMIT 10
    `);
    
    const topVictims = await db.pool.executeQuery(`
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
  } catch (error) {
    console.error(`[${requestId}] Error fetching top threats:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Dusting candidates endpoint
 */
app.get('/api/dusting-candidates', validateToken, async (req: Request, res: Response) => {
  const requestId = `candidates-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting dusting candidates request`);
  
  try {
    const { minRiskScore = 0.3, limit = 100 } = req.query;
    const candidates = await db.pool.executeQuery(`
      SELECT address, risk_score, first_detected_at, last_updated
      FROM dusting_candidates 
      WHERE risk_score >= $1
      ORDER BY risk_score DESC, last_updated DESC
      LIMIT $2
    `, [minRiskScore, limit]);
    
    console.log(`[${requestId}] Dusting candidates retrieved: ${candidates.rows.length} candidates`);
    res.json(candidates.rows);
  } catch (error) {
    console.error(`[${requestId}] Error fetching dusting candidates:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * System status endpoint for dynamic status indicators
 */
app.get('/api/system-status', validateToken, async (req: Request, res: Response) => {
  const requestId = `system-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Starting system status request`);
  
  try {
    // Get real-time system metrics
    const [dbStatus, recentActivity, systemHealth] = await Promise.all([
      // Check database connectivity
      db.pool.executeQuery('SELECT 1 as status'),
      // Check recent activity (last 5 minutes)
      db.pool.executeQuery(`
        SELECT COUNT(*) as recent_count 
        FROM dust_transactions 
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
      `),
      // Get system health metrics
      db.pool.executeQuery(`
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
  } catch (error) {
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
});

// ============================================
// WalletShield Recovery Endpoints (Phase 1)
// ============================================

import { approvalScanner } from "./services/approval-scanner";
import { revocationEngine } from "./services/revocation-engine";

/**
 * Scan wallet for token approvals
 * GET /api/approvals/scan/:address
 */
app.get('/api/approvals/scan/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `approvals-scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Starting approval scan for wallet: ${address}`);

  try {
    // Validate address format
    if (!address || address.length < 32 || address.length > 44) {
      res.status(400).json({ error: 'Invalid wallet address format' });
      return;
    }

    const scanResult = await approvalScanner.scanWallet(address);

    if (!scanResult.success) {
      console.error(`[${requestId}] Scan failed:`, scanResult.error);
      res.status(500).json({ error: scanResult.error });
      return;
    }

    console.log(`[${requestId}] Scan completed: ${scanResult.profile?.totalApprovals} approvals found`);
    res.json({
      success: true,
      walletAddress: address,
      profile: scanResult.profile,
      scannedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error scanning approvals:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get cached approvals for a wallet
 * GET /api/approvals/:address
 */
app.get('/api/approvals/:address', validateApiKey, async (req: Request, res: Response) => {
  const requestId = `approvals-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching approvals for wallet: ${address}`);

  try {
    const approvals = await approvalScanner.getApprovals(address);
    const profile = await approvalScanner.getSecurityProfile(address);

    console.log(`[${requestId}] Retrieved ${approvals.length} approvals`);
    res.json({
      walletAddress: address,
      profile,
      approvals
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching approvals:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get security profile for a wallet
 * GET /api/security-profile/:address
 */
app.get('/api/security-profile/:address', validateApiKey, async (req: Request, res: Response) => {
  const requestId = `security-profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching security profile for wallet: ${address}`);

  try {
    let profile = await approvalScanner.getSecurityProfile(address);

    // If no cached profile, do a fresh scan
    if (!profile) {
      console.log(`[${requestId}] No cached profile, performing fresh scan`);
      const scanResult = await approvalScanner.scanWallet(address);
      profile = scanResult.profile;
    }

    res.json({
      walletAddress: address,
      profile,
      retrievedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching security profile:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create revocation plan for a wallet
 * POST /api/revocation/plan
 */
app.post('/api/revocation/plan', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `revocation-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress, approvalIds } = req.body;
  console.log(`[${requestId}] Creating revocation plan for wallet: ${walletAddress}`);

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const plan = await revocationEngine.createRevocationPlan(walletAddress);

    console.log(`[${requestId}] Revocation plan created: ${plan.totalApprovals} approvals, ${plan.totalTransactions} transactions`);
    res.json({
      success: true,
      plan: {
        sessionId: plan.sessionId,
        walletAddress: plan.walletAddress,
        totalApprovals: plan.totalApprovals,
        totalTransactions: plan.totalTransactions,
        estimatedTotalFee: plan.estimatedTotalFee,
        createdAt: plan.createdAt
      }
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error creating revocation plan:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Build unsigned transactions for revocation
 * POST /api/revocation/build
 */
app.post('/api/revocation/build', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `revocation-build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress } = req.body;
  console.log(`[${requestId}] Building revocation transactions for wallet: ${walletAddress}`);

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    // Create plan and build transactions
    const plan = await revocationEngine.createRevocationPlan(walletAddress);
    const transactions = await revocationEngine.buildUnsignedTransactions(plan);

    console.log(`[${requestId}] Built ${transactions.length} unsigned transactions`);
    res.json({
      success: true,
      sessionId: plan.sessionId,
      walletAddress,
      totalApprovals: plan.totalApprovals,
      transactions: transactions,
      estimatedTotalFee: plan.estimatedTotalFee
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error building revocation transactions:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Submit signed revocation transactions
 * POST /api/revocation/submit
 */
app.post('/api/revocation/submit', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `revocation-submit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { sessionId, signedTransactions } = req.body;
  console.log(`[${requestId}] Submitting signed transactions for session: ${sessionId}`);

  try {
    if (!sessionId || !signedTransactions || !Array.isArray(signedTransactions)) {
      res.status(400).json({ error: 'sessionId and signedTransactions array are required' });
      return;
    }

    const result = await revocationEngine.submitSignedTransactions(sessionId, signedTransactions);

    console.log(`[${requestId}] Submission complete: ${result.totalRevoked} revoked, ${result.totalFailed} failed`);
    res.json(result);
  } catch (error: any) {
    console.error(`[${requestId}] Error submitting revocation transactions:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Emergency revoke all high-risk approvals
 * POST /api/revocation/emergency
 */
app.post('/api/revocation/emergency', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `emergency-revoke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress } = req.body;
  console.log(`[${requestId}] Creating EMERGENCY revocation plan for wallet: ${walletAddress}`);

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const plan = await revocationEngine.createEmergencyRevokePlan(walletAddress);
    const transactions = await revocationEngine.buildUnsignedTransactions(plan);

    console.log(`[${requestId}] Emergency plan created: ${plan.totalApprovals} high-risk approvals`);
    res.json({
      success: true,
      isEmergency: true,
      sessionId: plan.sessionId,
      walletAddress,
      totalHighRiskApprovals: plan.totalApprovals,
      transactions: transactions,
      estimatedTotalFee: plan.estimatedTotalFee
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error creating emergency revocation:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get recovery session status
 * GET /api/recovery/session/:sessionId
 */
app.get('/api/recovery/session/:sessionId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `recovery-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { sessionId } = req.params;
  console.log(`[${requestId}] Fetching recovery session: ${sessionId}`);

  try {
    const session = await revocationEngine.getRecoverySession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching recovery session:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all recovery sessions for a wallet
 * GET /api/recovery/history/:address
 */
app.get('/api/recovery/history/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `recovery-history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching recovery history for wallet: ${address}`);

  try {
    const sessions = await revocationEngine.getRecoverySessionsForWallet(address);

    res.json({
      walletAddress: address,
      sessions,
      total: sessions.length
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching recovery history:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Report a malicious delegate address
 * POST /api/report/malicious-delegate
 */
app.post('/api/report/malicious-delegate', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `report-delegate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address, label, category, reportedLosses } = req.body;
  console.log(`[${requestId}] Reporting malicious delegate: ${address}`);

  try {
    if (!address || !label || !category) {
      res.status(400).json({ error: 'address, label, and category are required' });
      return;
    }

    await approvalScanner.reportMaliciousDelegate(address, label, category, reportedLosses || 0);

    console.log(`[${requestId}] Malicious delegate reported successfully`);
    res.json({
      success: true,
      message: 'Malicious delegate reported successfully'
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error reporting malicious delegate:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 2)
// Compromise Detection & Fund Tracking
// ============================================

import { compromiseDetector } from "./services/compromise-detector";
import { fundTracker } from "./services/fund-tracker";
import { alertManager } from "./services/alert-manager";

/**
 * Analyze wallet for signs of compromise
 * GET /api/compromise/analyze/:address
 */
app.get('/api/compromise/analyze/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `compromise-analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Analyzing wallet for compromise: ${address}`);

  try {
    if (!address || address.length < 32 || address.length > 44) {
      res.status(400).json({ error: 'Invalid wallet address format' });
      return;
    }

    const result = await compromiseDetector.analyzeWallet(address);

    console.log(`[${requestId}] Analysis complete: isCompromised=${result.isCompromised}, alerts=${result.alerts.length}`);
    res.json({
      success: true,
      walletAddress: address,
      isCompromised: result.isCompromised,
      riskScore: result.riskScore,
      alertCount: result.alerts.length,
      alerts: result.alerts,
      recentTransactions: result.transactions.slice(0, 10),
      analyzedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error analyzing wallet:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Register wallet for monitoring
 * POST /api/compromise/monitor
 */
app.post('/api/compromise/monitor', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `monitor-register-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress, userId, alertChannels, monitoringLevel } = req.body;
  console.log(`[${requestId}] Registering wallet for monitoring: ${walletAddress}`);

  try {
    if (!walletAddress) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    const wallet = await compromiseDetector.registerWallet(
      walletAddress,
      userId,
      alertChannels,
      monitoringLevel || 'standard'
    );

    // Also create alert subscription if channels provided
    if (alertChannels) {
      await alertManager.createSubscription(walletAddress, alertChannels, { userId });
    }

    console.log(`[${requestId}] Wallet registered for monitoring`);
    res.json({
      success: true,
      wallet
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error registering wallet:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get monitored wallet info
 * GET /api/compromise/monitor/:address
 */
app.get('/api/compromise/monitor/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `monitor-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching monitored wallet: ${address}`);

  try {
    const wallet = await compromiseDetector.getMonitoredWallet(address);

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found in monitoring list' });
      return;
    }

    res.json(wallet);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching monitored wallet:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get alerts for a wallet
 * GET /api/compromise/alerts/:address
 */
app.get('/api/compromise/alerts/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `alerts-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  const { limit = 50 } = req.query;
  console.log(`[${requestId}] Fetching alerts for wallet: ${address}`);

  try {
    const alerts = await compromiseDetector.getAlerts(address, sanitizeLimit(limit, 50));

    res.json({
      walletAddress: address,
      alertCount: alerts.length,
      alerts
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching alerts:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Acknowledge an alert
 * POST /api/compromise/alerts/:alertId/acknowledge
 */
app.post('/api/compromise/alerts/:alertId/acknowledge', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `alert-ack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { alertId } = req.params;
  console.log(`[${requestId}] Acknowledging alert: ${alertId}`);

  try {
    await compromiseDetector.acknowledgeAlert(alertId);

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error acknowledging alert:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get recent transactions for a wallet
 * GET /api/compromise/transactions/:address
 */
app.get('/api/compromise/transactions/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `transactions-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  const { limit = 50 } = req.query;
  console.log(`[${requestId}] Fetching transactions for wallet: ${address}`);

  try {
    const transactions = await compromiseDetector.getTransactions(address, sanitizeLimit(limit, 50));

    res.json({
      walletAddress: address,
      transactionCount: transactions.length,
      transactions
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching transactions:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Fund Tracking Endpoints
// ============================================

/**
 * Start tracing stolen funds
 * POST /api/funds/trace
 */
app.post('/api/funds/trace', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `trace-start-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { sourceWallet, initialAmount, tokenMint } = req.body;
  console.log(`[${requestId}] Starting fund trace for wallet: ${sourceWallet}`);

  try {
    if (!sourceWallet || !initialAmount) {
      res.status(400).json({ error: 'sourceWallet and initialAmount are required' });
      return;
    }

    const trace = await fundTracker.startTrace(sourceWallet, initialAmount, tokenMint);

    console.log(`[${requestId}] Trace started: ${trace.traceId}`);
    res.json({
      success: true,
      trace
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error starting trace:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get trace status and details
 * GET /api/funds/trace/:traceId
 */
app.get('/api/funds/trace/:traceId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `trace-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { traceId } = req.params;
  console.log(`[${requestId}] Fetching trace: ${traceId}`);

  try {
    const trace = await fundTracker.getTrace(traceId);

    if (!trace) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }

    res.json(trace);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching trace:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all traces for a wallet
 * GET /api/funds/traces/:address
 */
app.get('/api/funds/traces/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `traces-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching traces for wallet: ${address}`);

  try {
    const traces = await fundTracker.getTracesForWallet(address);

    res.json({
      walletAddress: address,
      traceCount: traces.length,
      traces
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching traces:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate recovery report
 * GET /api/funds/report/:traceId
 */
app.get('/api/funds/report/:traceId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `report-generate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { traceId } = req.params;
  console.log(`[${requestId}] Generating recovery report for trace: ${traceId}`);

  try {
    const report = await fundTracker.generateRecoveryReport(traceId);

    if (!report) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }

    console.log(`[${requestId}] Report generated: ${report.recoveryProbability}% recovery probability`);
    res.json(report);
  } catch (error: any) {
    console.error(`[${requestId}] Error generating report:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create freeze request for exchange
 * POST /api/funds/freeze-request
 */
app.post('/api/funds/freeze-request', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `freeze-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { traceId, exchangeDeposit, victimInfo } = req.body;
  console.log(`[${requestId}] Creating freeze request for trace: ${traceId}`);

  try {
    if (!traceId || !exchangeDeposit) {
      res.status(400).json({ error: 'traceId and exchangeDeposit are required' });
      return;
    }

    const request = await fundTracker.createFreezeRequest(traceId, exchangeDeposit);

    // Generate template if victimInfo provided
    let template: string | undefined;
    if (victimInfo) {
      template = fundTracker.generateFreezeRequestTemplate(request, victimInfo);
    }

    console.log(`[${requestId}] Freeze request created: ${request.requestId}`);
    res.json({
      success: true,
      request,
      template
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error creating freeze request:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Alert Management Endpoints
// ============================================

/**
 * Create or update alert subscription
 * POST /api/alerts/subscribe
 */
app.post('/api/alerts/subscribe', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `subscribe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress, channels, userId, severityFilter, alertTypes } = req.body;
  console.log(`[${requestId}] Creating alert subscription for wallet: ${walletAddress}`);

  try {
    if (!walletAddress || !channels) {
      res.status(400).json({ error: 'walletAddress and channels are required' });
      return;
    }

    const subscription = await alertManager.createSubscription(walletAddress, channels, {
      userId,
      severityFilter,
      alertTypes
    });

    console.log(`[${requestId}] Subscription created: ${subscription.subscriptionId}`);
    res.json({
      success: true,
      subscription
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error creating subscription:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get alert subscription for wallet
 * GET /api/alerts/subscription/:address
 */
app.get('/api/alerts/subscription/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `subscription-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching subscription for wallet: ${address}`);

  try {
    const subscription = await alertManager.getSubscription(address);

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json(subscription);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching subscription:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Deactivate alert subscription
 * DELETE /api/alerts/subscription/:address
 */
app.delete('/api/alerts/subscription/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `subscription-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Deactivating subscription for wallet: ${address}`);

  try {
    await alertManager.deactivateSubscription(address);

    res.json({
      success: true,
      message: 'Subscription deactivated'
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error deactivating subscription:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get notification history for wallet
 * GET /api/alerts/history/:address
 */
app.get('/api/alerts/history/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `notifications-history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  const { limit = 50 } = req.query;
  console.log(`[${requestId}] Fetching notification history for wallet: ${address}`);

  try {
    const notifications = await alertManager.getNotificationHistory(address, sanitizeLimit(limit, 50));

    res.json({
      walletAddress: address,
      notificationCount: notifications.length,
      notifications
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching notifications:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get known exchanges list
 * GET /api/data/exchanges
 */
app.get('/api/data/exchanges', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `exchanges-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching known exchanges`);

  try {
    const result = await db.pool.executeQuery(
      `SELECT address, exchange_name, exchange_type, is_verified FROM known_exchanges ORDER BY exchange_name`
    );

    res.json({
      count: result.rows.length,
      exchanges: result.rows
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching exchanges:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get known bridges list
 * GET /api/data/bridges
 */
app.get('/api/data/bridges', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `bridges-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching known bridges`);

  try {
    const result = await db.pool.executeQuery(
      `SELECT address, bridge_name, destination_chains, is_active FROM known_bridges ORDER BY bridge_name`
    );

    res.json({
      count: result.rows.length,
      bridges: result.rows
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching bridges:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 3)
// Exchange Coordination & Freeze Requests
// ============================================

import { exchangeCoordinator } from "./services/exchange-coordinator";

/**
 * List all exchange contacts
 * GET /api/exchanges/contacts
 */
app.get('/api/exchanges/contacts', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `exchanges-contacts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching exchange contacts`);

  try {
    const contacts = await exchangeCoordinator.listExchangeContacts();

    res.json({
      count: contacts.length,
      contacts
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching exchange contacts:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get exchange contact by ID
 * GET /api/exchanges/contacts/:exchangeId
 */
app.get('/api/exchanges/contacts/:exchangeId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `exchange-contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { exchangeId } = req.params;
  console.log(`[${requestId}] Fetching exchange contact: ${exchangeId}`);

  try {
    const contact = await exchangeCoordinator.getExchangeContact(exchangeId);

    if (!contact) {
      res.status(404).json({ error: 'Exchange contact not found' });
      return;
    }

    res.json(contact);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching exchange contact:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get exchange by deposit address
 * GET /api/exchanges/by-address/:address
 */
app.get('/api/exchanges/by-address/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `exchange-by-addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Fetching exchange by address: ${address}`);

  try {
    const contact = await exchangeCoordinator.getExchangeByAddress(address);

    if (!contact) {
      res.status(404).json({ error: 'Exchange not found for this address' });
      return;
    }

    res.json(contact);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching exchange by address:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new freeze request
 * POST /api/freeze-requests
 */
app.post('/api/freeze-requests', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `freeze-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { traceId, exchangeName, depositAddress, depositSignature, amount, victimWallet, tokenMint, tokenSymbol } = req.body;
  console.log(`[${requestId}] Creating freeze request for trace: ${traceId}`);

  try {
    if (!traceId || !exchangeName || !depositAddress || !depositSignature || !amount || !victimWallet) {
      res.status(400).json({
        error: 'Missing required fields: traceId, exchangeName, depositAddress, depositSignature, amount, victimWallet'
      });
      return;
    }

    const request = await exchangeCoordinator.createFreezeRequest(
      traceId,
      exchangeName,
      depositAddress,
      depositSignature,
      amount,
      victimWallet,
      tokenMint,
      tokenSymbol
    );

    console.log(`[${requestId}] Freeze request created: ${request.requestId}`);
    res.status(201).json({
      success: true,
      request
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error creating freeze request:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * List all pending freeze requests
 * GET /api/freeze-requests/pending
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/pending', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `freeze-pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching pending freeze requests`);

  try {
    const requests = await exchangeCoordinator.listPendingRequests();

    res.json({
      count: requests.length,
      requests
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching pending requests:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get requests needing follow-up
 * GET /api/freeze-requests/follow-up
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/follow-up', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `follow-up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching requests needing follow-up`);

  try {
    const requests = await exchangeCoordinator.getRequestsNeedingFollowUp();

    res.json({
      count: requests.length,
      requests
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching follow-up requests:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get freeze request statistics
 * GET /api/freeze-requests/statistics
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/statistics', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `freeze-stats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching freeze request statistics`);

  try {
    const statistics = await exchangeCoordinator.getStatistics();

    res.json(statistics);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching statistics:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * List freeze requests for a trace
 * GET /api/freeze-requests/trace/:traceId
 * NOTE: This must be before /:requestId route
 */
app.get('/api/freeze-requests/trace/:traceId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `freeze-list-trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { traceId } = req.params;
  console.log(`[${requestId}] Fetching freeze requests for trace: ${traceId}`);

  try {
    const requests = await exchangeCoordinator.listFreezeRequestsForTrace(traceId);

    res.json({
      traceId,
      count: requests.length,
      requests
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching freeze requests:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get freeze request by ID
 * GET /api/freeze-requests/:requestId
 * NOTE: This MUST be after all specific freeze-requests routes
 */
app.get('/api/freeze-requests/:requestId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `freeze-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { requestId: freezeRequestId } = req.params;
  console.log(`[${requestId}] Fetching freeze request: ${freezeRequestId}`);

  try {
    const request = await exchangeCoordinator.getFreezeRequest(freezeRequestId);

    if (!request) {
      res.status(404).json({ error: 'Freeze request not found' });
      return;
    }

    res.json(request);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching freeze request:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update freeze request status
 * PATCH /api/freeze-requests/:requestId/status
 */
app.patch('/api/freeze-requests/:requestId/status', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const reqId = `freeze-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { requestId } = req.params;
  const { status, exchangeTicketId, exchangeResponse } = req.body;
  console.log(`[${reqId}] Updating freeze request status: ${requestId} -> ${status}`);

  try {
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    await exchangeCoordinator.updateRequestStatus(requestId, status, exchangeTicketId, exchangeResponse);

    console.log(`[${reqId}] Status updated successfully`);
    res.json({
      success: true,
      message: `Status updated to ${status}`
    });
  } catch (error: any) {
    console.error(`[${reqId}] Error updating status:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate evidence package for a freeze request
 * POST /api/freeze-requests/:requestId/evidence
 */
app.post('/api/freeze-requests/:requestId/evidence', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const reqId = `evidence-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { requestId } = req.params;
  const { traceId, victimWallet, victimStatement } = req.body;
  console.log(`[${reqId}] Generating evidence package for request: ${requestId}`);

  try {
    if (!traceId || !victimWallet) {
      res.status(400).json({ error: 'traceId and victimWallet are required' });
      return;
    }

    const evidencePackage = await exchangeCoordinator.generateEvidencePackage(
      requestId,
      traceId,
      victimWallet,
      victimStatement
    );

    console.log(`[${reqId}] Evidence package generated: ${evidencePackage.packageId}`);
    res.status(201).json({
      success: true,
      evidencePackage
    });
  } catch (error: any) {
    console.error(`[${reqId}] Error generating evidence:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get evidence package by ID
 * GET /api/evidence/:packageId
 */
app.get('/api/evidence/:packageId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const reqId = `evidence-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { packageId } = req.params;
  console.log(`[${reqId}] Fetching evidence package: ${packageId}`);

  try {
    const evidencePackage = await exchangeCoordinator.getEvidencePackage(packageId);

    if (!evidencePackage) {
      res.status(404).json({ error: 'Evidence package not found' });
      return;
    }

    res.json(evidencePackage);
  } catch (error: any) {
    console.error(`[${reqId}] Error fetching evidence:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate freeze request email template
 * POST /api/freeze-requests/:requestId/email-template
 */
app.post('/api/freeze-requests/:requestId/email-template', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const reqId = `email-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { requestId } = req.params;
  console.log(`[${reqId}] Generating email template for request: ${requestId}`);

  try {
    const request = await exchangeCoordinator.getFreezeRequest(requestId);
    if (!request) {
      res.status(404).json({ error: 'Freeze request not found' });
      return;
    }

    if (!request.evidencePackageId) {
      res.status(400).json({ error: 'Evidence package must be generated first' });
      return;
    }

    const evidencePackage = await exchangeCoordinator.getEvidencePackage(request.evidencePackageId);
    if (!evidencePackage) {
      res.status(404).json({ error: 'Evidence package not found' });
      return;
    }

    const exchangeContact = await exchangeCoordinator.getExchangeContact(request.exchangeId);
    if (!exchangeContact) {
      res.status(404).json({ error: 'Exchange contact not found' });
      return;
    }

    const template = exchangeCoordinator.generateFreezeRequestEmail(request, evidencePackage, exchangeContact);

    console.log(`[${reqId}] Email template generated`);
    res.json({
      success: true,
      template,
      recipientEmail: exchangeContact.complianceEmail || exchangeContact.emergencyEmail
    });
  } catch (error: any) {
    console.error(`[${reqId}] Error generating email template:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Record follow-up action
 * POST /api/freeze-requests/:requestId/follow-up
 */
app.post('/api/freeze-requests/:requestId/follow-up', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const reqId = `record-follow-up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { requestId } = req.params;
  const { nextFollowUpHours = 24 } = req.body;
  console.log(`[${reqId}] Recording follow-up for request: ${requestId}`);

  try {
    await exchangeCoordinator.recordFollowUp(requestId, nextFollowUpHours);

    res.json({
      success: true,
      message: `Follow-up recorded, next follow-up in ${nextFollowUpHours} hours`
    });
  } catch (error: any) {
    console.error(`[${reqId}] Error recording follow-up:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 5)
// Transaction Simulation & Prevention
// ============================================

import { transactionSimulator } from "./services/transaction-simulator";

/**
 * Simulate a transaction before signing
 * POST /api/simulation/simulate
 */
app.post('/api/simulation/simulate', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `simulate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { serializedTransaction, walletAddress, storeResult = true } = req.body;
  console.log(`[${requestId}] Simulating transaction for wallet: ${walletAddress}`);

  try {
    if (!serializedTransaction || !walletAddress) {
      res.status(400).json({ error: 'serializedTransaction and walletAddress are required' });
      return;
    }

    const result = await transactionSimulator.simulateTransaction(
      serializedTransaction,
      walletAddress
    );

    console.log(`[${requestId}] Simulation complete: risk=${result.riskLevel}`);
    res.json({
      success: true,
      simulation: result
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error simulating transaction:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Quick risk check for a transaction (lightweight)
 * POST /api/simulation/quick-check
 */
app.post('/api/simulation/quick-check', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `quick-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { serializedTransaction } = req.body;
  console.log(`[${requestId}] Quick risk check`);

  try {
    if (!serializedTransaction) {
      res.status(400).json({ error: 'serializedTransaction is required' });
      return;
    }

    const result = await transactionSimulator.quickRiskCheck(serializedTransaction);

    console.log(`[${requestId}] Quick check complete: risk=${result.riskLevel}`);
    res.json({
      success: true,
      check: result
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error in quick check:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get simulation history for a wallet
 * GET /api/simulation/history/:walletAddress
 */
app.get('/api/simulation/history/:walletAddress', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `sim-history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress } = req.params;
  const { limit = 50 } = req.query;
  console.log(`[${requestId}] Fetching simulation history for wallet: ${walletAddress}`);

  try {
    const history = await transactionSimulator.getSimulationHistory(
      walletAddress,
      sanitizeLimit(limit, 50)
    );

    res.json({
      walletAddress,
      count: history.length,
      simulations: history
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching simulation history:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific simulation by ID
 * GET /api/simulation/:simulationId
 */
app.get('/api/simulation/:simulationId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `sim-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { simulationId } = req.params;
  console.log(`[${requestId}] Fetching simulation: ${simulationId}`);

  try {
    const simResult = await db.pool.executeQuery(
      `SELECT * FROM transaction_simulations WHERE simulation_id = $1`,
      [simulationId]
    );

    if (simResult.rows.length === 0) {
      res.status(404).json({ error: 'Simulation not found' });
      return;
    }

    const row = simResult.rows[0];
    const simulation = {
      simulationId: row.simulation_id,
      success: row.success,
      riskLevel: row.risk_level,
      riskScore: row.risk_score,
      warnings: row.warnings || [],
      effects: row.effects || [],
      simulatedAt: row.simulated_at,
    };

    res.json(simulation);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching simulation:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get list of verified programs
 * GET /api/simulation/programs
 * NOTE: This must be before /:simulationId route - but we define it here, Express handles it correctly
 */
app.get('/api/programs/verified', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `programs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching verified programs`);

  try {
    const result = await db.pool.executeQuery(
      `SELECT program_id, program_name, category, description, website_url, is_verified, is_audited, risk_level
       FROM verified_programs
       ORDER BY program_name`
    );

    res.json({
      count: result.rows.length,
      programs: result.rows
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching verified programs:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check if a program is verified
 * GET /api/programs/:programId
 */
app.get('/api/programs/:programId', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `program-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { programId } = req.params;
  console.log(`[${requestId}] Checking program: ${programId}`);

  try {
    const result = await db.pool.executeQuery(
      `SELECT program_id, program_name, category, description, website_url, is_verified, is_audited, audit_url, risk_level
       FROM verified_programs
       WHERE program_id = $1`,
      [programId]
    );

    if (result.rows.length === 0) {
      res.json({
        programId,
        isVerified: false,
        isKnown: false,
        message: 'Program not found in verified database'
      });
      return;
    }

    res.json({
      ...result.rows[0],
      isKnown: true
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error checking program:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get simulation alerts for a wallet
 * GET /api/simulation/alerts/:walletAddress
 */
app.get('/api/simulation/alerts/:walletAddress', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `sim-alerts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { walletAddress } = req.params;
  const { limit = 50, acknowledged } = req.query;
  console.log(`[${requestId}] Fetching simulation alerts for wallet: ${walletAddress}`);

  try {
    let query = `SELECT * FROM simulation_alerts WHERE wallet_address = $1`;
    const params: any[] = [walletAddress];

    if (acknowledged !== undefined) {
      query += ` AND is_acknowledged = $2`;
      params.push(acknowledged === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(sanitizeLimit(limit, 50));

    const result = await db.pool.executeQuery(query, params);

    res.json({
      walletAddress,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching simulation alerts:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Acknowledge a simulation alert
 * POST /api/simulation/alerts/:alertId/acknowledge
 */
app.post('/api/simulation/alerts/:alertId/acknowledge', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `ack-sim-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { alertId } = req.params;
  console.log(`[${requestId}] Acknowledging simulation alert: ${alertId}`);

  try {
    await db.pool.executeQuery(
      `UPDATE simulation_alerts SET is_acknowledged = true, acknowledged_at = NOW() WHERE alert_id = $1`,
      [alertId]
    );

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error acknowledging alert:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WalletShield Recovery Endpoints (Phase 6)
// Threat Intelligence Data Source Integration
// ============================================

import { threatIntelligenceService } from "./services/threat-intelligence";

// Wire up threat intelligence to existing services
compromiseDetector.setThreatIntel(threatIntelligenceService);
fundTracker.setThreatIntel(threatIntelligenceService);
exchangeCoordinator.setThreatIntel(threatIntelligenceService);

/**
 * Trigger threat intel sync (all or specific source)
 * POST /api/threat-intel/sync
 */
app.post('/api/threat-intel/sync', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `threat-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { sourceId } = req.body;
  console.log(`[${requestId}] Triggering threat intel sync${sourceId ? `: ${sourceId}` : ' (all)'}`);

  try {
    if (sourceId) {
      const result = await threatIntelligenceService.syncSource(sourceId);

      // Refresh service caches after sync
      await Promise.all([
        compromiseDetector.refreshKnownAddresses(),
        fundTracker.refreshKnownAddresses(),
      ]);

      console.log(`[${requestId}] Source sync complete: ${result.addressesNew} new, ${result.addressesUpdated} updated`);
      res.json({ success: true, results: [result] });
    } else {
      const results = await threatIntelligenceService.syncAll();

      // Refresh service caches after sync
      await Promise.all([
        compromiseDetector.refreshKnownAddresses(),
        fundTracker.refreshKnownAddresses(),
      ]);

      console.log(`[${requestId}] Full sync complete: ${results.length} sources`);
      res.json({ success: true, results });
    }
  } catch (error: any) {
    console.error(`[${requestId}] Error during threat intel sync:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get threat intel system status
 * GET /api/threat-intel/status
 */
app.get('/api/threat-intel/status', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `threat-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching threat intel status`);

  try {
    const status = await threatIntelligenceService.getStatus();

    console.log(`[${requestId}] Status retrieved: ${status.sources.length} sources, ${status.totalMaliciousAddresses} addresses`);
    res.json(status);
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching threat intel status:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * List threat intel sources with per-source statistics
 * GET /api/threat-intel/sources
 */
app.get('/api/threat-intel/sources', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `threat-sources-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] Fetching threat intel sources`);

  try {
    const sources = await threatIntelligenceService.getSources();

    console.log(`[${requestId}] Sources retrieved: ${sources.length}`);
    res.json({
      count: sources.length,
      sources
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error fetching threat intel sources:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Arkham entity lookup for a specific address
 * GET /api/threat-intel/entity/:address
 */
app.get('/api/threat-intel/entity/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `entity-lookup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Looking up entity for address: ${address}`);

  try {
    if (!address || address.length < 32 || address.length > 44) {
      res.status(400).json({ error: 'Invalid address format' });
      return;
    }

    const entity = await threatIntelligenceService.lookupEntityCached(address);

    console.log(`[${requestId}] Entity lookup: ${entity ? entity.entityName || 'unknown' : 'not found'}`);
    res.json({
      address,
      entity,
      source: entity ? 'arkham' : null,
      cached: entity ? true : false,
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error looking up entity:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check if a domain is known scam/phishing
 * GET /api/threat-intel/domain/:domain
 */
app.get('/api/threat-intel/domain/:domain', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `domain-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { domain } = req.params;
  console.log(`[${requestId}] Checking domain: ${domain}`);

  try {
    if (!domain || domain.length < 3) {
      res.status(400).json({ error: 'Invalid domain' });
      return;
    }

    const result = await threatIntelligenceService.checkDomain(domain);

    console.log(`[${requestId}] Domain check: ${result.isScam ? 'SCAM' : 'clean'}`);
    res.json(result);
  } catch (error: any) {
    console.error(`[${requestId}] Error checking domain:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Real-time address risk check (local DB + GoPlus)
 * GET /api/threat-intel/address/:address
 */
app.get('/api/threat-intel/address/:address', validateApiKey, async (req: Request, res: Response): Promise<void> => {
  const requestId = `addr-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { address } = req.params;
  console.log(`[${requestId}] Address risk check: ${address}`);

  try {
    // Validate base58 format (32-44 alphanumeric, no 0/O/I/l)
    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      res.status(400).json({ error: 'Invalid base58 address format' });
      return;
    }

    // Check local DB first
    const localResult = await db.pool.executeQuery(
      `SELECT address, label, category, external_sources, confidence_score
       FROM known_malicious_delegates WHERE address = $1`,
      [address]
    );

    const isMalicious = localResult.rows.length > 0;
    const sources: string[] = isMalicious ? (localResult.rows[0].external_sources || []) : [];

    // Query GoPlus for real-time risk data
    const goPlusResult = await threatIntelligenceService.checkAddressGoPlus(address);

    console.log(`[${requestId}] local=${isMalicious}, goplus_risky=${goPlusResult.isRisky}`);
    res.json({
      address,
      isMalicious: isMalicious || goPlusResult.isRisky,
      sources,
      goPlusRisk: goPlusResult.isRisky || goPlusResult.riskFlags.length > 0
        ? { isRisky: goPlusResult.isRisky, riskFlags: goPlusResult.riskFlags }
        : null,
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error checking address:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Lavinth Recovery API running on port ${PORT}`);
  console.log(`📊 Debug logging enabled for all endpoints`);
  console.log(`🔍 Request IDs will be generated for tracking`);
  console.log(`🆕 Phase 1: /api/approvals/*, /api/revocation/*, /api/recovery/*, /api/security-profile/*`);
  console.log(`🆕 Phase 2: /api/compromise/*, /api/funds/*, /api/alerts/*, /api/data/*`);
  console.log(`🆕 Phase 3: /api/exchanges/*, /api/freeze-requests/*, /api/evidence/*`);
  console.log(`🆕 Phase 5: /api/simulation/*, /api/programs/*`);
  console.log(`🆕 Phase 6: /api/threat-intel/*`);
});

// Export the Express app
export default app;
