"use client";

// Direct API call to dashboard route
import OverviewTab from "@/components/dashboard/overview-tab";
import ThreatIntelligenceTab from "@/components/dashboard/threat-intelligence-tab";
import NetworkAnalysisTab from "@/components/dashboard/network-analysis-tab";
import MLAnalyticsTab from "@/components/dashboard/ml-analytics-tab";
import TransactionsTab from "@/components/dashboard/transactions-tab";
import SettingsApiTab from "@/components/dashboard/settings-api-tab";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { DashboardData } from "../types/transactions";
import { useSearchParams } from "next/navigation";
import ApiKeysTab from "@/components/dashboard/api-keys-tab";

function DashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [topDusters, setTopDusters] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Direct API call to dashboard route
      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data;

      // Set dashboard data
      setDashboardData(data);

      // Transform attacker data for top dusters if available
      if (data.attackerPatterns && data.attackerPatterns.length > 0) {
        setTopDusters(
          data.attackerPatterns.map(
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
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Progress value={33} className="w-64 mb-4" />
            <p className="text-lg text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Error Loading Dashboard
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDashboardData}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "threat-intelligence":
        return <ThreatIntelligenceTab />;
      case "network-analysis":
        return <NetworkAnalysisTab />;
      case "ml-analytics":
        return <MLAnalyticsTab />;
      case "transactions":
        return <TransactionsTab dashboardData={dashboardData} />;
      case "settings-api":
        return <SettingsApiTab />;
      default:
        return <OverviewTab dashboardData={dashboardData} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">{renderContent()}</div>
    </DashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Progress value={33} className="w-64 mb-4" />
              <p className="text-lg text-muted-foreground">
                Loading dashboard...
              </p>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
