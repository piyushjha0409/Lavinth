import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseURL}/check-wallet/${address}`, {
      headers: {
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to check wallet: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error checking wallet:", error);
    return NextResponse.json(
      { error: "Failed to check wallet address" },
      { status: 500 }
    );
  }
}
