import { describe, it, expect } from "vitest";
import { validateOrigin } from "../lib/csrf";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers,
  });
}

describe("validateOrigin – bare domain (P0 fix)", () => {
  it("accepts https://lavinth.com (no www)", () => {
    const req = makeRequest({ origin: "https://lavinth.com" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("accepts https://www.lavinth.com", () => {
    const req = makeRequest({ origin: "https://www.lavinth.com" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("accepts http://localhost:3000", () => {
    const req = makeRequest({ origin: "http://localhost:3000" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects http://lavinth.com (wrong protocol)", () => {
    const req = makeRequest({ origin: "http://lavinth.com" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects subdomain impersonation", () => {
    const req = makeRequest({ origin: "https://evil.lavinth.com" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("accepts bare domain in referer header", () => {
    const req = makeRequest({
      referer: "https://lavinth.com/wallet-check",
    });
    expect(validateOrigin(req)).toBe(true);
  });
});
