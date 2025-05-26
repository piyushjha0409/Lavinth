import { DashboardData } from "@/app/types/transactions";
import { formatNumber } from "@/app/utils/dataProcessing";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
        `https://api.lavinth.com/api/dust-transactions?limit=${pageSize}&offset=${offset}`
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
    <>
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
                {formatNumber(dashboardData?.averageTransactionSize || 0)} SOL
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

          <h4 className="text-lg font-semibold text-cyan-200 mb-4">
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
                        className={idx % 2 === 0 ? "bg-gray-50 text-black" : ""}
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
    </>
  );
}
