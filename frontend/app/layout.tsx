import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletProvider";
import { QueryProvider } from "@/context/QueryProvider";
import { WalletAuthSync } from "@/components/wallet-auth-sync";
import { RootErrorBoundary } from "@/components/root-error-boundary";

export const metadata: Metadata = {
  title: "Lavinth - Advanced Security for Solana Blockchain",
  description:
    "Solana post-compromise wallet recovery platform — approval scanning, emergency revocation, fund tracing, and exchange freeze requests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="dark">
        <RootErrorBoundary>
          <QueryProvider>
            <WalletProvider>
              <WalletAuthSync>{children}</WalletAuthSync>
            </WalletProvider>
          </QueryProvider>
        </RootErrorBoundary>
      </body>
    </html>
  );
}
