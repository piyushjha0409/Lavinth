"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CTASection() {
  const [walletAddress, setWalletAddress] = useState("");

  return (
    <section id="api" className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(76,201,240,0.1),transparent_50%)] z-0" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/40 backdrop-blur-sm border border-blue-500/20 rounded-xl p-8 md:p-12 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(67,97,238,0.1),transparent_70%)]" />

            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    Secure Your Solana
                  </span>{" "}
                  Assets Today
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto">
                  Try our wallet address verification tool to check if an
                  address is poisoned or at risk.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (walletAddress) {
                    window.location.href = `/wallet-check?address=${encodeURIComponent(
                      walletAddress
                    )}`;
                  }
                }}
                className="max-w-2xl mx-auto"
              >
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Input
                    type="text"
                    placeholder="Enter Solana wallet address"
                    className="flex-1 bg-black/60 border-blue-500/30 focus-visible:ring-blue-500"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={!walletAddress}
                  >
                    Check Address
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-400">
                  For more detailed analysis and continuous protection, try our
                  full security suite.
                </div>
              </form>

              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                    Launch Dashboard
                  </Button>
                </Link>
                {/* <Button
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10 text-lg px-8 py-6"
                >
                  Explore API Documentation
                </Button> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
