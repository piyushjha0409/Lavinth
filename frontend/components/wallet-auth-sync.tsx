"use client";

import { useWalletAuth } from "@/hooks/use-wallet-auth";

export function WalletAuthSync({ children }: { children: React.ReactNode }) {
  useWalletAuth();
  return <>{children}</>;
}
