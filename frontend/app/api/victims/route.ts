import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "10";
    const offset = searchParams.get("offset") || "0";

    const response = await fetch(
      `${process.env.API_BASE_URL}/dusting-victims?limit=${limit}&offset=${offset}`,
      {
        headers: {
          "x-access-token": process.env.API_KEY as string,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch victims data: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching victims data:", error);
    return NextResponse.json(
      { error: "Failed to load victims data" },
      { status: 500 }
    );
  }
}
