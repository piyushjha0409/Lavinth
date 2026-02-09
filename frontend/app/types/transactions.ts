// Transaction interfaces for the application

export interface Transaction {
  id?: string;
  signature?: string;
  type?: string;
  amount: number;
  status?: string;
  timestamp: string | number;
  sender?: string | null;
  recipient?: string | null;
  fee?: number;
  tokenType?: string;
  hasMemo?: boolean;
  memoContent?: string;
  slot?: number;
  success?: boolean;
}

export interface Tweet {
  handle: string;
  content: string;
  timestamp: string;
}

export interface SuspiciousWallet {
  address: string;
  reason: string;
  threatLevel: number;
  timestamp: string;
}

export interface DashboardData {
  activeTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalVolume: number;
  averageTransactionSize: number;
  pendingTransactions: number;
  transactionsOverTime: any[];
  avgTransactionFee?: number;
  uniqueSenders?: number;
  uniqueRecipients?: number;
  tokenDistribution?: Array<{
    token_type: string;
    count: number;
  }>;
}
