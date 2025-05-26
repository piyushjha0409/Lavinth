import { formatAddress, formatNumber } from "@/app/utils/dataProcessing";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  DollarSign,
  Percent,
  Shield,
  User,
  UserPlus,
  Users,
  WalletIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";

import { DashboardData } from "@/app/types/transactions";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { SecurityCard, type SecurityCardProps } from "./security-card";
import { StatsCard, type StatsCardProps } from "./stats-card";

export { SecurityCard, StatsCard };
export type { SecurityCardProps, StatsCardProps };

export default function OverviewTab({
  dashboardData,
}: {
  dashboardData: DashboardData | null;
}) {
  const router = useRouter();

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Transactions"
          value={dashboardData?.activeTransactions || 0}
          icon={<Activity className="h-8 w-8 text-blue-500" />}
          trend="up"
        />
        <StatsCard
          title="Successful Transactions"
          value={dashboardData?.successfulTransactions || 0}
          icon={<ArrowUpRight className="h-8 w-8 text-green-500" />}
          trend="up"
        />
        <StatsCard
          title="Failed Transactions"
          value={dashboardData?.failedTransactions || 0}
          icon={<ArrowDownRight className="h-8 w-8 text-red-500" />}
          trend="down"
        />
        <StatsCard
          title="Volume (SOL)"
          value={dashboardData?.totalVolume || 0}
          valueFormatter={formatNumber}
          icon={<DollarSign className="h-8 w-8 text-yellow-500" />}
          trend="up"
        />
      </div>

      {/* Security Stats - Now showing 3 cards in 2 columns grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SecurityCard
          title="Dust Transactions"
          value={dashboardData?.potentialDustCount || 0}
          description="Potential dust transactions detected"
          severity="medium"
          icon={<WalletIcon className="h-6 w-6" />}
        />
        <SecurityCard
          title="Poisoning Attempts"
          value={dashboardData?.poisoningAttempts || 0}
          description="Potential address poisoning attempts"
          severity="high"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <SecurityCard
          title="Dusting Sources"
          value={dashboardData?.dustingSources || 0}
          description="Wallets sending dust transactions"
          severity="medium"
          icon={<Shield className="h-6 w-6" />}
        />
      </div>

      {/* Additional Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatsCard
          title="Unique Senders"
          value={dashboardData?.uniqueSenders || 0}
          icon={<Users className="h-8 w-8 text-purple-500" />}
          trend="neutral"
        />
        <StatsCard
          title="Unique Recipients"
          value={dashboardData?.uniqueRecipients || 0}
          icon={<UserPlus className="h-8 w-8 text-indigo-500" />}
          trend="neutral"
        />
        <StatsCard
          title="Avg Transaction Fee"
          value={dashboardData?.avgTransactionFee || 0}
          valueFormatter={formatNumber}
          icon={<Banknote className="h-8 w-8 text-emerald-500" />}
          trend="neutral"
        />
        <StatsCard
          title="Dust Transaction Ratio"
          value={
            dashboardData?.activeTransactions
              ? (dashboardData.potentialDustCount /
                  dashboardData.activeTransactions) *
                100
              : 0
          }
          valueFormatter={(val) => val.toFixed(1) + "%"}
          icon={<Percent className="h-8 w-8 text-amber-500" />}
          trend="neutral"
        />
      </div>

      {/* Token Distribution */}
      {/* <Card className="mt-6">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold text-cyan-200">
            Token Distribution
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {" "}
            {dashboardData?.tokenDistribution &&
            dashboardData.tokenDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={dashboardData.tokenDistribution
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#444"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => {
                      if (value >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value;
                    }}
                    stroke="#aaa"
                  />
                  <YAxis
                    type="category"
                    dataKey="token_type"
                    width={100}
                    tick={{
                      fill: "#fff",
                      fontSize: 12,
                    }}
                    tickFormatter={(value) => {
                      return value === "SOL"
                        ? value
                        : value.length > 12
                        ? `${value.substring(0, 6)}...${value.substring(
                            value.length - 4
                          )}`
                        : value;
                    }}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const total =
                        dashboardData.tokenDistribution?.reduce(
                          (sum, item) => sum + item.count,
                          0
                        ) || 0;
                      const percent =
                        total > 0
                          ? ((Number(value) / total) * 100).toFixed(1)
                          : "0.0";
                      return [`${value} (${percent}%)`];
                    }}
                    labelFormatter={(label) => {
                      return label === "SOL"
                        ? "SOL"
                        : label.length > 20
                        ? `${label.substring(0, 10)}...${label.substring(
                            label.length - 10
                          )}`
                        : label;
                    }}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#475569",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="count" name="Count" animationDuration={1000}>
                    {dashboardData.tokenDistribution?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            "#0ea5e9",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#ec4899",
                            "#06b6d4",
                            "#14b8a6",
                          ][index % 8]
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fill: "#fff" }}
                      formatter={(value: number) => {
                        const total =
                          dashboardData.tokenDistribution?.reduce(
                            (sum, item) => sum + item.count,
                            0
                          ) || 0;
                        const percent = ((Number(value) / total) * 100).toFixed(
                          1
                        );
                        return `${percent}%`;
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  No token distribution data available
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card> */}

      {/* Top Attackers and Victims Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Top Attackers */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-cyan-200">
              Top Dust Attackers
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.attackerPatterns &&
              dashboardData.attackerPatterns.length > 0 ? (
                dashboardData.attackerPatterns
                  .slice(0, 5)
                  .map((attacker, idx) => (
                    <div key={idx} className="flex items-center space-x-4">
                      <div className="bg-muted rounded-full p-2">
                        <WalletIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium truncate max-w-[150px]">
                            {formatAddress(attacker.address)}
                          </span>
                          <span className="text-yellow-600 font-medium">
                            Risk: {attacker.risk_score.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {attacker.small_transfers_count} transfers
                          </span>
                          <span>{attacker.unique_victims_count} victims</span>
                        </div>
                        <Progress
                          value={attacker.regularity_score * 100}
                          className="h-1 mt-1"
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    No dust attackers identified
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Victims */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-cyan-200">
              Top Dust Victims
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.victimExposure &&
              dashboardData.victimExposure.length > 0 ? (
                dashboardData.victimExposure.slice(0, 5).map((victim, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <div className="bg-muted rounded-full p-2">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium truncate max-w-[150px]">
                          {formatAddress(victim.address)}
                        </span>
                        <span className="text-red-600 font-medium">
                          Risk: {victim.risk_score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{victim.dust_transactions_count} dust txs</span>
                        <span>{victim.unique_attackers_count} attackers</span>
                      </div>
                      <Progress
                        value={victim.risk_exposure * 100}
                        className="h-1 mt-1"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    No dust victims identified
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Suspicious Transactions Button */}
      <div className="flex justify-center mt-6">
        <Button
          variant="default"
          onClick={() => router.push("/dashboard/transactions/suspicious")}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          View Suspicious Transactions
        </Button>
      </div>
    </>
  );
}
