import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${process.env.API_BASE_URL}/check-wallet/${address}`,
      {
        headers: {
          "x-access-token": process.env.API_KEY as string,
        },
      }
    );

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
