import { NextResponse } from "next/server";
import { getWalletAddress } from "@/lib/wallet-auth";
import { validateOrigin } from "@/lib/csrf";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function POST(request: Request) {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const response = await fetch(`${apiBaseURL}/simulation/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey as string,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Simulation failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error running simulation:", error);
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
}
