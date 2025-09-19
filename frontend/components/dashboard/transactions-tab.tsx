import { DashboardData } from "@/app/types/transactions";
import { formatNumber } from "@/app/utils/dataProcessing";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  ExternalLink,
  Shield,
  ShieldAlert,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Activity
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
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
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatAddress = (address: string | undefined, length: number = 8) => {
    if (!address) return "N/A";
    return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
  };

  const getRiskColor = (isDust: boolean, isPoisoning: boolean) => {
    if (isDust && isPoisoning) return "destructive";
    if (isPoisoning) return "destructive";
    if (isDust) return "secondary";
    return "outline";
  };

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

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
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
              <AreaChart
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
                <defs>
                  {/* Line gradients */}
                  <linearGradient id="successLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="50%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="failureLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="50%" stopColor="#f87171" stopOpacity={1} />
                    <stop offset="100%" stopColor="#fca5a5" stopOpacity={1} />
                  </linearGradient>
                  
                  {/* Area fill gradients */}
                  <linearGradient id="successAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="failureAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.05} />
                  </linearGradient>
                  
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="success"
                  name="Successful Transactions"
                  stroke="url(#successLineGradient)"
                  fill="url(#successAreaGradient)"
                  strokeWidth={3}
                  dot={{ 
                    r: 5, 
                    strokeWidth: 2, 
                    fill: "#10b981",
                    stroke: "#34d399",
                    filter: "url(#glow)"
                  }}
                  activeDot={{ 
                    r: 7, 
                    fill: "#10b981",
                    stroke: "#34d399",
                    strokeWidth: 3,
                    filter: "url(#glow)"
                  }}
                  filter="url(#glow)"
                />
                <Area
                  type="monotone"
                  dataKey="failure"
                  name="Failed Transactions"
                  stroke="url(#failureLineGradient)"
                  fill="url(#failureAreaGradient)"
                  strokeWidth={3}
                  dot={{ 
                    r: 5, 
                    strokeWidth: 2, 
                    fill: "#ef4444",
                    stroke: "#f87171",
                    filter: "url(#glow)"
                  }}
                  activeDot={{ 
                    r: 7, 
                    fill: "#ef4444",
                    stroke: "#f87171",
                    strokeWidth: 3,
                    filter: "url(#glow)"
                  }}
                  filter="url(#glow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                <span>All Transactions</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time transaction monitoring and analysis
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TooltipProvider>
            <div className="overflow-hidden">
              {isTableLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                      <div className="absolute inset-0 w-8 h-8 border-2 border-primary/40 border-t-transparent rounded-full animate-spin m-auto"></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Loading transactions...</p>
                      <p className="text-sm text-muted-foreground">Fetching latest blockchain data</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">Transaction</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">Time</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <span className="font-semibold text-sm">From</span>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <span className="font-semibold text-sm">To</span>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">Amount</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <span className="font-semibold text-sm">Type</span>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <span className="font-semibold text-sm">Status</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allTransactions.length > 0 ? (
                        allTransactions.map((tx, idx) => (
                          <tr
                            key={tx.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                        {formatAddress(tx.signature)}
                                      </code>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-mono text-xs">{tx.signature}</p>
                                    </TooltipContent>
                                  </UITooltip>
                                </div>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                    onClick={() => copyToClipboard(tx.signature || "")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                    onClick={() => window.open(`https://solscan.io/tx/${tx.signature}`, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {new Date(tx.timestamp).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(tx.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                    {formatAddress(tx.sender, 6)}
                                  </code>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono text-xs">{tx.sender}</p>
                                </TooltipContent>
                              </UITooltip>
                            </td>
                            <td className="px-6 py-4">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                    {formatAddress(tx.recipient, 6)}
                                  </code>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono text-xs">{tx.recipient}</p>
                                </TooltipContent>
                              </UITooltip>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm font-medium">{tx.amount}</span>
                                <Badge variant="outline" className="text-xs">
                                  {tx.token_type || "SOL"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {tx.is_potential_dust && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Dust
                                  </Badge>
                                )}
                                {tx.is_potential_poisoning && (
                                  <Badge variant="destructive" className="text-xs">
                                    <ShieldAlert className="h-3 w-3 mr-1" />
                                    Poisoning
                                  </Badge>
                                )}
                                {!tx.is_potential_dust && !tx.is_potential_poisoning && (
                                  <Badge variant="outline" className="text-xs">
                                    Normal
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={tx.success ? "default" : "destructive"}>
                                {tx.success ? "Success" : "Failed"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <Activity className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-lg font-semibold">No transactions found</p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  No transactions available at the moment. Check back later for updates.
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TooltipProvider>

          {/* Enhanced Pagination Controls */}
          <div className="border-t bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Select
                  value={pageSize.toString()}
                  onValueChange={handlePageSizeChange}
                  disabled={isTableLoading}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {paginationMetadata
                    ? (paginationMetadata.currentPage - 1) * paginationMetadata.limit + 1
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
              </div>

              <div className="flex items-center space-x-2">
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

                <div className="flex items-center space-x-2 px-3">
                  <span className="text-sm font-medium">Page</span>
                  <span className="text-sm font-bold">{currentPage}</span>
                  <span className="text-sm text-muted-foreground">of</span>
                  <span className="text-sm font-bold">{totalPages}</span>
                </div>

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
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
