import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock wallet-auth
const mockGetWalletAddress = vi.fn();
vi.mock("@/lib/wallet-auth", () => ({
  getWalletAddress: () => mockGetWalletAddress(),
}));

// Mock fetch for backend proxy calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env vars BEFORE module is imported (route reads at load time)
process.env.API_KEY = "test-token";
process.env.API_BASE_URL = "http://localhost:3001/api";

import { GET, POST } from "@/app/api/api-keys/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  mockGetWalletAddress.mockReset();
  mockFetch.mockReset();
});

describe("GET /api/api-keys", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetWalletAddress.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("proxies to backend and returns API keys", async () => {
    mockGetWalletAddress.mockResolvedValue("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "key-1", name: "Test Key" }],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([{ id: "key-1", name: "Test Key" }]);
    // Verify the backend proxy call was made with the wallet address
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/user-api-keys/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
  });

  it("forwards backend error status", async () => {
    mockGetWalletAddress.mockResolvedValue("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    const res = await GET();
    expect(res.status).toBe(429);
  });
});

describe("POST /api/api-keys – CSRF protection", () => {
  it("returns 403 when origin is missing (CSRF)", async () => {
    mockGetWalletAddress.mockResolvedValue("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");

    const req = new NextRequest("http://localhost:3000/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Key" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 when origin is from evil site", async () => {
    mockGetWalletAddress.mockResolvedValue("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");

    const req = new NextRequest("http://localhost:3000/api/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://evil.com",
      },
      body: JSON.stringify({ name: "Test Key" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("succeeds with valid origin and body", async () => {
    mockGetWalletAddress.mockResolvedValue("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "new-key", key: "lav_live_xxx" }),
    });

    const req = new NextRequest("http://localhost:3000/api/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ name: "My Key" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("new-key");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetWalletAddress.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ name: "Test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockGetWalletAddress.mockResolvedValue("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");

    const req = new NextRequest("http://localhost:3000/api/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
