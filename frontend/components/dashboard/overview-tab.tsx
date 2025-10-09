import { formatAddress, formatNumber } from "@/app/utils/dataProcessing";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Percent,
  Shield,
  Users,
  WalletIcon,
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
import { useState, useEffect } from "react";

export { SecurityCard, StatsCard };
export type { SecurityCardProps, StatsCardProps };

interface ThreatMetrics {
  dust_24h: number;
  poisoning_24h: number;
  active_attackers_24h: number;
  active_victims_24h: number;
  avg_risk_score: number;
  last_activity: string;
}

interface TopThreats {
  topAttackers: Array<{
    address: string;
    small_transfers_count: number;
    unique_victims_count: number;
    risk_score: number;
    wallet_age_days: number;
    total_transaction_volume: number;
  }>;
  topVictims: Array<{
    address: string;
    dust_transactions_count: number;
    unique_attackers_count: number;
    risk_score: number;
    wallet_age_days: number;
    wallet_value_estimate: number;
  }>;
}

export default function OverviewTab({
  dashboardData,
}: {
  dashboardData: DashboardData | null;
}) {
  const router = useRouter();
  const [threatMetrics, setThreatMetrics] = useState<ThreatMetrics | null>(null);
  const [topThreats, setTopThreats] = useState<TopThreats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchEnhancedData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, threatsRes] = await Promise.all([
        fetch('/api/threat-metrics'),
        fetch('/api/top-threats')
      ]);

      if (metricsRes.ok) {
        setThreatMetrics(await metricsRes.json());
      }
      if (threatsRes.ok) {
        setTopThreats(await threatsRes.json());
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching enhanced data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedData();
    // Auto-refresh every 5 minutes for production
    const interval = setInterval(fetchEnhancedData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            <div className="flex items-center text-muted-foreground">
              <span>Comprehensive threat detection and system analytics</span>
              {threatMetrics && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                  <Activity className="h-3 w-3 mr-1" />
                  Live Data
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchEnhancedData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
                  title="Active Threats"
                  value={threatMetrics ? Number(threatMetrics.dust_24h) + Number(threatMetrics.poisoning_24h) : 0}
                  icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
                  trend="neutral"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total threats detected in the last 24 hours</p>
              {threatMetrics && (
                <p className="text-xs">Dusting: {threatMetrics.dust_24h} | Poisoning: {threatMetrics.poisoning_24h}</p>
              )}
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
                  title="Dust Ratio"
                  value={
                    dashboardData?.activeTransactions
                      ? (dashboardData.potentialDustCount / dashboardData.activeTransactions) * 100
                      : 0
                  }
                  valueFormatter={(val) => val.toFixed(1) + "%"}
                  icon={<Percent className="h-8 w-8 text-accent-foreground" />}
                  trend="neutral"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentage of transactions flagged as potential dust</p>
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

        {/* Threat Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-destructive" />
                Security Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Dust Transactions</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-accent-foreground">
                    {dashboardData?.potentialDustCount || 0}
                  </span>
                  <Badge variant="secondary">
                    {dashboardData?.activeTransactions
                      ? ((dashboardData.potentialDustCount / dashboardData.activeTransactions) * 100).toFixed(1)
                      : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Poisoning Attempts</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-destructive">
                    {dashboardData?.poisoningAttempts || 0}
                  </span>
                  <Badge variant="destructive">
                    High Risk
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Active Attackers</span>
                <span className="text-2xl font-bold text-destructive">
                  {threatMetrics?.active_attackers_24h || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-primary" />
                Network Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Transactions</span>
                <span className="text-2xl font-bold text-primary">
                  {dashboardData?.activeTransactions?.toLocaleString() || 0}
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

        {/* Top Threats - Compact View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Recent Threat Activity
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard?tab=threat-intelligence")}>
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-3 text-destructive">Top Attackers</h4>
                <div className="space-y-2">
                  {dashboardData?.attackerPatterns && dashboardData.attackerPatterns.length > 0 ? (
                    dashboardData.attackerPatterns.slice(0, 3).map((attacker, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <WalletIcon className="h-4 w-4 text-destructive" />
                          <span className="font-mono text-sm">{formatAddress(attacker.address)}</span>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {attacker.risk_score.toFixed(1)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent attackers</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-primary">Top Victims</h4>
                <div className="space-y-2">
                  {dashboardData?.victimExposure && dashboardData.victimExposure.length > 0 ? (
                    dashboardData.victimExposure.slice(0, 3).map((victim, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-mono text-sm">{formatAddress(victim.address)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {victim.risk_score.toFixed(1)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent victims</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
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
                className="group cursor-pointer border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 hover:from-destructive/10 hover:to-destructive/20 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=threat-intelligence")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-destructive/10 rounded-lg group-hover:bg-destructive/20 transition-colors">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-destructive">Threat Intelligence</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-destructive/80">Analyze attackers & victims</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="group cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=network-analysis")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Network className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary">Network Analysis</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-primary/80">Explore relationships</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="group cursor-pointer border-chart-1/20 bg-gradient-to-br from-chart-1/5 to-chart-1/10 hover:from-chart-1/10 hover:to-chart-1/20 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=transactions")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-chart-1/10 rounded-lg group-hover:bg-chart-1/20 transition-colors">
                      <BarChart3 className="h-5 w-5 text-chart-1" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-chart-1">Transaction Monitor</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-chart-1/80">Real-time feed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="group cursor-pointer border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 hover:from-accent/10 hover:to-accent/20 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                onClick={() => router.push("/dashboard?tab=settings-api")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                      <FileText className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-accent-foreground">Export Reports</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">Download data</p>
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
