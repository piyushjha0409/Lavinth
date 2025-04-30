// Transaction interfaces for the application

export interface Transaction {
  id?: string;
  signature?: string;
  type?: string;
  amount: number;
  status?: string;
  timestamp: string | number;
  isPotentialPoisoning?: boolean | null;
  isPotentialDust?: boolean;
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
  potentialDustCount: number;
  poisoningAttempts: number;
  dustingSources: number;
  pendingTransactions: number;
  transactionsOverTime: {
    date: string;
    value: number;
  }[];
}

export interface DusterWallet {
  address: string;
  smallTransfersCount: number;
  uniqueRecipients: string[];
  timestamps: number[];
}

export interface SolanaTransactionData {
  metadata: {
    timestamp: string;
    totalTransactions: number;
    dustThreshold: number;
    minTransfersForDusting: number;
    dustTransactionCount: number;
    potentialDustersCount: number;
    similarAddressGroupsCount: number;
  };
  potentialDusters: DusterWallet[];
  similarAddressGroups: Record<string, any>;
  transactions: Transaction[];
}
