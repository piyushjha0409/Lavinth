import { Transaction, DashboardData, SolanaTransactionData } from '../types/transactions';

// Process all transaction data to generate dashboard metrics
export const processDashboardData = (
  transactions: Transaction[],
  attackerPatterns?: Array<{
    address: string;
    risk_score: number;
    small_transfers_count: number;
    unique_victims_count: number;
    regularity_score: number;
    centrality_score: number;
    uses_scripts: boolean;
    last_updated: string;
  }>,
  victimExposure?: Array<{
    address: string;
    risk_score: number;
    dust_transactions_count: number;
    unique_attackers_count: number;
    risk_exposure: number;
    wallet_activity: string;
    asset_value: string;
    last_updated: string;
  }>,
  dailySummary?: Array<{
    day: string;
    unique_attackers: number;
    unique_victims: number;
    total_dust_transactions: number;
    avg_dust_amount: number;
  }>
): DashboardData => {
  const successfulTxs = transactions.filter(tx => tx.success === true);
  const failedTxs = transactions.filter(tx => tx.success === false);
  const pendingTxs = transactions.filter(tx => tx.status === 'pending');
  const dustTransactions = transactions.filter(tx => tx.isPotentialDust === true);
  const poisoningAttempts = transactions.filter(tx => tx.isPotentialPoisoning === true);
  
  // Calculate total volume (only from successful transactions with amount)
  const totalVolume = successfulTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  // Calculate average transaction size
  const avgTxSize = successfulTxs.length > 0 ? totalVolume / successfulTxs.length : 0;

  // Group transactions by day for the time series chart
  const txsByTime = groupTransactionsByTime(transactions);
  
  // Calculate unique dusting sources (senders of dust transactions)
  const uniqueDustingSources = new Set(dustTransactions.map(tx => tx.sender).filter(Boolean)).size;

  return {
    activeTransactions: transactions.length,
    pendingTransactions: pendingTxs.length,
    successfulTransactions: successfulTxs.length,
    failedTransactions: failedTxs.length,
    totalVolume,
    averageTransactionSize: avgTxSize,
    potentialDustCount: dustTransactions.length,
    poisoningAttempts: poisoningAttempts.length,
    dustingSources: uniqueDustingSources,
    transactionsOverTime: txsByTime,
    // Include materialized view data if available
    attackerPatterns,
    victimExposure,
    dailySummary,
  };
};

// Group transactions by time period for charts
export const groupTransactionsByTime = (
  transactions: Transaction[]
): { timestamp: string; count: number }[] => {
  const result: Record<string, number> = {};
  
  transactions.forEach(tx => {
    // Parse timestamp to get date string (YYYY-MM-DD)
    let date: string;
    if (typeof tx.timestamp === 'number') {
      date = new Date(tx.timestamp).toISOString().split('T')[0];
    } else {
      date = new Date(tx.timestamp).toISOString().split('T')[0];
    }
    
    if (result[date]) {
      result[date]++;
    } else {
      result[date] = 1;
    }
  });
  
  // Convert to array format for charts
  return Object.entries(result).map(([timestamp, count]) => ({
    timestamp,
    count,
  })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

// Get top dusting wallets by activity
export const getTopDusters = (solanaData: SolanaTransactionData, limit = 5) => {
  return solanaData.potentialDusters
    .sort((a, b) => b.smallTransfersCount - a.smallTransfersCount)
    .slice(0, limit);
};

// Get recent suspicious transactions
export const getRecentSuspiciousTransactions = (
  transactions: Transaction[],
  limit = 10
): Transaction[] => {
  return transactions
    .filter(tx => tx.isPotentialDust || tx.isPotentialPoisoning)
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);
};

// Format large numbers for readability
export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  } else if (num < 0.001 && num > 0) {
    // For very small values (like transaction fees in SOL), show more decimal places
    return num.toFixed(8);
  } else {
    return num.toFixed(2);
  }
};

// Format wallet address for display
export const formatAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
