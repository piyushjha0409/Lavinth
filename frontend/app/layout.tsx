import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/context/AuthProvider";

export const metadata: Metadata = {
  title: "Lavinth - Advanced Security for Solana Blockchain",
  description:
    "Protect your Solana applications from account dusting and address poisoning attacks with Lavinth's comprehensive security platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="solads-site-verification"
          content="solads_verify_1756328321020_361278ce66e77c69da78b0eedc79b352"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
