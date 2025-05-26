import { WalletIcon } from "lucide-react";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { DashboardData } from "@/app/types/transactions";

export default function DustingAnalysisTab({
  dashboardData,
  topDusters,
}: {
  dashboardData: DashboardData | null;
  topDusters: any[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Dusting Stats */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-cyan-200">
            Dusting Analysis
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Transactions</span>
              <span className="font-medium">
                {dashboardData?.activeTransactions || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dust Transactions</span>
              <span className="font-medium">
                {dashboardData?.potentialDustCount || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dust Threshold</span>
              <span className="font-medium">0.001 SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potential Dusters</span>
              <span className="font-medium">{topDusters.length}</span>
            </div>

            <div className="pt-2">
              <div className="text-sm font-medium mb-1">
                Dust Transaction Ratio
              </div>
              <Progress
                value={
                  dashboardData?.activeTransactions
                    ? (dashboardData.potentialDustCount /
                        dashboardData.activeTransactions) *
                      100
                    : 0
                }
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {dashboardData?.activeTransactions
                  ? (
                      (dashboardData.potentialDustCount /
                        dashboardData.activeTransactions) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Dusters */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold text-cyan-200">
            Top Dusting Wallets
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topDusters.length > 0 ? (
              topDusters.map((duster, idx) => (
                <div key={idx} className="flex items-center space-x-4">
                  <div className="bg-muted rounded-full p-2">
                    <WalletIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium truncate max-w-[150px]">
                        {duster.address.substring(0, 6) + "..."}
                      </span>
                      <span className="text-yellow-600 font-medium">
                        {duster.smallTransfersCount} transfers
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {duster.uniqueRecipients.length} unique recipients
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  No dust senders identified
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm">
              View All Dusters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
