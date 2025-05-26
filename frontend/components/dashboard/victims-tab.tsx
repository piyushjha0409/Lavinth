import { formatAddress } from "@/app/utils/dataProcessing";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
} from "lucide-react";
import { useState } from "react";
import { StatsCard } from "./overview-tab";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";

interface PaginationMetadata {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface DustingVictim {
  id: number;
  address: string;
  dust_transactions_count: number;
  unique_attackers_count: number;
  unique_attackers: string[];
  timestamps: number[];
  risk_score: number;
  wallet_age_days: number | null;
  wallet_value_estimate: number | null;
  time_patterns: any;
  vulnerability_assessment: {
    walletActivity: string;
    assetValue: string;
    previousInteractions: boolean;
    riskExposure: number;
  };
  ml_features: any;
  ml_prediction: any;
  last_updated: string;
}

export default function VictimsTab() {
  const [isVictimsLoading, setIsVictimsLoading] = useState(false);
  const [victimsError, setVictimsError] = useState<string | null>(null);
  const [victimsPage, setVictimsPage] = useState(1);
  const [victimsPageSize, setVictimsPageSize] = useState(10);
  const [victimsTotalPages, setVictimsTotalPages] = useState(1);
  const [victimsTotalItems, setVictimsTotalItems] = useState(0);
  const [victimsPaginationMetadata, setVictimsPaginationMetadata] =
    useState<PaginationMetadata | null>(null);
  const [dustingVictims, setDustingVictims] = useState<DustingVictim[]>([]);

  const fetchDustingVictims = async () => {
    try {
      setIsVictimsLoading(true);
      setVictimsError(null);

      const offset = (victimsPage - 1) * victimsPageSize;
      const response = await fetch(
        `https://api.lavinth.com/api/dusting-victims?limit=${victimsPageSize}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dusting victims data");
      }

      const apiResponse = await response.json();
      const victims = apiResponse.data;

      // Store pagination metadata
      if (apiResponse.pagination) {
        setVictimsPaginationMetadata(apiResponse.pagination);
        setVictimsTotalPages(apiResponse.pagination.totalPages);
        setVictimsTotalItems(apiResponse.pagination.total);
        setVictimsPage(apiResponse.pagination.currentPage);
      }

      setDustingVictims(victims);
      setIsVictimsLoading(false);
    } catch (err) {
      console.error("Error fetching dusting victims:", err);
      setVictimsError(
        "Failed to load dusting victims data. Please try again later."
      );
      setIsVictimsLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-cyan-200">Dusting Victims</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {victimsTotalItems > 0 &&
              `Showing ${victimsPage} of ${victimsTotalPages} pages (${victimsTotalItems} total)`}
          </span>
        </div>
      </div>

      {isVictimsLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <h2 className="text-lg font-medium mb-2">
              Loading Dusting Victims...
            </h2>
            <Progress value={45} className="w-60 mx-auto" />
          </div>
        </div>
      ) : victimsError ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h2 className="text-lg font-medium mb-2">Error Loading Data</h2>
            <p className="text-muted-foreground">{victimsError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fetchDustingVictims()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : dustingVictims.length === 0 ? (
        <div className="flex items-center justify-center py-10 border border-dashed rounded-lg">
          <div className="text-center">
            <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h2 className="text-lg font-medium mb-2">
              No Dusting Victims Found
            </h2>
            <p className="text-muted-foreground">
              No dusting victims have been identified in the database yet.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Victims Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatsCard
              title="Total Victims"
              value={victimsTotalItems}
              icon={<User className="h-8 w-8 text-blue-500" />}
              trend="neutral"
            />
            <StatsCard
              title="Avg Dust Transactions"
              value={
                dustingVictims.reduce(
                  (sum, v) => sum + v.dust_transactions_count,
                  0
                ) / (dustingVictims.length || 1)
              }
              valueFormatter={(val) => val.toFixed(1)}
              icon={<Activity className="h-8 w-8 text-purple-500" />}
              trend="neutral"
            />
            <StatsCard
              title="Avg Risk Score"
              value={
                dustingVictims.reduce(
                  (sum, v) => sum + Number(v.risk_score),
                  0
                ) / (dustingVictims.length || 1)
              }
              valueFormatter={(val) => (val * 100).toFixed(1) + "%"}
              icon={<AlertTriangle className="h-8 w-8 text-yellow-500" />}
              trend="neutral"
            />
          </div>

          {/* Victims Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left font-medium text-cyan-300">
                        Address
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Risk Score
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Dust Txs
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Unique Attackers
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dustingVictims.map((victim) => (
                      <tr
                        key={victim.id}
                        className="border-b border-gray-800 hover:bg-gray-900/50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {formatAddress(victim.address)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `rgba(${Math.round(
                                255 * victim.risk_score
                              )}, ${Math.round(
                                255 * (1 - victim.risk_score)
                              )}, 0, 0.2)`,
                              color: `rgb(${Math.round(
                                255 * victim.risk_score
                              )}, ${Math.round(
                                255 * (1 - victim.risk_score)
                              )}, 0)`,
                            }}
                          >
                            {(victim.risk_score * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {victim.dust_transactions_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {victim.unique_attackers_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {new Date(victim.last_updated).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <select
                value={victimsPageSize}
                onChange={(e) => {
                  setVictimsPageSize(Number(e.target.value));
                  setVictimsPage(1);
                }}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <span className="text-sm text-muted-foreground">
                Showing {dustingVictims.length} of {victimsTotalItems} victims
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVictimsPage(1)}
                disabled={victimsPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVictimsPage(victimsPage - 1)}
                disabled={victimsPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {victimsPage} of {victimsTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVictimsPage(victimsPage + 1)}
                disabled={victimsPage === victimsTotalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVictimsPage(victimsTotalPages)}
                disabled={victimsPage === victimsTotalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
