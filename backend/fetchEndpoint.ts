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

    // Query for average transaction amount
    const avgAmountQuery =
      "SELECT AVG(amount) as avg_amount FROM dust_transactions WHERE token_type = 'SOL' AND success = true";
    const avgAmountResult = await db.pool.query(avgAmountQuery);
    const avgTransactionAmount = parseFloat(avgAmountResult.rows[0].avg_amount || 0);

    // Query for average fee
    const avgFeeQuery =
      "SELECT AVG(fee::numeric) as avg_fee FROM dust_transactions WHERE success = true";
    const avgFeeResult = await db.pool.query(avgFeeQuery);
    const avgTransactionFee = parseFloat(avgFeeResult.rows[0].avg_fee || '0');

    // Query for token type distribution
    const tokenDistributionQuery =
      "SELECT token_type, COUNT(*) as count FROM dust_transactions GROUP BY token_type ORDER BY count DESC";
    const tokenDistributionResult = await db.pool.query(tokenDistributionQuery);
    const tokenDistribution = tokenDistributionResult.rows;

    // Query for unique senders and recipients
    const uniqueAddressesQuery = "SELECT COUNT(DISTINCT sender) as unique_senders, COUNT(DISTINCT recipient) as unique_recipients FROM dust_transactions";
    const uniqueAddressesResult = await db.pool.query(uniqueAddressesQuery);
    const uniqueSenders = parseInt(uniqueAddressesResult.rows[0].unique_senders || 0);
    const uniqueRecipients = parseInt(uniqueAddressesResult.rows[0].unique_recipients || 0);

    // Query for top dusting senders (potential attackers)
    const topDustingSourcesQuery = "SELECT sender as address, COUNT(*) as small_transfers_count, COUNT(DISTINCT recipient) as unique_victims_count, AVG(amount) as avg_amount, MAX(timestamp) as last_activity FROM dust_transactions WHERE is_potential_dust = true AND sender IS NOT NULL GROUP BY sender ORDER BY small_transfers_count DESC LIMIT 10";
    const topDustingSourcesResult = await db.pool.query(topDustingSourcesQuery);
    const attackerPatterns = topDustingSourcesResult.rows.map(row => ({
      address: row.address,
      small_transfers_count: parseInt(row.small_transfers_count),
      unique_victims_count: parseInt(row.unique_victims_count),
      avg_amount: parseFloat(row.avg_amount || 0),
      last_updated: row.last_activity,
      // Adding placeholder values for compatibility
      risk_score: 0.7,
      regularity_score: 0.5,
      centrality_score: 0.5,
      uses_scripts: false
    }));

    // Query for top dusted recipients (potential victims)
    const topDustedRecipientsQuery = "SELECT recipient as address, COUNT(*) as dust_transactions_count, COUNT(DISTINCT sender) as unique_attackers_count, SUM(amount) as total_received, MAX(timestamp) as last_activity FROM dust_transactions WHERE is_potential_dust = true AND recipient IS NOT NULL GROUP BY recipient ORDER BY dust_transactions_count DESC LIMIT 10";
    const topDustedRecipientsResult = await db.pool.query(topDustedRecipientsQuery);
    const victimExposure = topDustedRecipientsResult.rows.map(row => ({
      address: row.address,
      dust_transactions_count: parseInt(row.dust_transactions_count),
      unique_attackers_count: parseInt(row.unique_attackers_count),
      total_received: parseFloat(row.total_received || 0),
      last_updated: row.last_activity,
      // Adding placeholder values for compatibility
      risk_score: 0.5,
      risk_exposure: 0.6,
      wallet_activity: "medium",
      asset_value: "unknown"
    }));

    // Query for daily transaction summary
    const dailySummaryQuery = "SELECT DATE(timestamp) as day, COUNT(*) as total_transactions, COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as total_dust_transactions, COUNT(DISTINCT sender) as unique_senders, COUNT(DISTINCT recipient) as unique_recipients, AVG(amount) as avg_amount FROM dust_transactions GROUP BY DATE(timestamp) ORDER BY day DESC LIMIT 30";
    const dailySummaryResult = await db.pool.query(dailySummaryQuery);
    const dailySummary = dailySummaryResult.rows.map(row => ({
      day: row.day,
      total_transactions: parseInt(row.total_transactions),
      total_dust_transactions: parseInt(row.total_dust_transactions),
      unique_attackers: parseInt(row.unique_senders),
      unique_victims: parseInt(row.unique_recipients),
      avg_dust_amount: parseFloat(row.avg_amount || 0)
    }));

    // Query for recent transactions (limit to 10)
    const recentTransactionsQuery =
      "SELECT * FROM dust_transactions ORDER BY timestamp DESC LIMIT 10";
    const recentTransactionsResult = await db.pool.query(recentTransactionsQuery);
    const recentTransactions = recentTransactionsResult.rows.map(tx => ({
      id: tx.id,
      signature: tx.signature,
      timestamp: tx.timestamp,
      slot: tx.slot,
      success: tx.success,
      sender: tx.sender,
      recipient: tx.recipient,
      amount: String(parseFloat(tx.amount)),
      fee: String(parseFloat(tx.fee)),
      token_type: tx.token_type,
      token_address: tx.token_address,
      is_potential_dust: tx.is_potential_dust,
      is_potential_poisoning: tx.is_potential_poisoning,
      risk_score: String(tx.risk_score || 0.5),
      created_at: tx.created_at || tx.timestamp
    }));

    // Query for dusting sources count (addresses that are potential dusting sources)
    const dustingSourcesQuery =
      "SELECT COUNT(DISTINCT sender) as sources FROM dust_transactions WHERE is_potential_dust = true";
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
        avgTransactionAmount,
        avgTransactionFee,
        tokenDistribution,
        uniqueSenders,
        uniqueRecipients,
        attackerPatterns,
        victimExposure,
        dailySummary,
        recentTransactions
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
    if (!address || address.length !== 44) {
      return res.status(400).json({
        status: "error",
        message: "Invalid wallet address format",
      });
    }

    // Check both dusting_candidates and dusting_attackers tables
    const candidateQuery = "SELECT address, risk_score FROM dusting_candidates WHERE address = $1";
    const attackerQuery = "SELECT * FROM dusting_attackers WHERE address = $1";
    
    const [candidateResult, attackerResult] = await Promise.all([
      db.pool.query(candidateQuery, [address]),
      db.pool.query(attackerQuery, [address])
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
    const result = await db.pool.query(query, [address]);

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
    const result = await db.pool.query(query, [address]);

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
