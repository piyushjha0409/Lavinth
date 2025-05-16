"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  DollarSign,
  Shield,
  WalletIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import { TweetCard } from "@/components/TweetCard";

// Import types and processing utilities
import { Transaction, DashboardData } from "../types/transactions";
import { formatNumber, formatAddress, getTopDusters, processDashboardData } from "../utils/dataProcessing";

// API Transaction interface
interface ApiTransaction {
  id: number;
  signature: string;
  timestamp: string;
  slot: string;
  success: boolean;
  sender: string;
  recipient: string;
  amount: string;
  fee: string;
  token_type: string;
  token_address: string | null;
  is_potential_dust: boolean;
  is_potential_poisoning: boolean;
  risk_score: string;
  created_at: string;
}

// Pagination metadata interface
interface PaginationMetadata {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiResponse {
  status: string;
  count: number;
  pagination?: PaginationMetadata;
  data: ApiTransaction[];
}

// Utility Components
interface StatsCardProps {
  title: string;
  value: number;
  valueFormatter?: (val: number) => string;
  icon: React.ReactNode;
  change?: number;
  trend?: "up" | "down" | "neutral";
}

function StatsCard({
  title,
  value,
  valueFormatter,
  icon,
  change = 0,
  trend = "neutral",
}: StatsCardProps) {
  const formattedValue = valueFormatter
    ? valueFormatter(value)
    : value.toLocaleString();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formattedValue}</p>
          </div>
          <div className="rounded-full bg-muted p-2">{icon}</div>
        </div>
        {change !== 0 && (
          <div
            className={`mt-4 flex items-center text-sm ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            ) : null}
            <span>
              {Math.abs(change).toFixed(1)}%{" "}
              {trend === "up" ? "increase" : "decrease"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SecurityCardProps {
  title: string;
  value: number;
  description: string;
  severity: "low" | "medium" | "high";
  icon: React.ReactNode;
}

function SecurityCard({
  title,
  value,
  description,
  severity,
  icon,
}: SecurityCardProps) {
  const severityColor = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div
            className={`p-3 rounded-full ${
              severity === "high"
                ? "bg-red-100"
                : severity === "medium"
                ? "bg-yellow-100"
                : "bg-green-100"
            }`}
          >
            {icon}
          </div>
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-end">
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
          <span
            className={`px-2 py-1 rounded text-xs ${severityColor[severity]}`}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Risk
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false); // New state for table-specific loading
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [recentSuspiciousTransactions, setRecentSuspiciousTransactions] =
    useState<ApiTransaction[]>([]);
  const [topDusters, setTopDusters] = useState<any[]>([]);
  const [volumeChartData, setVolumeChartData] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [allTransactions, setAllTransactions] = useState<ApiTransaction[]>([]);
  const [paginationMetadata, setPaginationMetadata] =
    useState<PaginationMetadata | null>(null);

  // Function to fetch overview data
  const fetchOverviewData = async () => {
    try {
      // Use lavinth's endpoint for materialized view data
      const response = await fetch("https://lavinth.ddns.net/api/overview");

      if (!response.ok) {
        throw new Error("Failed to fetch overview data");
      }

      const result = await response.json();
      if (result.status === "success") {
        // Extract materialized view data if available
        const attackerPatterns = result.data.attackerPatterns || [];
        const victimExposure = result.data.victimExposure || [];
        const dailySummary = result.data.dailySummary || [];
        
        // Create DashboardData object from the overview API data using the updated processDashboardData function
        const transactions = result.data.recentTransactions || [];
        const dashboardData = processDashboardData(transactions, attackerPatterns, victimExposure, dailySummary);
        
        setDashboardData(dashboardData);
      } else {
        // Fallback to basic dashboard data without materialized views
        setDashboardData({
          activeTransactions: result.data.totalTransactions || 0,
          successfulTransactions: result.data.successfulTransactions || 0,
          failedTransactions: result.data.failedTransactions || 0,
          totalVolume: result.data.volume || 0,
          averageTransactionSize:
            result.data.volume > 0 && result.data.totalTransactions > 0
              ? result.data.volume / result.data.totalTransactions
              : 0,
          potentialDustCount: result.data.dustedTransactions || 0,
          poisoningAttempts: result.data.poisonedTransactions || 0,
          dustingSources: result.data.dustingSources || 0, // Use dustingSources directly instead of suspiciousWallets
          pendingTransactions: 0,
          transactionsOverTime: [],
          // Add data from materialized views if available
          attackerPatterns: result.data.attackerPatterns || [],
          victimExposure: result.data.victimExposure || [],
          dailySummary: result.data.dailySummary || []
        });
      }
    } catch (err) {
      console.error("Error fetching overview data:", err);
      // Continue with other data fetching, don't set error here
    }
  };

  // Function to fetch paginated transaction data
  const fetchPaginatedTransactions = async () => {
    try {
      setIsTableLoading(true); // Set table loading state to true
      const offset = (currentPage - 1) * pageSize;
      const response = await fetch(
        `https://lavinth.ddns.net/api/dust-transactions?limit=${pageSize}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transaction data");
      }

      const apiResponse = (await response.json()) as ApiResponse;
      const transactions = apiResponse.data;

      // Store pagination metadata
      if (apiResponse.pagination) {
        setPaginationMetadata(apiResponse.pagination);
        setTotalPages(apiResponse.pagination.totalPages);
        setTotalItems(apiResponse.pagination.total);
        setCurrentPage(apiResponse.pagination.currentPage);
      }

      setAllTransactions(transactions);

      // Get suspicious transactions (those with dust or poisoning flags)
      const suspiciousTxs = transactions
        .filter((tx) => tx.is_potential_dust || tx.is_potential_poisoning)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5); // Get only the 5 most recent

      setRecentSuspiciousTransactions(suspiciousTxs);

      // Extract top dusters - wallets that send many small transactions
      // Try to use the attacker_pattern_summary materialized view if available
      if (dashboardData?.attackerPatterns && dashboardData.attackerPatterns.length > 0) {
        // Use the materialized view data if available
        setTopDusters(dashboardData.attackerPatterns.slice(0, 5).map(attacker => ({
          address: attacker.address,
          smallTransfersCount: attacker.small_transfers_count || 0,
          uniqueRecipients: attacker.unique_victims_count || 0,
          regularityScore: attacker.regularity_score || 0,
          centralityScore: attacker.centrality_score || 0,
          usesScripts: attacker.uses_scripts || false
        })));
      } else {
        // Fall back to calculating from transactions if materialized view data isn't available
        const dusters = getTopDustersFromApi(transactions);
        setTopDusters(dusters);
      }

      // Generate chart data
      // Try to use the dust_attack_daily_summary materialized view if available
      if (dashboardData?.dailySummary && dashboardData.dailySummary.length > 0) {
        // Use the materialized view data for charts
        const formattedChartData = dashboardData.dailySummary.map(summary => ({
          date: summary.day,
          volume: summary.avg_dust_amount * summary.total_dust_transactions,
          count: summary.total_dust_transactions,
          uniqueAttackers: summary.unique_attackers,
          uniqueVictims: summary.unique_victims
        }));
        setVolumeChartData(formattedChartData);
      } else {
        // Fall back to calculating from transactions
        const chartData = generateVolumeChartData(transactions);
        setVolumeChartData(chartData);
      }

      setIsTableLoading(false); // Set table loading state to false when done
    } catch (err) {
      console.error("Error fetching paginated transactions:", err);
      setError("Failed to load transaction data. Please try again later.");
      setIsTableLoading(false); // Set loading to false on error too
    }
  };

  useEffect(() => {
    // Fetch and process data
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First get the overview data (dashboard metrics)
        await fetchOverviewData();

        // Then get the paginated transaction data
        await fetchPaginatedTransactions();

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Only fetch all data on initial load

  // Update only transaction data when pagination changes
  useEffect(() => {
    if (!isLoading) {
      // Only fetch pagination data after initial load
      fetchPaginatedTransactions();
    }
  }, [currentPage, pageSize]);

  // Extract top dusters from API data
  const getTopDustersFromApi = (transactions: ApiTransaction[]) => {
    // Consider a transaction as small if it might be dust
    const smallTransactions = transactions.filter((tx) => tx.is_potential_dust);

    // Group by sender
    const senderGroups = smallTransactions.reduce(
      (acc: Record<string, any>, tx) => {
        const sender = tx.sender;
        if (!sender) return acc;

        if (!acc[sender]) {
          acc[sender] = {
            address: sender,
            smallTransfersCount: 0,
            uniqueRecipients: new Set(),
          };
        }

        acc[sender].smallTransfersCount++;
        if (tx.recipient) {
          acc[sender].uniqueRecipients.add(tx.recipient);
        }

        return acc;
      },
      {}
    );

    // Convert to array and sort by transfer count
    return Object.values(senderGroups)
      .map((duster: any) => ({
        ...duster,
        uniqueRecipients: Array.from(duster.uniqueRecipients),
      }))
      .sort((a: any, b: any) => b.smallTransfersCount - a.smallTransfersCount)
      .slice(0, 5); // Get top 5
  };

  // Function to generate volume chart data
  const generateVolumeChartData = (transactions: ApiTransaction[]) => {
    // Filter transactions with valid timestamps and amounts
    const validTransactions = transactions.filter(
      (tx) => tx.timestamp && (tx.amount || tx.amount === "0")
    );

    // Group transactions by date
    const txByDate = validTransactions.reduce(
      (acc: Record<string, any>, tx) => {
        // Format date from timestamp
        const date = new Date(tx.timestamp).toISOString().split("T")[0];

        if (!acc[date]) {
          acc[date] = {
            date,
            volume: 0,
            count: 0,
            successful: 0,
            failed: 0,
          };
        }

        // Parse amount safely and add to volume
        const amount = parseFloat(tx.amount || "0");
        acc[date].volume += isNaN(amount) ? 0 : amount;
        acc[date].count += 1;

        // Track successful/failed transactions
        if (tx.success) {
          acc[date].successful += 1;
        } else {
          acc[date].failed += 1;
        }

        return acc;
      },
      {}
    );

    // Convert to array and sort by date
    return Object.values(txByDate).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Function to navigate to all suspicious transactions
  const viewAllSuspiciousTransactions = () => {
    router.push("/dashboard/transactions/suspicious");
  };

  // Pagination controls
  const handlePreviousPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const goToFirstPage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const goToLastPage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage(totalPages);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading Dashboard Data...</h2>
          <Progress value={45} className="w-80 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 text-cyan-300">
      <h1 className="text-3xl font-bold text-cyan-200 mb-6">
        Blockchain Security Dashboard
      </h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="dusting">Dusting Analysis</TabsTrigger>
          <TabsTrigger value="poisoning">Poisoning Detection</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Transactions"
              value={dashboardData?.activeTransactions || 0}
              icon={<Activity className="h-8 w-8 text-blue-500" />}
              trend="up"
            />
            <StatsCard
              title="Successful Transactions"
              value={dashboardData?.successfulTransactions || 0}
              icon={<ArrowUpRight className="h-8 w-8 text-green-500" />}
              trend="up"
            />
            <StatsCard
              title="Failed Transactions"
              value={dashboardData?.failedTransactions || 0}
              icon={<ArrowDownRight className="h-8 w-8 text-red-500" />}
              trend="down"
            />
            <StatsCard
              title="Volume (SOL)"
              value={dashboardData?.totalVolume || 0}
              valueFormatter={formatNumber}
              icon={<DollarSign className="h-8 w-8 text-yellow-500" />}
              trend="up"
            />
          </div>

          {/* Security Stats - Now showing 3 cards in 2 columns grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SecurityCard
              title="Dust Transactions"
              value={dashboardData?.potentialDustCount || 0}
              description="Potential dust transactions detected"
              severity="medium"
              icon={<WalletIcon className="h-6 w-6" />}
            />
            <SecurityCard
              title="Poisoning Attempts"
              value={dashboardData?.poisoningAttempts || 0}
              description="Potential address poisoning attempts"
              severity="high"
              icon={<AlertTriangle className="h-6 w-6" />}
            />
            <SecurityCard
              title="Dusting Sources"
              value={dashboardData?.dustingSources || 0}
              description="Wallets sending dust transactions"
              severity="medium"
              icon={<Shield className="h-6 w-6" />}
            />
          </div>

          {/* View Suspicious Transactions Button */}
          <div className="flex justify-center">
            <Button
              variant="default"
              onClick={viewAllSuspiciousTransactions}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              View Suspicious Transactions
            </Button>
          </div>
        </TabsContent>

        {/* Transactions Tab - Updated with Paginated Table */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold text-cyan-200">
                Transaction Summary
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col space-y-1">
                  <span className="text-muted-foreground text-sm">
                    Total Volume
                  </span>
                  <span className="text-2xl font-bold">
                    {formatNumber(dashboardData?.totalVolume || 0)} SOL
                  </span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-muted-foreground text-sm">
                    Avg Transaction Size
                  </span>
                  <span className="text-2xl font-bold">
                    {formatNumber(dashboardData?.averageTransactionSize || 0)}{" "}
                    SOL
                  </span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-muted-foreground text-sm">
                    Success Rate
                  </span>
                  <span className="text-2xl font-bold">
                    {dashboardData && dashboardData.activeTransactions > 0
                      ? (
                          (dashboardData.successfulTransactions /
                            dashboardData.activeTransactions) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              {/* <div className="h-64 rounded-md mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={volumeChartData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorVolume"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0ea5e9"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0ea5e9"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8" }}
                      tickLine={{ stroke: "#94a3b8" }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8" }}
                      tickLine={{ stroke: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#475569",
                        color: "#e2e8f0",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#0ea5e9"
                      fillOpacity={1}
                      fill="url(#colorVolume)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div> */}

              <h4 className="text-lg font-semibold text-cyan-200 mb-4">
                Transaction Success vs Failure
              </h4>
              <div className="h-64 rounded-md">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={[
                      { day: "Mon", success: 120, failure: 15 },
                      { day: "Tue", success: 180, failure: 20 },
                      { day: "Wed", success: 200, failure: 25 },
                      { day: "Thu", success: 250, failure: 30 },
                      { day: "Fri", success: 300, failure: 28 },
                      { day: "Sat", success: 280, failure: 22 },
                      { day: "Sun", success: 220, failure: 18 },
                    ]}
                    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fill: "#94a3b8" }} />
                    <YAxis tick={{ fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#475569",
                        color: "#e2e8f0",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="success"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="failure"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: "#ef4444" }}
                      activeDot={{ r: 6 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* New Paginated Transactions Table */}
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold">All Transactions</h3>
              <h3 className="text-lg font-semibold text-cyan-200">
                Recent Suspicious Activity
              </h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {isTableLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="text-center">
                      <Progress value={45} className="w-60 mx-auto" />
                      <p className="text-sm text-muted-foreground mt-3">
                        Loading transactions...
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Signature</th>
                        <th className="py-2 text-left">Timestamp</th>
                        <th className="py-2 text-left">From</th>
                        <th className="py-2 text-left">To</th>
                        <th className="py-2 text-left">Amount</th>
                        <th className="py-2 text-left">Type</th>
                        <th className="py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransactions.length > 0 ? (
                        allTransactions.map((tx, idx) => (
                          <tr
                            key={tx.id}
                            className={
                              idx % 2 === 0 ? "bg-gray-50 text-black" : ""
                            }
                          >
                            <td className="py-2">
                              {tx.signature
                                ? tx.signature.substring(0, 8) + "..."
                                : "N/A"}
                            </td>
                            <td className="py-2">
                              {new Date(tx.timestamp).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {tx.sender
                                ? tx.sender.substring(0, 6) + "..."
                                : "N/A"}
                            </td>
                            <td className="py-2">
                              {tx.recipient
                                ? tx.recipient.substring(0, 6) + "..."
                                : "N/A"}
                            </td>
                            <td className="py-2">
                              {tx.amount} {tx.token_type || "SOL"}
                            </td>
                            <td className="py-2">
                              {tx.is_potential_dust ? (
                                <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                                  Dust
                                </span>
                              ) : tx.is_potential_poisoning ? (
                                <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs">
                                  Poisoning
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">
                                  Normal
                                </span>
                              )}
                            </td>
                            <td className="py-2">
                              {tx.success ? (
                                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                                  Success
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs">
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center">
                            <p className="text-muted-foreground">
                              No transactions found
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {paginationMetadata
                    ? (paginationMetadata.currentPage - 1) *
                        paginationMetadata.limit +
                      1
                    : 0}{" "}
                  to{" "}
                  {paginationMetadata
                    ? Math.min(
                        paginationMetadata.currentPage *
                          paginationMetadata.limit,
                        paginationMetadata.total
                      )
                    : 0}{" "}
                  of {paginationMetadata?.total || 0} results
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {/* Same pagination buttons but with disabled state while loading */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToFirstPage}
                      disabled={currentPage === 1 || isTableLoading}
                      type="button"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1 || isTableLoading}
                      type="button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages || isTableLoading}
                      type="button"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages || isTableLoading}
                      type="button"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <select
                    className="h-8 bg-background border rounded text-sm px-2"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={isTableLoading}
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>
              {/* {recentSuspiciousTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentSuspiciousTransactions.map((tx, idx) => (
                    <TweetCard key={idx} transaction={tx} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No suspicious transactions found
                  </p>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={viewAllSuspiciousTransactions}
                >
                  View All
                </Button>
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dusting Analysis Tab */}
        <TabsContent value="dusting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dusting Stats */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-cyan-200">
                  Dusting Analysis
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Transactions
                    </span>
                    <span className="font-medium">
                      {dashboardData?.activeTransactions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Dust Transactions
                    </span>
                    <span className="font-medium">
                      {dashboardData?.potentialDustCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Dust Threshold
                    </span>
                    <span className="font-medium">0.001 SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Potential Dusters
                    </span>
                    <span className="font-medium">{topDusters.length}</span>
                  </div>

                  <div className="pt-2">
                    <div className="text-sm font-medium mb-1">
                      Dust Transaction Ratio
                    </div>
                    <Progress
                      value={
                        dashboardData?.activeTransactions
                          ? (dashboardData.potentialDustCount /
                              dashboardData.activeTransactions) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {dashboardData?.activeTransactions
                        ? (
                            (dashboardData.potentialDustCount /
                              dashboardData.activeTransactions) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Dusters */}
            <Card>
              <CardHeader className="pb-2">
                <h3 className="text-lg font-semibold text-cyan-200">
                  Top Dusting Wallets
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topDusters.length > 0 ? (
                    topDusters.map((duster, idx) => (
                      <div key={idx} className="flex items-center space-x-4">
                        <div className="bg-muted rounded-full p-2">
                          <WalletIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium truncate max-w-[150px]">
                              {duster.address.substring(0, 6) + "..."}
                            </span>
                            <span className="text-yellow-600 font-medium">
                              {duster.smallTransfersCount} transfers
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {duster.uniqueRecipients.length} unique recipients
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">
                        No dust senders identified
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm">
                    View All Dusters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Poisoning Detection Tab */}
        <TabsContent value="poisoning" className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-cyan-200">
                Poisoning Detection
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-cyan-300">
                  Coming Soon: Address Poisoning Analysis
                </h3>
                <p className="text-cyan-200 max-w-md mx-auto mb-6">
                  Our advanced poisoning detection module is currently under
                  development. Soon you'll be able to detect potential address
                  poisoning attacks by analyzing transaction patterns and
                  identifying similar addresses used in suspicious transactions.
                </p>
                <div className="flex justify-center items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
                  <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-75"></div>
                  <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-150"></div>
                </div>
                <p className="text-xs text-cyan-400 mt-4">
                  Expected launch: June 2025
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-cyan-200">
                Security Alerts
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <Clock className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                <h3 className="text-lg font-medium mb-2 text-cyan-300">
                  Coming Soon: Real-time Alerts
                </h3>
                <p className="text-cyan-200 max-w-md mx-auto mb-6">
                  Our real-time alert system is in the final stages of
                  development. Soon you'll be able to configure and monitor
                  security alerts for dusting attacks, poisoning attempts, and
                  other suspicious blockchain activity.
                </p>
                <div className="flex justify-center items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-75"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
                </div>
                <p className="text-xs text-cyan-400 mt-4">
                  Expected launch: May 2025
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
