"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Spotlight } from "@/components/ui/spotlight";

interface WalletCheckResult {
  status: string;
  isDusted: boolean;
  riskScore: number;
  message: string;
  error?: string;
}

export default function WalletCheckPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WalletCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
  };

  const checkWallet = async () => {
    if (!walletAddress || walletAddress.trim() === "") {
      setError("Please enter a wallet address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`https://solanashield.ddns.net/api/check-wallet/${walletAddress}`);
      const data = await response.json();

      if (data.status === "error") {
        setError(data.message || "An error occurred while checking the wallet address");
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

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black via-purple-950 to-black text-white font-retro crt relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black via-indigo-950 to-black opacity-90" />
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="#00ffff"
      />
      <BackgroundBeams className="absolute inset-0" />

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl"
        >
          <Card className="bg-black/50 border border-cyan-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,255,0.3)]">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-300 to-cyan-400">
                Wallet Address Security Check
              </CardTitle>
              <CardDescription className="text-center text-gray-300">
                Check if a Solana wallet address is flagged as a potential dusting source
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
                    className="flex-1 bg-black/30 border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-fuchsia-500"
                  />
                  <Button
                    onClick={checkWallet}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white border-none shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all duration-300"
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
                    className={`p-4 ${result.isDusted ? 'bg-red-900/30 border-red-500/50 text-red-200' : 'bg-green-900/30 border-green-500/50 text-green-200'} border rounded-md`}
                  >
                    <div className="flex items-start gap-3">
                      {result.isDusted ? (
                        <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                      ) : (
                        <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                      )}
                      <div className="space-y-2">
                        <h3 className={`font-bold ${result.isDusted ? 'text-red-300' : 'text-green-300'}`}>
                          {result.isDusted ? 'Warning: Potential Dusting Source Detected' : 'Wallet Address is Safe'}
                        </h3>
                        <p>{result.message}</p>
                        {result.isDusted && (
                          <div className="mt-2">
                            <div className="text-sm text-red-300">Risk Score</div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                              <div 
                                className="bg-gradient-to-r from-yellow-500 to-red-500 h-2.5 rounded-full" 
                                style={{ width: `${result.riskScore * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-right mt-1">{(result.riskScore * 100).toFixed(2)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="text-sm text-gray-400 mt-4">
                  <p className="text-center">This tool checks if a Solana wallet address has been identified as a potential source of dusting attacks. Dusting attacks involve sending small amounts of tokens to many wallets to track them or for phishing purposes.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
