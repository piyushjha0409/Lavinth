import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted — define all mocks inline
vi.mock("@solana/web3.js", () => {
  const getSignaturesForAddress = vi.fn();
  class MockConnection {
    constructor(_endpoint: string, _commitment?: string) {}
    getSignaturesForAddress(...args: any[]) {
      return getSignaturesForAddress(...args);
    }
  }
  class MockPublicKey {
    private _key: string;
    constructor(key: string) {
      this._key = key;
    }
    toBase58() {
      return this._key;
    }
  }
  return {
    Connection: MockConnection,
    PublicKey: MockPublicKey,
    __mockGetSignatures: getSignaturesForAddress,
  };
});

vi.mock("../db/config", () => {
  const executeQuery = vi.fn();
  return {
    default: { executeQuery },
    __mockExecuteQuery: executeQuery,
  };
});

import * as web3 from "@solana/web3.js";
import * as dbConfig from "../db/config";
import { ApprovalScanner } from "../services/approval-scanner";

function getMockGetSignatures() {
  return (web3 as any).__mockGetSignatures;
}

function getMockExecuteQuery() {
  return (dbConfig as any).__mockExecuteQuery;
}

describe("Delegate profiling", () => {
  let scanner: ApprovalScanner;

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new ApprovalScanner();
  });

  describe("checkIsNewDelegate", () => {
    it("is false when delegate has many signatures", async () => {
      getMockGetSignatures().mockResolvedValue([
        { signature: "s1" },
        { signature: "s2" },
        { signature: "s3" },
        { signature: "s4" },
        { signature: "s5" },
      ]);
      getMockExecuteQuery().mockResolvedValue({ rows: [] });

      const result = await (scanner as any).checkIsNewDelegate("delegateXYZ");
      expect(result).toBe(false);
    });

    it("is false when delegate is a known exchange", async () => {
      getMockGetSignatures().mockResolvedValue([{ signature: "s1" }]);
      getMockExecuteQuery().mockResolvedValue({
        rows: [{ exchange_name: "Binance" }],
      });

      const result = await (scanner as any).checkIsNewDelegate("exchangeAddr");
      expect(result).toBe(false);
    });

    it("is true when delegate has few signatures and is unknown", async () => {
      getMockGetSignatures().mockResolvedValue([{ signature: "s1" }]);
      getMockExecuteQuery().mockResolvedValue({ rows: [] });

      const result = await (scanner as any).checkIsNewDelegate("newDelegate");
      expect(result).toBe(true);
    });
  });

  describe("checkHasHighVolume", () => {
    it("is true when delegate has approvals from >10 wallets", async () => {
      getMockExecuteQuery().mockResolvedValue({
        rows: [{ unique_wallets: "15" }],
      });

      const result = await (scanner as any).checkHasHighVolume("highVolDelegate");
      expect(result).toBe(true);
    });

    it("is false when delegate has approvals from <=10 wallets", async () => {
      getMockExecuteQuery().mockResolvedValue({
        rows: [{ unique_wallets: "5" }],
      });

      const result = await (scanner as any).checkHasHighVolume("lowVolDelegate");
      expect(result).toBe(false);
    });
  });
});
