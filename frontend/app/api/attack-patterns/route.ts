import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hours = searchParams.get('hours') || '24';

    const response = await fetch(`${apiBaseURL}/attack-patterns?hours=${hours}`, {
      headers: {
        "x-access-token": apiKey as string,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch attack patterns: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching attack patterns:", error);
    return NextResponse.json(
      { error: "Failed to load attack patterns" },
      { status: 500 }
    );
  }
}
