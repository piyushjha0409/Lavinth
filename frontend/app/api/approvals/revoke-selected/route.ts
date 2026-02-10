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
    const { walletAddress: bodyWallet, approvals } = body;

    if (!bodyWallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      return NextResponse.json(
        { error: "Approvals must be a non-empty array" },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseURL}/revocation/build-selective`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey as string,
      },
      body: JSON.stringify({ walletAddress: bodyWallet, approvals }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Failed to build selective revocation: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error building selective revocation:", error);
    return NextResponse.json(
      { error: "Failed to build selective revocation plan" },
      { status: 500 }
    );
  }
}
