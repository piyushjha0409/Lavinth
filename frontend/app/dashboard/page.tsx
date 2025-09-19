"use client";

// Direct API call to dashboard route
import AlertsTab from "@/components/dashboard/alerts-tab";
import AttackersTab from "@/components/dashboard/attackers-tab";
import DustingAnalysisTab from "@/components/dashboard/dusting-analysis-tab";
import OverviewTab from "@/components/dashboard/overview-tab";
import PoisoningDetectionTab from "@/components/dashboard/poisoning-detection-tab";
import TransactionsTab from "@/components/dashboard/transactions-tab";
import VictimsTab from "@/components/dashboard/victims-tab";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AnalyticsOverview } from "@/components/analytics";
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
      case "transactions":
        return <TransactionsTab dashboardData={dashboardData} />;
      case "dusting":
        return (
          <DustingAnalysisTab
            dashboardData={dashboardData}
            topDusters={topDusters}
          />
        );
      case "api-keys":
        return <ApiKeysTab />;
      case "poisoning":
        return <PoisoningDetectionTab />;
      case "attackers":
        return <AttackersTab />;
      case "victims":
        return <VictimsTab />;
      case "alerts":
        return <AlertsTab />;
      case "analytics":
        return <AnalyticsOverview dashboardData={dashboardData} />;
      case "legacy-overview":
        return <OverviewTab dashboardData={dashboardData} />;
      default:
        return <AnalyticsOverview dashboardData={dashboardData} />;
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
