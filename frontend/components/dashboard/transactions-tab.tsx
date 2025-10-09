import { DashboardData } from "@/app/types/transactions";
import { formatNumber } from "@/app/utils/dataProcessing";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Activity,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

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

interface ApiResponse {
  status: string;
  count: number;
  pagination?: PaginationMetadata;
  data: ApiTransaction[];
}

interface PaginationMetadata {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function TransactionsTab({ dashboardData }: { dashboardData: DashboardData | null }) {
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<ApiTransaction[]>([]);
  const [paginationMetadata, setPaginationMetadata] =
    useState<PaginationMetadata | null>(null);

  const fetchPaginatedTransactions = async () => {
    try {
      setIsTableLoading(true); // Set table loading state to true
      const offset = (currentPage - 1) * pageSize;
      const response = await fetch(
        `/api/transactions?limit=${pageSize}&offset=${offset}`
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
        setCurrentPage(apiResponse.pagination.currentPage);
      }

      // Set transactions for the table display
      setAllTransactions(transactions);
      setIsTableLoading(false); // Set table loading state to false when done
    } catch (err) {
      console.error("Error fetching paginated transactions:", err);
      setIsTableLoading(false); // Set loading to false on error too
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when page size changes
  };

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

  const goToFirstPage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const goToLastPage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage(totalPages);
  };

  // Dashboard data is now received as a prop

  useEffect(() => {
    fetchPaginatedTransactions();
  }, [currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transaction Monitor</h2>
          <p className="text-muted-foreground">
            {paginationMetadata?.total 
              ? `${paginationMetadata.total.toLocaleString()} transactions monitored in real-time`
              : "Loading transaction data..."
            }
          </p>
        </div>
        <Button variant="outline" onClick={fetchPaginatedTransactions} disabled={isTableLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isTableLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Transaction Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Transaction Overview
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col space-y-2 p-4 bg-blue-50 rounded-lg">
              <span className="text-muted-foreground text-sm font-medium">
                Total Volume
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {formatNumber(dashboardData?.totalVolume || 0)} SOL
              </span>
            </div>
            <div className="flex flex-col space-y-2 p-4 bg-green-50 rounded-lg">
              <span className="text-muted-foreground text-sm font-medium">
                Avg Transaction Size
              </span>
              <span className="text-2xl font-bold text-green-600">
                {formatNumber(dashboardData?.averageTransactionSize || 0)} SOL
              </span>
            </div>
            <div className="flex flex-col space-y-2 p-4 bg-purple-50 rounded-lg">
              <span className="text-muted-foreground text-sm font-medium">
                Success Rate
              </span>
              <span className="text-2xl font-bold text-purple-600">
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

          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Transaction Success vs Failure
          </h4>
          <div className="h-64 rounded-md">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={
                  dashboardData?.dailySummary
                    ?.map((day) => {
                      const totalTx =
                        day.total_transactions ||
                        day.total_dust_transactions ||
                        0;
                      return {
                        day: new Date(day.day).toLocaleDateString("en-US", {
                          weekday: "short",
                        }),
                        success: day.total_dust_transactions,
                        failure: totalTx - day.total_dust_transactions,
                      };
                    })
                    .slice(0, 7)
                    .reverse() || []
                }
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
                  name="Successful Transactions"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "#10b981" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="failure"
                  name="Failed Transactions"
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

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Transaction Activity
          </h3>
          <p className="text-sm text-muted-foreground">
            {paginationMetadata ? `Showing ${allTransactions.length} of ${paginationMetadata.total} transactions` : 'Loading...'}
          </p>
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
              <div className="space-y-3">
                {allTransactions.length > 0 ? (
                  allTransactions.map((tx, idx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {tx.is_potential_dust ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              Dust
                            </Badge>
                          ) : tx.is_potential_poisoning ? (
                            <Badge variant="destructive">
                              Poisoning
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Normal
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Transaction</p>
                            <p className="font-mono text-sm font-medium">
                              {tx.signature ? tx.signature.substring(0, 12) + "..." : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">From → To</p>
                            <p className="font-mono text-sm">
                              {tx.sender ? tx.sender.substring(0, 6) + "..." : "N/A"} → {tx.recipient ? tx.recipient.substring(0, 6) + "..." : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="text-sm font-semibold">
                              {parseFloat(tx.amount).toFixed(6)} {tx.token_type || "SOL"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Time</p>
                            <p className="text-sm">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Risk Score</p>
                          <p className="text-sm font-bold">
                            {(parseFloat(tx.risk_score) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <Badge variant={tx.success ? "default" : "destructive"} className="text-xs">
                          {tx.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No transactions found
                    </p>
                  </div>
                )}
              </div>
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
                    paginationMetadata.currentPage * paginationMetadata.limit,
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
        </CardContent>
      </Card>
    </div>
  );
}
