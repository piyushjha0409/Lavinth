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
import { AlertTriangle, ArrowLeft } from "lucide-react";
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

  // Function to fetch transaction data with pagination
  const fetchTransactions = async (page: number, pageSize: number) => {
    setIsTableLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * pageSize;

      // Build API endpoint based on filter type
      let endpoint;

      if (filterType === "dust") {
        endpoint = `http://localhost:3001/api/dust-transactions/potential-dust?limit=${pageSize}&offset=${offset}`;
      } else if (filterType === "poisoning") {
        endpoint = `http://localhost:3001/api/dust-transactions/potential-poisoning?limit=${pageSize}&offset=${offset}`;
      } else if (filterType === "attackers") {
        endpoint = `http://localhost:3001/api/dusting-attackers?limit=${pageSize}&offset=${offset}`;
      } else if (filterType === "victims") {
        endpoint = `http://localhost:3001/api/dusting-victims?limit=${pageSize}&offset=${offset}`;
      } else {
        // For 'all', we need to fetch both dust and poisoning transactions and combine them
        const dustEndpoint = `http://localhost:3001/api/dust-transactions/potential-dust?limit=${pageSize}&offset=${offset}`;
        const poisoningEndpoint = `http://localhost:3001/api/dust-transactions/potential-poisoning?limit=${pageSize}&offset=${offset}`;

        const [dustResponse, poisoningResponse] = await Promise.all([
          fetch(dustEndpoint),
          fetch(poisoningEndpoint),
        ]);

        if (!dustResponse.ok && !poisoningResponse.ok) {
          throw new Error("Failed to fetch transaction data");
        }

        // Process dust transactions
        const dustData = dustResponse.ok
          ? ((await dustResponse.json()) as ApiResponse)
          : { data: [], pagination: { total: 0, totalPages: 0 } };

        // Process poisoning transactions
        const poisoningData = poisoningResponse.ok
          ? ((await poisoningResponse.json()) as ApiResponse)
          : { data: [], pagination: { total: 0, totalPages: 0 } };

        // Combine data from both endpoints
        const combinedTransactions = [
          ...(dustData.data || []),
          ...(poisoningData.data || []),
        ];

        // Remove duplicates based on signature (some transactions might be both dust and poisoning)
        const uniqueTransactions = Array.from(
          new Map(combinedTransactions.map((tx) => [tx.signature, tx])).values()
        );

        // Sort by timestamp descending (most recent first) - client-side sorting only
        uniqueTransactions.sort(
          (a, b) =>
            new Date(b.timestamp || Date.now()).getTime() - new Date(a.timestamp || Date.now()).getTime()
        );

        // Slice to match the page size
        const paginatedTransactions = uniqueTransactions.slice(0, pageSize);

        setTransactions(paginatedTransactions);

        // Use the combined total for pagination estimation
        const totalItems =
          (dustData.pagination?.total || 0) +
          (poisoningData.pagination?.total || 0);

        setTotalItems(totalItems);

        // Calculate pages based on the estimated total
        const maxPages = Math.ceil(totalItems / pageSize);
        setTotalPages(maxPages || 1);
        setCurrentPage(page);

        setIsTableLoading(false);
        return;
      }

      // For single-type filters (dust or poisoning)
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Failed to fetch transaction data");
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
        <CardContent>
          <div className="overflow-x-auto" id="transactions-table">
            {isTableLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="text-center">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                    role="status"
                  >
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                      Loading...
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Loading transactions...
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {filterType === "attackers" ? (
                      <>
                        <th className="py-3 text-left font-medium">Address</th>
                        <th className="py-3 text-left font-medium">Risk Score</th>
                        <th className="py-3 text-left font-medium">Transfers</th>
                        <th className="py-3 text-left font-medium">Victims</th>
                        <th className="py-3 text-left font-medium">Regularity</th>
                        <th className="py-3 text-left font-medium">Centrality</th>
                        <th className="py-3 text-left font-medium">Last Updated</th>
                      </>
                    ) : filterType === "victims" ? (
                      <>
                        <th className="py-3 text-left font-medium">Address</th>
                        <th className="py-3 text-left font-medium">Risk Score</th>
                        <th className="py-3 text-left font-medium">Dust Txs</th>
                        <th className="py-3 text-left font-medium">Attackers</th>
                        <th className="py-3 text-left font-medium">Risk Exposure</th>
                        <th className="py-3 text-left font-medium">Wallet Activity</th>
                        <th className="py-3 text-left font-medium">Last Updated</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 text-left font-medium">Transaction ID</th>
                        <th className="py-3 text-left font-medium">Type</th>
                        <th className="py-3 text-left font-medium">From</th>
                        <th className="py-3 text-left font-medium">To</th>
                        <th className="py-3 text-left font-medium">Amount</th>
                        <th className="py-3 text-left font-medium">Status</th>
                        <th className="py-3 text-left font-medium">Time</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((tx, idx) => (
                      <tr
                        key={tx.id || idx}
                        className={`${
                          idx % 2 === 0 ? "bg-gray-50 text-black" : ""
                        } border-b`}
                      >
                        {filterType === "attackers" ? (
                          <>
                            <td className="py-3 font-mono">
                              {tx.address ? tx.address.substring(0, 8) + "..." : "N/A"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                parseFloat(tx.risk_score || '0') >= 0.7 ? "bg-red-100 text-red-800" : 
                                parseFloat(tx.risk_score || '0') >= 0.4 ? "bg-yellow-100 text-yellow-800" : 
                                "bg-green-100 text-green-800"
                              }`}>
                                {parseFloat(tx.risk_score || '0').toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3">{tx.small_transfers_count || 0}</td>
                            <td className="py-3">{tx.unique_victims_count || 0}</td>
                            <td className="py-3">{parseFloat(String(tx.regularity_score || 0)).toFixed(2)}</td>
                            <td className="py-3">{parseFloat(String(tx.centrality_score || 0)).toFixed(2)}</td>
                            <td className="py-3">
                              {tx.last_updated ? new Date(tx.last_updated).toLocaleString() : "Unknown"}
                            </td>
                          </>
                        ) : filterType === "victims" ? (
                          <>
                            <td className="py-3 font-mono">
                              {tx.address ? tx.address.substring(0, 8) + "..." : "N/A"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                parseFloat(tx.risk_score || '0') >= 0.7 ? "bg-red-100 text-red-800" : 
                                parseFloat(tx.risk_score || '0') >= 0.4 ? "bg-yellow-100 text-yellow-800" : 
                                "bg-green-100 text-green-800"
                              }`}>
                                {parseFloat(tx.risk_score || '0').toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3">{tx.dust_transactions_count || 0}</td>
                            <td className="py-3">{tx.unique_attackers_count || 0}</td>
                            <td className="py-3">{parseFloat(String(tx.risk_exposure || 0)).toFixed(2)}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                tx.wallet_activity === "high" ? "bg-green-100 text-green-800" : 
                                tx.wallet_activity === "medium" ? "bg-yellow-100 text-yellow-800" : 
                                "bg-red-100 text-red-800"
                              }`}>
                                {tx.wallet_activity || "low"}
                              </span>
                            </td>
                            <td className="py-3">
                              {tx.last_updated ? new Date(tx.last_updated).toLocaleString() : "Unknown"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 font-mono">
                              {tx.signature
                                ? tx.signature.substring(0, 8) + "..."
                                : "N/A"}
                            </td>
                            <td className="py-3">
                              {tx.is_potential_dust && tx.is_potential_poisoning ? (
                                <div className="flex flex-col gap-1">
                                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                                    Dust
                                  </span>
                                  <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs">
                                    Poisoning
                                  </span>
                                </div>
                              ) : tx.is_potential_dust ? (
                                <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                                  Dust
                                </span>
                              ) : tx.is_potential_poisoning ? (
                                <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs">
                                  Poisoning
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">
                                  Suspicious
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-mono">
                              {tx.sender
                                ? tx.sender.substring(0, 6) + "..."
                                : "N/A"}
                            </td>
                            <td className="py-3 font-mono">
                              {tx.recipient
                                ? tx.recipient.substring(0, 6) + "..."
                                : "N/A"}
                            </td>
                            <td className="py-3">
                              {tx.amount || 0} {tx.token_type || "SOL"}
                            </td>
                            <td className="py-3">
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
                            <td className="py-3">
                              {tx.timestamp
                                ? new Date(tx.timestamp).toLocaleString()
                                : "Unknown"}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-lg font-medium">
                            No transactions found
                          </p>
                          <p className="text-muted-foreground">
                            Try adjusting your filters or search query
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination controls */}
          {totalItems > 0 && (
            <div className="mt-6">
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
          )}
        </CardContent>
      </Card>

      {totalItems > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={exportToCSV}
          >
            Export Data
          </Button>
        </div>
      )}
    </div>
  );
}
