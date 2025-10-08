import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${apiBaseURL}/threat-metrics`, {
      headers: {
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch threat metrics: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching threat metrics:", error);
    return NextResponse.json(
      { error: "Failed to load threat metrics" },
      { status: 500 }
    );
  }
}
