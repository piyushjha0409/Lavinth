import { formatAddress } from "@/app/utils/dataProcessing";
import {
  AlertTriangle,
  WalletIcon,
  Activity,
  Eye,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import router from "next/router";
import { StatsCard } from "./overview-tab";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { useState } from "react";

interface DustingAttacker {
  id: number;
  address: string;
  small_transfers_count: number;
  unique_victims_count: number;
  unique_victims: string[];
  timestamps: number[];
  risk_score: number;
  wallet_age_days: number | null;
  total_transaction_volume: number | null;
  known_labels: string[] | null;
  related_addresses: string[] | null;
  previous_attack_patterns: any;
  time_patterns: any;
  temporal_pattern: {
    burstCount: number;
    averageTimeBetweenTransfers: number;
    regularityScore: number;
  };
  network_pattern: {
    clusterSize: number;
    centralityScore: number;
    recipientOverlap: number;
    betweennessCentrality: number;
  };
  behavioral_indicators: {
    usesNewAccounts: boolean;
    hasAbnormalFundingPattern: boolean;
    targetsPremiumWallets: boolean;
    usesScriptedTransactions: boolean;
  };
  ml_features: any;
  ml_prediction: any;
  last_updated: string;
}

export default function AttackersTab() {
  const [isAttackersLoading, setIsAttackersLoading] = useState(false);
  const [attackersError, setAttackersError] = useState<string | null>(null);
  const [attackersPage, setAttackersPage] = useState(1);
  const [attackersPageSize, setAttackersPageSize] = useState(10);
  const [attackersTotalItems, setAttackersTotalItems] = useState(0);
  const [attackersTotalPages, setAttackersTotalPages] = useState(0);
  const [dustingAttackers, setDustingAttackers] = useState<DustingAttacker[]>([]);

  const fetchDustingAttackers = async () => {
    try {
      setIsAttackersLoading(true);
      setAttackersError(null);

      const offset = (attackersPage - 1) * attackersPageSize;
      const response = await fetch(
        `https://api.lavinth.com/api/dusting-attackers?limit=${attackersPageSize}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dusting attackers data");
      }

      const apiResponse = await response.json();
      const attackers = apiResponse.data;

      // Store pagination metadata
      if (apiResponse.pagination) {
        setAttackersTotalPages(apiResponse.pagination.totalPages);
        setAttackersTotalItems(apiResponse.pagination.total);
        setAttackersPage(apiResponse.pagination.currentPage);
      }

      setDustingAttackers(attackers);
      setIsAttackersLoading(false);
    } catch (err) {
      console.error("Error fetching dusting attackers:", err);
      setAttackersError(
        "Failed to load dusting attackers data. Please try again later."
      );
      setIsAttackersLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-cyan-200">
          Dusting Attackers
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {attackersTotalItems > 0 &&
              `Showing ${attackersPage} of ${attackersTotalPages} pages (${attackersTotalItems} total)`}
          </span>
        </div>
      </div>

      {isAttackersLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <h2 className="text-lg font-medium mb-2">
              Loading Dusting Attackers...
            </h2>
            <Progress value={45} className="w-60 mx-auto" />
          </div>
        </div>
      ) : attackersError ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h2 className="text-lg font-medium mb-2">Error Loading Data</h2>
            <p className="text-muted-foreground">{attackersError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fetchDustingAttackers()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : dustingAttackers.length === 0 ? (
        <div className="flex items-center justify-center py-10 border border-dashed rounded-lg">
          <div className="text-center">
            <WalletIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h2 className="text-lg font-medium mb-2">
              No Dusting Attackers Found
            </h2>
            <p className="text-muted-foreground">
              No dusting attackers have been identified in the database yet.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Attackers Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatsCard
              title="Total Attackers"
              value={attackersTotalItems}
              icon={<WalletIcon className="h-8 w-8 text-red-500" />}
              trend="neutral"
            />
            <StatsCard
              title="Avg Transfers Count"
              value={
                dustingAttackers.reduce(
                  (sum, a) => sum + a.small_transfers_count,
                  0
                ) / (dustingAttackers.length || 1)
              }
              valueFormatter={(val) => val.toFixed(1)}
              icon={<Activity className="h-8 w-8 text-orange-500" />}
              trend="neutral"
            />
            <StatsCard
              title="Avg Risk Score"
              value={
                dustingAttackers.reduce(
                  (sum, a) => sum + Number(a.risk_score),
                  0
                ) / (dustingAttackers.length || 1)
              }
              valueFormatter={(val) => (val * 100).toFixed(1) + "%"}
              icon={<AlertTriangle className="h-8 w-8 text-yellow-500" />}
              trend="neutral"
            />
          </div>

          {/* Attackers Table */}
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
                        Transfers
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Victims
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Last Updated
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-cyan-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dustingAttackers.map((attacker) => (
                      <tr
                        key={attacker.id}
                        className="border-b border-gray-800 hover:bg-gray-900/50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {formatAddress(attacker.address)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `rgba(${Math.round(
                                255 * attacker.risk_score
                              )}, ${Math.round(
                                255 * (1 - attacker.risk_score)
                              )}, 0, 0.2)`,
                              color: `rgb(${Math.round(
                                255 * attacker.risk_score
                              )}, ${Math.round(
                                255 * (1 - attacker.risk_score)
                              )}, 0)`,
                            }}
                          >
                            {(attacker.risk_score * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {attacker.small_transfers_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {attacker.unique_victims_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {new Date(attacker.last_updated).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/wallet-check?address=${attacker.address}`
                              )
                            }
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
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
                value={attackersPageSize}
                onChange={(e) => {
                  setAttackersPageSize(Number(e.target.value));
                  setAttackersPage(1);
                }}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <span className="text-sm text-muted-foreground">
                Showing {dustingAttackers.length} of {attackersTotalItems}{" "}
                attackers
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttackersPage(1)}
                disabled={attackersPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttackersPage(attackersPage - 1)}
                disabled={attackersPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {attackersPage} of {attackersTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttackersPage(attackersPage + 1)}
                disabled={attackersPage === attackersTotalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttackersPage(attackersTotalPages)}
                disabled={attackersPage === attackersTotalPages}
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
