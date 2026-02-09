import { NextResponse } from "next/server";
import { getWalletAddress } from "@/lib/wallet-auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET() {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiBaseURL}/exchanges/contacts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Failed to fetch exchange contacts: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching exchange contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange contacts" },
      { status: 500 }
    );
  }
}
