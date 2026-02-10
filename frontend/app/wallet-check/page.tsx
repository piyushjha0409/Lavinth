"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Spotlight } from "@/components/ui/spotlight";
import { useWallet } from "@solana/wallet-adapter-react";

interface WalletCheckResult {
  status: string;
  isFlagged: boolean;
  riskScore: number;
  message: string;
  details?: {
    label: string;
    category: string;
    sources: string[];
  };
  goPlusRisk?: {
    isRisky: boolean;
    riskFlags: string[];
  };
  error?: string;
}

import React from "react";
import { useSearchParams } from "next/navigation";

const WalletCheckWithParams = () => {
  const searchParams = useSearchParams();
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WalletCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) {
      setWalletAddress(addressParam);
      setTimeout(() => {
        checkWalletWithAddress(addressParam);
      }, 100);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
  };

  const checkWalletWithAddress = async (address: string) => {
    if (!address || address.trim() === "") {
      setError("Please enter a wallet address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/wallet-check/${address}`);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const wait = retryAfter ? ` Please try again in ${retryAfter} seconds.` : " Please try again shortly.";
        setError(`Too many requests.${wait}`);
        return;
      }

      const data = await response.json();

      if (data.status === "error") {
        setError(
          data.message || "An error occurred while checking the wallet address"
        );
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Failed to connect to the server. Please try again later.");
      console.error("Error checking wallet:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkWallet = async () => {
    await checkWalletWithAddress(walletAddress);
  };

  return (
    <Card className="bg-card border border-border backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Wallet Address Security Check
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Check if a Solana wallet address is flagged as potentially malicious
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              placeholder="Enter Solana wallet address"
              value={walletAddress}
              onChange={handleInputChange}
              className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
            <Button
              onClick={checkWallet}
              disabled={isLoading}
              className="btn-gradient text-white border-none transition-all duration-300"
            >
              {isLoading ? (
                "Checking..."
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Check Wallet
                </>
              )}
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-red-900/30 border border-red-500/50 rounded-md flex items-center gap-2 text-red-200"
            >
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 ${
                result.isFlagged
                  ? "bg-red-900/30 border-red-500/50 text-red-200"
                  : "bg-green-900/30 border-green-500/50 text-green-200"
              } border rounded-md`}
            >
              <div className="flex items-start gap-3">
                {result.isFlagged ? (
                  <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                )}
                <div className="space-y-2">
                  <h3
                    className={`font-bold ${
                      result.isFlagged ? "text-red-300" : "text-green-300"
                    }`}
                  >
                    {result.isFlagged
                      ? "Warning: Potentially Malicious Address"
                      : "Wallet Address is Safe"}
                  </h3>
                  <p>{result.message}</p>
                  {result.isFlagged && (
                    <div className="mt-2 space-y-4">
                      <div>
                        <div className="text-sm text-red-300">Risk Score</div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                          <div
                            className="bg-gradient-to-r from-yellow-500 to-red-500 h-2.5 rounded-full"
                            style={{ width: `${result.riskScore * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-right mt-1">
                          {(result.riskScore * 100).toFixed(2)}%
                        </div>
                      </div>

                      {result.details && (
                        <div className="space-y-3 border-t border-red-500/30 pt-3 mt-3">
                          <h4 className="font-medium text-red-300">
                            Threat Details
                          </h4>
                          <div className="bg-black/40 p-3 rounded border border-red-500/20">
                            <div className="space-y-1 text-sm">
                              {result.details.label && (
                                <p>
                                  <span className="text-muted-foreground">Label:</span>{" "}
                                  {result.details.label}
                                </p>
                              )}
                              {result.details.category && (
                                <p>
                                  <span className="text-muted-foreground">Category:</span>{" "}
                                  {result.details.category}
                                </p>
                              )}
                              {result.details.sources.length > 0 && (
                                <p>
                                  <span className="text-muted-foreground">Sources:</span>{" "}
                                  {result.details.sources.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {result.goPlusRisk && (
                        <div className="space-y-3 border-t border-red-500/30 pt-3 mt-3">
                          <h4 className="font-medium text-red-300">
                            GoPlus Risk Flags
                          </h4>
                          <div className="bg-black/40 p-3 rounded border border-red-500/20">
                            <div className="space-y-1 text-sm">
                              {result.goPlusRisk.riskFlags.map((flag, i) => (
                                <p key={i} className="text-red-200">{flag}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div className="text-sm text-muted-foreground mt-4">
            <p className="text-center">
              This tool checks if a Solana wallet address has been identified as
              potentially malicious using threat intelligence from multiple
              sources including GoPlus and Phantom Blocklist.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function WalletCheckErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <Card className="bg-card border border-destructive/30 backdrop-blur-sm">
      <CardContent className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </CardContent>
    </Card>
  );
}

export default function WalletCheckPage() {
  const { publicKey, disconnect } = useWallet();
  const displayAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-retro crt relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-background opacity-90" />
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="hsl(var(--primary))"
      />
      <BackgroundBeams className="absolute inset-0" />

      <header className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground">Lavinth</h1>
        <div className="flex items-center gap-4">
          {displayAddress && <span className="text-sm text-muted-foreground">{displayAddress}</span>}
          {publicKey && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                document.cookie = "wallet_address=; path=/; max-age=0";
                disconnect();
              }}
            >
              Disconnect
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl"
        >
          <ErrorBoundary FallbackComponent={WalletCheckErrorFallback}>
            <Suspense
              fallback={
                <Card className="bg-card border border-border backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex justify-center">
                      <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
                    </div>
                  </CardContent>
                </Card>
              }
            >
              <WalletCheckWithParams />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </main>
    </div>
  );
}
