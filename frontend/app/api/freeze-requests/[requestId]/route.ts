import { NextResponse } from "next/server";
import { getWalletAddress } from "@/lib/wallet-auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;

  try {
    const response = await fetch(`${apiBaseURL}/freeze-requests/${requestId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Failed to fetch freeze request: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching freeze request:", error);
    return NextResponse.json(
      { error: "Failed to fetch freeze request" },
      { status: 500 }
    );
  }
}
