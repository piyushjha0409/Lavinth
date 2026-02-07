import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sessionId, signedTransactions } = body;

    if (!sessionId || !signedTransactions) {
      return NextResponse.json(
        { error: "sessionId and signedTransactions are required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseURL}/revocation/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey as string,
      },
      body: JSON.stringify({ sessionId, signedTransactions }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || `Failed to submit transactions: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error submitting revocation transactions:", error);
    return NextResponse.json(
      { error: "Failed to submit revocation transactions" },
      { status: 500 }
    );
  }
}
