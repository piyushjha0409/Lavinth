"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

export function useWalletAuth() {
  const { publicKey, connected, disconnect } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      document.cookie = `wallet_address=${publicKey.toBase58()}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } else {
      document.cookie = "wallet_address=; path=/; max-age=0";
    }
  }, [connected, publicKey]);

  return {
    walletAddress: publicKey?.toBase58() ?? null,
    connected,
    disconnect,
  };
}
