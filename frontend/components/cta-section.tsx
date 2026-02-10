"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CTASection() {
  const [walletAddress, setWalletAddress] = useState("");

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Protect Your Solana Assets
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Check any wallet address against our threat intelligence database,
            or launch the full dashboard for comprehensive security analysis.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (walletAddress) {
                window.location.href = `/wallet-check?address=${encodeURIComponent(
                  walletAddress
                )}`;
              }
            }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter Solana wallet address"
                className="flex-1 bg-card border-border/50 focus-visible:ring-primary h-12 font-mono text-sm"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
              <Button
                type="submit"
                className="btn-gradient text-white h-12 px-6"
                disabled={!walletAddress}
              >
                Check Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>

          <Link href="/dashboard">
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-secondary px-8 py-5"
            >
              Launch Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" />
    </section>
  );
}
