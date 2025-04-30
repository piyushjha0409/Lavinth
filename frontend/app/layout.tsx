import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { RetroText } from "@/components/ui/retro-text";
import { Shield } from "lucide-react";
import { Chakra_Petch, Inter, Pixelify_Sans, VT323 } from "next/font/google";
import Link from "next/link";
import type React from "react";

// Define fonts
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

const chakraPetch = Chakra_Petch({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chakra-petch",
});

// Add Pixelify Sans from Google Fonts
const pixelifySans = Pixelify_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-pixelify-sans",
});

export const metadata = {
  title: "SolanaShield - Advanced Security for Solana Blockchain",
  description:
    "Protect your Solana applications from account dusting and address poisoning attacks with SolanaShield's comprehensive security platform.",
  generator: "v0.dev",
};

function GlobalNavigation() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neon-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-neon-500" />
            <RetroText as="span" className="inline-block font-bold">
              SolanaShield
            </RetroText>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/#features"
              className="flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-neon-500"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-neon-500"
            >
              How It Works
            </Link>
            {/* <Link
              href="/#api"
              className="flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-neon-500"
            >
              API
            </Link>
            <Link
              href="/#pricing"
              className="flex items-center text-sm font-medium text-gray-400 transition-colors hover:text-neon-500"
            >
              Pricing
            </Link> */}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white border-none shadow-[0_0_15px_rgba(0,255,255,0.7)] transition-all duration-300"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${vt323.variable} ${chakraPetch.variable} ${pixelifySans.variable}`}
    >
      <body className="bg-black text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
        >
          <div className="flex min-h-screen flex-col bg-black text-white font-retro crt relative">
            <div className="scan-line" />
            <GlobalNavigation />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
