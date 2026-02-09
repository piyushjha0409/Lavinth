import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers cookies
const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (...args: any[]) => mockGet(...args),
  }),
}));

import { getWalletAddress } from "@/lib/wallet-auth";

describe("getWalletAddress", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns wallet address from valid cookie", async () => {
    mockGet.mockReturnValue({
      value: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
    });
    const result = await getWalletAddress();
    expect(result).toBe("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV");
    expect(mockGet).toHaveBeenCalledWith("wallet_address");
  });

  it("returns null when cookie is missing", async () => {
    mockGet.mockReturnValue(undefined);
    const result = await getWalletAddress();
    expect(result).toBeNull();
  });

  it("returns null when cookie value is empty", async () => {
    mockGet.mockReturnValue({ value: "" });
    const result = await getWalletAddress();
    expect(result).toBeNull();
  });

  it("returns null when cookie value is not a valid Solana address", async () => {
    mockGet.mockReturnValue({ value: "not-a-valid-address!" });
    const result = await getWalletAddress();
    expect(result).toBeNull();
  });

  it("rejects addresses with invalid base58 characters", async () => {
    // 0, O, I, l are not in base58
    mockGet.mockReturnValue({ value: "0OIl000000000000000000000000000000000000000" });
    const result = await getWalletAddress();
    expect(result).toBeNull();
  });
});
