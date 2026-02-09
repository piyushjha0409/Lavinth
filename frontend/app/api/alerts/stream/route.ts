import { getWalletAddress } from "@/lib/wallet-auth";

const apiKey = process.env.API_KEY;
const apiBaseURL = process.env.API_BASE_URL;

export async function GET() {
  const walletAddress = await getWalletAddress();

  if (!walletAddress) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const backendUrl = `${apiBaseURL}/alerts/stream`;

  const backendResponse = await fetch(backendUrl, {
    headers: {
      "x-access-token": apiKey as string,
    },
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(JSON.stringify({ error: "Failed to connect to alert stream" }), {
      status: backendResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(backendResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
