import { NextResponse } from "next/server";
import {
  AttackerPattern,
  VictimExposure,
  DailySummary,
} from "@/app/types/dashboard";
import { DashboardData } from "@/app/types/transactions";
import { auth } from "@/lib/auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${apiBaseURL}/overview`, {
      headers: {
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch dashboard data: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.status === "success") {
      const attackerPatterns = (result.data.attackerPatterns ||
        []) as AttackerPattern[];
      const victimExposure = (result.data.victimExposure ||
        []) as VictimExposure[];
      const dailySummary = (result.data.dailySummary || []) as DailySummary[];

      const tokenDistribution = (result.data.tokenDistribution || []).map(
        (item: { token_type: string; count: string | number }) => ({
          token_type: item.token_type,
          count: Number(item.count),
        })
      );

      const dashboardData: DashboardData = {
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
        attackerPatterns,
        victimExposure,
        dailySummary,
        avgTransactionFee: result.data.avgTransactionFee || 0,
        uniqueSenders: result.data.uniqueSenders || 0,
        uniqueRecipients: result.data.uniqueRecipients || 0,
        tokenDistribution,
      };

      return NextResponse.json({ data: dashboardData });
    } else {
      const defaultData: DashboardData = {
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
      };

      return NextResponse.json({ data: defaultData });
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
