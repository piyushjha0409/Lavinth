import { Transaction, DashboardData, SolanaTransactionData } from '../types/transactions';

// Process all transaction data to generate dashboard metrics
export const processDashboardData = (
  transactions: Transaction[]
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
  
  return {
    activeTransactions: transactions.length,
    pendingTransactions: pendingTxs.length,
    successfulTransactions: successfulTxs.length,
    failedTransactions: failedTxs.length,
    totalVolume,
    averageTransactionSize: avgTxSize,
    potentialDustCount: dustTransactions.length,
    poisoningAttempts: poisoningAttempts.length,
    transactionsOverTime: txsByTime,
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
