import { NextRequest, NextResponse } from "next/server";
import { getWalletAddress } from "@/lib/wallet-auth";
import { validateOrigin } from "@/lib/csrf";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET() {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${apiBaseURL}/user-api-keys/${walletAddress}`,
      {
        headers: {
          "x-access-token": apiKey as string,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to list API keys" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error listing API keys:", error);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${apiBaseURL}/user-api-keys/${walletAddress}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey as string,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
