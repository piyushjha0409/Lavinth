import { NextResponse } from "next/server";
import { DashboardData } from "@/app/types/transactions";
import { getWalletAddress } from "@/lib/wallet-auth";

export async function GET() {
  try {
    const walletAddress = await getWalletAddress();

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return default dashboard data
    // The legacy /api/overview backend endpoint has been removed.
    // Dashboard stats will be populated as recovery-platform endpoints provide data.
    const dashboardData: DashboardData = {
      activeTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalVolume: 0,
      averageTransactionSize: 0,
      pendingTransactions: 0,
      transactionsOverTime: [],
      avgTransactionFee: 0,
      uniqueSenders: 0,
      uniqueRecipients: 0,
      tokenDistribution: [],
    };

    return NextResponse.json({ data: dashboardData });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
