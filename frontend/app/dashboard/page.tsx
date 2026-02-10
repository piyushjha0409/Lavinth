"use client";

import OverviewTab from "@/components/dashboard/overview-tab";
import SettingsApiTab from "@/components/dashboard/settings-api-tab";
import WalletSecurityTab from "@/components/dashboard/wallet-security-tab";
import RecoveryTab from "@/components/dashboard/recovery-tab";
import FreezeRequestsTab from "@/components/dashboard/freeze-requests-tab";
import SimulationTab from "@/components/dashboard/simulation-tab";
import TokenApprovalsTab from "@/components/dashboard/token-approvals-tab";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock } from "lucide-react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ApiKeysTab from "@/components/dashboard/api-keys-tab";
import { ErrorBoundary } from "react-error-boundary";
import { DashboardErrorFallback } from "@/components/dashboard/error-fallback";
import { useDashboardData } from "@/hooks/use-api";

function DashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();

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
    const isRateLimit = error.message.toLowerCase().includes("too many requests") || error.message.includes("429");
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            {isRateLimit ? (
              <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-semibold mb-2">
              {isRateLimit ? "Rate Limit Reached" : "Error Loading Dashboard"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isRateLimit
                ? "You're making too many requests. Please wait a moment before trying again."
                : error.message}
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderContent = () => {
    const tabComponent = (() => {
      switch (activeTab) {
        case "wallet-security":
          return <WalletSecurityTab />;
        case "token-approvals":
          return <TokenApprovalsTab />;
        case "simulation":
          return <SimulationTab />;
        case "recovery":
          return <RecoveryTab />;
        case "freeze-requests":
          return <FreezeRequestsTab />;
case "settings-api":
          return <SettingsApiTab />;
        default:
          return <OverviewTab dashboardData={dashboardData} />;
      }
    })();

    return (
      <ErrorBoundary
        FallbackComponent={DashboardErrorFallback}
        resetKeys={[activeTab]}
      >
        {tabComponent}
      </ErrorBoundary>
    );
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
