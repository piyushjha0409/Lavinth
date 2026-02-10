import { formatAddress, formatNumber } from "@/app/utils/dataProcessing";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Shield,
  RefreshCw,
  TrendingUp,
  Network,
  ArrowRight,
  BarChart3,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

import { DashboardData } from "@/app/types/transactions";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { SecurityCard, type SecurityCardProps } from "./security-card";
import { StatsCard, type StatsCardProps } from "./stats-card";
import { useDashboardData } from "@/hooks/use-api";

export { SecurityCard, StatsCard };
export type { SecurityCardProps, StatsCardProps };

export default function OverviewTab({
  dashboardData,
}: {
  dashboardData: DashboardData | null;
}) {
  const router = useRouter();
  const {
    isFetching,
    dataUpdatedAt,
    refetch: refetchDashboard,
  } = useDashboardData();
  const lastRefresh = new Date(dataUpdatedAt || Date.now());
  const handleRefresh = () => {
    refetchDashboard();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">Dashboard Overview</h2>
            <div className="flex items-center text-muted-foreground">
              <span>Post-compromise wallet recovery platform</span>
              <Badge variant="secondary" className="ml-2 bg-severity-low/10 text-severity-low border-severity-low/20">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <StatsCard
                  title="Total Transactions"
                  value={dashboardData?.activeTransactions || 0}
                  icon={<Activity className="h-8 w-8 text-primary" />}
                  trend="neutral"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total transactions processed</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <StatsCard
                  title="Total Volume"
                  value={dashboardData?.totalVolume || 0}
                  valueFormatter={formatNumber}
                  icon={<DollarSign className="h-8 w-8 text-primary" />}
                  trend="up"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total SOL volume processed</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <StatsCard
                  title="Unique Addresses"
                  value={(dashboardData?.uniqueSenders || 0) + (dashboardData?.uniqueRecipients || 0)}
                  icon={<Shield className="h-8 w-8 text-accent-foreground" />}
                  trend="neutral"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Unique wallet addresses monitored</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <StatsCard
                  title="Success Rate"
                  value={
                    dashboardData?.activeTransactions
                      ? (dashboardData.successfulTransactions / dashboardData.activeTransactions) * 100
                      : 0
                  }
                  valueFormatter={(val) => val.toFixed(1) + "%"}
                  icon={<TrendingUp className="h-8 w-8 text-chart-1" />}
                  trend="up"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentage of successful transactions</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Platform Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card border-border/50 rounded-xl shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center font-heading">
                <Shield className="h-5 w-5 mr-2 text-destructive" />
                Security Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Transactions</span>
                <span className="text-2xl font-bold text-accent-foreground">
                  {dashboardData?.activeTransactions?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Successful</span>
                <span className="text-2xl font-bold text-primary">
                  {dashboardData?.successfulTransactions?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Failed</span>
                <span className="text-2xl font-bold text-destructive">
                  {dashboardData?.failedTransactions?.toLocaleString() || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 rounded-xl shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center font-heading">
                <Activity className="h-5 w-5 mr-2 text-primary" />
                Network Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Volume</span>
                <span className="text-2xl font-bold text-primary">
                  {formatNumber(dashboardData?.totalVolume || 0)} SOL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Unique Addresses</span>
                <span className="text-2xl font-bold text-chart-1">
                  {((dashboardData?.uniqueSenders || 0) + (dashboardData?.uniqueRecipients || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Avg Fee</span>
                <span className="text-2xl font-bold text-chart-2">
                  {(dashboardData?.avgTransactionFee || 0).toFixed(6)} SOL
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-card border-border/50 rounded-xl shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center font-heading">
              <BarChart3 className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Jump to detailed analysis and monitoring tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=wallet-security")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-destructive/10 rounded-lg group-hover:bg-destructive/20 transition-colors">
                      <Shield className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-destructive">Wallet Security</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-destructive/80">Scan approvals & revoke</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=recovery")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Network className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary">Fund Recovery</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-primary/80">Trace stolen funds</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=simulation")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-chart-1/10 rounded-lg group-hover:bg-chart-1/20 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-chart-1" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-chart-1">Transaction Simulator</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-chart-1/80">Check before signing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=settings-api")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                      <FileText className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-accent-foreground">API & Settings</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">Manage API keys</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
