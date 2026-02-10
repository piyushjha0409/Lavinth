import type { Metadata } from "next";
import { Exo_2, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletProvider";
import { QueryProvider } from "@/context/QueryProvider";
import { WalletAuthSync } from "@/components/wallet-auth-sync";
import { RootErrorBoundary } from "@/components/root-error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

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
    <html lang="en" className={`dark ${inter.variable} ${exo2.variable} ${jetbrainsMono.variable}`}>
      <body className="dark antialiased">
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
