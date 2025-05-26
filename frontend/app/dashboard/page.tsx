"use client";

import {
  AttackerPattern,
  DailySummary,
  VictimExposure,
} from "@/app/types/dashboard";
import AlertsTab from "@/components/dashboard/alerts-tab";
import AttackersTab from "@/components/dashboard/attackers-tab";
import DustingAnalysisTab from "@/components/dashboard/dusting-analysis-tab";
import OverviewTab from "@/components/dashboard/overview-tab";
import PoisoningDetectionTab from "@/components/dashboard/poisoning-detection-tab";
import TransactionsTab from "@/components/dashboard/transactions-tab";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VictimsTab from "@/components/dashboard/victims-tab";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardData } from "../types/transactions";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [topDusters, setTopDusters] = useState<any[]>([]);

  // Centralized function to fetch dashboard data for all components
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Use lavinth's endpoint for materialized view data
      const response = await fetch("https://api.lavinth.com/api/overview");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();
      if (result.status === "success") {
        // Extract all necessary data for both overview and transactions tabs
        const attackerPatterns = (result.data.attackerPatterns ||
          []) as AttackerPattern[];
        const victimExposure = (result.data.victimExposure ||
          []) as VictimExposure[];
        const dailySummary = (result.data.dailySummary || []) as DailySummary[];

        // Convert count values from strings to numbers for the token distribution
        const tokenDistribution = (result.data.tokenDistribution || []).map(
          (item: { token_type: string; count: string | number }) => ({
            token_type: item.token_type,
            count: Number(item.count),
          })
        );

        // Set top dusters if available - needed for DustingAnalysisTab
        if (attackerPatterns.length > 0) {
          setTopDusters(
            attackerPatterns.map(
              (attacker: {
                address: string;
                small_transfers_count?: number;
                unique_victims_count?: number;
              }) => ({
                address: attacker.address,
                smallTransfersCount: attacker.small_transfers_count || 0,
                uniqueRecipients: attacker.unique_victims_count || 0,
              })
            )
          );
        }

        // Create comprehensive DashboardData object for all components
        setDashboardData({
          activeTransactions: result.data.totalTransactions || 0,
          successfulTransactions: result.data.successfulTransactions || 0,
          failedTransactions: result.data.failedTransactions || 0,
          totalVolume: result.data.volume || 0,
          averageTransactionSize:
            result.data.avgTransactionAmount ||
            (result.data.volume > 0 && result.data.totalTransactions > 0
              ? result.data.volume / result.data.totalTransactions
              : 0),
          potentialDustCount: result.data.dustedTransactions || 0,
          poisoningAttempts: result.data.poisonedTransactions || 0,
          dustingSources: result.data.dustingSources || 0,
          pendingTransactions: 0,
          transactionsOverTime: [],
          // Include all data needed by child components
          attackerPatterns,
          victimExposure,
          dailySummary,
          // Additional metrics from enhanced API
          avgTransactionFee: result.data.avgTransactionFee || 0,
          uniqueSenders: result.data.uniqueSenders || 0,
          uniqueRecipients: result.data.uniqueRecipients || 0,
          tokenDistribution,
        });
      } else {
        // Fallback to basic dashboard data
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
          dustingSources: result.data.dustingSources || 0,
          pendingTransactions: 0,
          transactionsOverTime: [],
          tokenDistribution: [],
        });
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        <TabsList className="grid grid-cols-3 md:grid-cols-7 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="dusting">Dusting Analysis</TabsTrigger>
          <TabsTrigger value="poisoning">Poisoning Detection</TabsTrigger>
          <TabsTrigger value="attackers">Dusting Attackers</TabsTrigger>
          <TabsTrigger value="victims">Dusting Victims</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab dashboardData={dashboardData} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <TransactionsTab dashboardData={dashboardData} />
        </TabsContent>

        <TabsContent value="dusting" className="space-y-6">
          <DustingAnalysisTab
            dashboardData={dashboardData}
            topDusters={topDusters}
          />
        </TabsContent>

        <TabsContent value="poisoning" className="space-y-6">
          <PoisoningDetectionTab />
        </TabsContent>

        <TabsContent value="attackers" className="space-y-6">
          <AttackersTab />
        </TabsContent>

        <TabsContent value="victims" className="space-y-6">
          <VictimsTab />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
