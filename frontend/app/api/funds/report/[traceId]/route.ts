import { NextResponse } from "next/server";
import { getWalletAddress } from "@/lib/wallet-auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { traceId } = await params;

    if (!traceId) {
      return NextResponse.json(
        { error: "Trace ID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseURL}/funds/report/${traceId}`, {
      headers: {
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Failed to generate report: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating recovery report:", error);
    return NextResponse.json(
      { error: "Failed to generate recovery report" },
      { status: 500 }
    );
  }
}
