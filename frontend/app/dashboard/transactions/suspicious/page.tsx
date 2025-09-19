"use client";

import { Button } from "@/components/ui/button";
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
} from "@/components/ui/card";
import {
Pagination,
PaginationContent,
PaginationEllipsis,
PaginationItem,
PaginationLink,
PaginationNext,
PaginationPrevious,
} from "@/components/ui/pagination";
import {
Select,
SelectContent,
SelectGroup,
SelectItem,
SelectLabel,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
AlertTriangle, 
ArrowLeft, 
ArrowUpDown, 
Copy, 
ExternalLink, 
Shield, 
ShieldAlert, 
TrendingUp, 
Users, 
Zap,
Clock,
DollarSign
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Transaction type definition
interface ApiTransaction {
// Common properties
id: number;
signature?: string;
timestamp?: string;
slot?: string;
success?: boolean;
sender?: string;
recipient?: string;
amount?: string;
fee?: string;
token_type?: string;
token_address?: string | null;
is_potential_dust?: boolean;
is_potential_poisoning?: boolean;
risk_score?: string;
created_at?: string;

// Attacker properties
address?: string;
small_transfers_count?: number;
unique_victims_count?: number;
regularity_score?: number;
centrality_score?: number;
uses_scripts?: boolean;
last_updated?: string;

// Victim properties
dust_transactions_count?: number;
unique_attackers_count?: number;
risk_exposure?: number;
wallet_activity?: string;
asset_value?: string;
}

interface ApiResponse {
status: string;
count: number;
pagination?: {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
data: ApiTransaction[];
}

// Updated function component
export default function SuspiciousTransactionsPage() {
const router = useRouter();
const [isLoading, setIsLoading] = useState(true);
const [isTableLoading, setIsTableLoading] = useState(false);
const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
const [filterType, setFilterType] = useState<string>("all");
const [searchQuery, setSearchQuery] = useState<string>("");
const [error, setError] = useState<string | null>(null);

// Pagination state
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);
const [totalItems, setTotalItems] = useState(0);
const [totalPages, setTotalPages] = useState(1);

// Sorting state
const [sortField, setSortField] = useState<string>("");
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

const getRiskColor = (score: string | undefined) => {
  const numScore = parseFloat(score || '0');
  if (numScore >= 0.7) return "destructive";
  if (numScore >= 0.4) return "secondary";
  return "default";
};

const handleSort = (field: string) => {
  if (sortField === field) {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  } else {
    setSortField(field);
    setSortDirection("desc");
  }
};

// Function to fetch transaction data with pagination
const fetchTransactions = async (page: number, pageSize: number) => {
  setIsTableLoading(true);
  setError(null);

  try {
    const offset = (page - 1) * pageSize;

    // Call our internal API route
    const response = await fetch(
      `/api/transactions/suspicious?type=${filterType}&limit=${pageSize}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction data: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;

    setTransactions(data.data);

    // Update pagination information
    if (data.pagination) {
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.currentPage);
    } else {
      // Fallback if pagination metadata is not available
      setTotalItems(data.data.length);
      setTotalPages(1);
    }
  } catch (err) {
    console.error("Error fetching transaction data:", err);
    setError("Failed to load transaction data. Please try again later.");
    setTransactions([]);
  } finally {
    setIsTableLoading(false);
  }
};

// Initial data fetch
useEffect(() => {
  const loadInitialData = async () => {
    setIsLoading(true);
    await fetchTransactions(currentPage, itemsPerPage);
    setIsLoading(false);
  };

  loadInitialData();
}, []);

// Fetch data when filters or pagination changes
useEffect(() => {
  if (!isLoading) {
    fetchTransactions(currentPage, itemsPerPage);
  }
}, [filterType, searchQuery, currentPage, itemsPerPage]);

// Debounce search to prevent too many API calls
useEffect(() => {
  const handler = setTimeout(() => {
    if (!isLoading) {
      setCurrentPage(1); // Reset to first page on new search
      fetchTransactions(1, itemsPerPage);
    }
  }, 500);

  return () => {
    clearTimeout(handler);
  };
}, [searchQuery]);

// Function to export transaction data to CSV
const exportToCSV = () => {
  let headers: string[];
  let rows: any[][];
  let filename: string;

  if (filterType === "attackers") {
    // Define CSV headers for attackers
    headers = [
      "Address",
      "Risk Score",
      "Small Transfers Count",
      "Unique Victims Count",
      "Regularity Score",
      "Centrality Score",
      "Uses Scripts",
      "Last Updated",
    ];

    // Convert attacker data to CSV rows
    rows = transactions.map((tx) => [
      tx.address || "",
      tx.risk_score || 0,
      tx.small_transfers_count || 0,
      tx.unique_victims_count || 0,
      tx.regularity_score || 0,
      tx.centrality_score || 0,
      tx.uses_scripts ? "Yes" : "No",
      tx.last_updated ? new Date(tx.last_updated).toLocaleString() : "",
    ]);

    filename = `dusting_attackers_${new Date().toISOString().split("T")[0]}.csv`;
  } else if (filterType === "victims") {
    // Define CSV headers for victims
    headers = [
      "Address",
      "Risk Score",
      "Dust Transactions Count",
      "Unique Attackers Count",
      "Risk Exposure",
      "Wallet Activity",
      "Asset Value",
      "Last Updated",
    ];

    // Convert victim data to CSV rows
    rows = transactions.map((tx) => [
      tx.address || "",
      tx.risk_score || 0,
      tx.dust_transactions_count || 0,
      tx.unique_attackers_count || 0,
      tx.risk_exposure || 0,
      tx.wallet_activity || "low",
      tx.asset_value || "",
      tx.last_updated ? new Date(tx.last_updated).toLocaleString() : "",
    ]);

    filename = `dusting_victims_${new Date().toISOString().split("T")[0]}.csv`;
  } else {
    // Define CSV headers for transactions
    headers = [
      "Transaction ID",
      "Type",
      "From",
      "To",
      "Amount",
      "Token",
      "Status",
      "Time",
    ];

    // Convert transactions to CSV rows
    rows = transactions.map((tx) => [
      tx.signature || "",
      tx.is_potential_dust && tx.is_potential_poisoning
        ? "Dust & Poisoning"
        : tx.is_potential_dust
        ? "Dust"
        : tx.is_potential_poisoning
        ? "Poisoning"
        : "Suspicious",
      tx.sender || "",
      tx.recipient || "",
      tx.amount || 0,
      tx.token_type || "SOL",
      tx.success ? "Success" : "Failed",
      tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "",
    ]);

    filename = `suspicious_transactions_${new Date().toISOString().split("T")[0]}.csv`;
  }

  // Create CSV content
  const csvContent =
    headers.join(",") +
    "\n" +
    rows.map((row) => row.join(",")).join("\n");

  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });

  // Create a download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  // Append link to document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Handle page change
const handlePageChange = (page: number) => {
  // Ensure page is within valid range
  if (page >= 1 && page <= totalPages) {
    setCurrentPage(page);

    // Scroll to top of table for better UX
    const tableElement = document.getElementById("transactions-table");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
};

// Generate array of page numbers to show
const getPageNumbers = () => {
  const pages = [];
  const maxPagesToShow = 5;

  if (totalPages <= maxPagesToShow) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always include first and last pages
    pages.push(1);

    // Calculate middle range
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust if at edges
    if (currentPage <= 2) {
      endPage = 3;
    }
    if (currentPage >= totalPages - 1) {
      startPage = totalPages - 2;
    }

    // Add ellipsis if needed
    if (startPage > 2) {
      pages.push("ellipsis-start");
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      pages.push("ellipsis-end");
    }

    // Add last page if not already included
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }

  return pages;
};

if (isLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">
          Loading Suspicious Transactions...
        </h2>
      </div>
    </div>
  );
}

if (error && !isTableLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fetchTransactions(currentPage, itemsPerPage)}
        >
          Retry
        </Button>
      </div>
    </div>
  );
}

return (
  <div className="container mx-auto p-4 md:p-6">
    <div className="flex items-center mb-6">
      <Button
        variant="ghost"
        size="sm"
        className="mr-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Suspicious Transactions</h1>
        <p className="text-muted-foreground">
          Detailed view of all potentially malicious transactions
        </p>
      </div>
    </div>

    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>Transaction Filters</CardTitle>
        <CardDescription>
          Filter transactions by type and search for specific addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3">
            <Select
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value);
                setCurrentPage(1); // Reset to first page on filter change
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Transaction Type</SelectLabel>
                  <SelectItem value="all">All Suspicious</SelectItem>
                  <SelectItem value="dust">Dust Attacks Only</SelectItem>
                  <SelectItem value="poisoning">Poisoning Only</SelectItem>
                  <SelectItem value="attackers">Dusting Attackers</SelectItem>
                  <SelectItem value="victims">Dusting Victims</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {/* Remove search input since backend doesn't support search filtering */}
          <div className="w-full md:w-2/3">
            <div className="text-muted-foreground text-sm">
              Use the filter above to narrow down transactions by type.
              <br />
              Export data for detailed analysis.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <CardTitle>Suspicious Transactions</CardTitle>
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {transactions.length ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
            transactions
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <div className="overflow-hidden" id="transactions-table">
            {isTableLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 w-8 h-8 border-2 border-primary/40 border-t-transparent rounded-full animate-spin m-auto"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Loading transactions...</p>
                    <p className="text-sm text-muted-foreground">Analyzing suspicious activity</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {filterType === "attackers" ? (
                        <>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Address</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort("risk_score")}
                              className="flex items-center space-x-2 hover:text-primary transition-colors"
                            >
                              <TrendingUp className="h-4 w-4" />
                              <span className="font-semibold text-sm">Risk Score</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Zap className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Transfers</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Victims</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Regularity</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Centrality</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Last Updated</span>
                            </div>
                          </th>
                        </>
                      ) : filterType === "victims" ? (
                        <>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Address</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <button
                              onClick={() => handleSort("risk_score")}
                              className="flex items-center space-x-2 hover:text-primary transition-colors"
                            >
                              <TrendingUp className="h-4 w-4" />
                              <span className="font-semibold text-sm">Risk Score</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Dust Txs</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Attackers</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Risk Exposure</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Activity</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Last Updated</span>
                            </div>
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Transaction</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <span className="font-semibold text-sm">Type</span>
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
                            <span className="font-semibold text-sm">Status</span>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Time</span>
                            </div>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.length > 0 ? (
                      transactions.map((tx, idx) => (
                        <tr
                          key={tx.id || idx}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          {filterType === "attackers" ? (
                            <>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                          {formatAddress(tx.address)}
                                        </code>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-mono text-xs">{tx.address}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                    onClick={() => copyToClipboard(tx.address || "")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant={getRiskColor(tx.risk_score)} className="font-mono">
                                  {parseFloat(tx.risk_score || '0').toFixed(3)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                  <span className="font-medium">{tx.small_transfers_count || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  <span className="font-medium">{tx.unique_victims_count || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono">
                                  {parseFloat(String(tx.regularity_score || 0)).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono">
                                  {parseFloat(String(tx.centrality_score || 0)).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-muted-foreground">
                                  {tx.last_updated ? new Date(tx.last_updated).toLocaleDateString() : "Unknown"}
                                </div>
                              </td>
                            </>
                          ) : filterType === "victims" ? (
                            <>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                          {formatAddress(tx.address)}
                                        </code>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-mono text-xs">{tx.address}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                    onClick={() => copyToClipboard(tx.address || "")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant={getRiskColor(tx.risk_score)} className="font-mono">
                                  {parseFloat(tx.risk_score || '0').toFixed(3)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                  <span className="font-medium">{tx.dust_transactions_count || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  <span className="font-medium">{tx.unique_attackers_count || 0}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-mono">
                                  {parseFloat(String(tx.risk_exposure || 0)).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <Badge 
                                  variant={
                                    tx.wallet_activity === "high" ? "default" : 
                                    tx.wallet_activity === "medium" ? "secondary" : 
                                    "destructive"
                                  }
                                >
                                  {tx.wallet_activity || "low"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-muted-foreground">
                                  {tx.last_updated ? new Date(tx.last_updated).toLocaleDateString() : "Unknown"}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                          {formatAddress(tx.signature)}
                                        </code>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-mono text-xs">{tx.signature}</p>
                                      </TooltipContent>
                                    </Tooltip>
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
                                      Suspicious
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                      {formatAddress(tx.sender, 6)}
                                    </code>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-mono text-xs">{tx.sender}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="px-6 py-4">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                      {formatAddress(tx.recipient, 6)}
                                    </code>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-mono text-xs">{tx.recipient}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-sm">{tx.amount || 0}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {tx.token_type || "SOL"}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant={tx.success ? "default" : "destructive"}>
                                  {tx.success ? "Success" : "Failed"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-muted-foreground">
                                  {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Unknown"}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-lg font-semibold">No transactions found</p>
                              <p className="text-sm text-muted-foreground max-w-md">
                                No suspicious transactions match your current filters. Try adjusting your filter settings or check back later.
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

        {/* Pagination controls */}
        {totalItems > 0 && (
          <div className="border-t bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={
                        currentPage === 1 || isTableLoading
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {getPageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === "ellipsis-start" || page === "ellipsis-end" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => handlePageChange(page as number)}
                          className={
                            isTableLoading
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={
                        currentPage === totalPages || isTableLoading
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {totalItems > 0 && (
      <div className="mt-6 flex justify-between items-center">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Live Data</span>
          </div>
          <div>Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => fetchTransactions(currentPage, itemsPerPage)}
            disabled={isTableLoading}
          >
            {isTableLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={isTableLoading}
          >
            Export CSV
          </Button>
        </div>
      </div>
    )}
  </div>
);
}
