import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../middleware";

function makeRequest(
  path: string,
  walletAddress?: string
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  if (walletAddress) {
    req.cookies.set("wallet_address", walletAddress);
  }
  return req;
}

// A valid Solana base58 address (32-44 chars, base58 charset)
const VALID_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const INVALID_WALLET = "not-a-real-wallet!!!";

describe("Frontend middleware – auth redirects", () => {
  it("allows unauthenticated users to access /", () => {
    const result = middleware(makeRequest("/"));
    expect(result).toBeUndefined();
  });

  it("allows unauthenticated users to access /dashboard", () => {
    const result = middleware(makeRequest("/dashboard"));
    expect(result).toBeUndefined();
  });

  it("redirects unauthenticated users from /wallet-check to /dashboard", () => {
    const result = middleware(makeRequest("/wallet-check"));
    expect(result).toBeDefined();
    expect(result!.headers.get("location")).toContain("/dashboard");
  });

  it("allows authenticated users to access /dashboard", () => {
    const result = middleware(makeRequest("/dashboard", VALID_WALLET));
    expect(result).toBeUndefined();
  });

  it("allows authenticated users to access /wallet-check", () => {
    const result = middleware(makeRequest("/wallet-check", VALID_WALLET));
    expect(result).toBeUndefined();
  });

  it("treats invalid wallet cookie as unauthenticated on protected routes", () => {
    const result = middleware(makeRequest("/wallet-check", INVALID_WALLET));
    expect(result).toBeDefined();
    expect(result!.headers.get("location")).toContain("/dashboard");
  });

  it("treats empty wallet cookie as unauthenticated on protected routes", () => {
    const result = middleware(makeRequest("/wallet-check", ""));
    expect(result).toBeDefined();
    expect(result!.headers.get("location")).toContain("/dashboard");
  });
});
