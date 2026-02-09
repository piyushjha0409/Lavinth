"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Search, ShieldAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

interface WalletCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletCheckModal({ isOpen, onClose }: WalletCheckModalProps) {
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
      const response = await fetch(`/api/wallet-check/${walletAddress}`);

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

  const handleClose = () => {
    setWalletAddress("");
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Wallet Address Security Check
          </DialogTitle>
          <DialogDescription className="text-center">
            Check if a Solana wallet address is flagged as potentially malicious
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Enter Solana wallet address"
                value={walletAddress}
                onChange={handleInputChange}
                className="flex-1 pr-10"
              />
              {walletAddress && (
                <button
                  type="button"
                  onClick={() => setWalletAddress("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span className="sr-only">Clear input</span>
                </button>
              )}
            </div>
            <Button
              onClick={checkWallet}
              disabled={isLoading}
              className="gap-2"
              variant="default"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isLoading ? "Checking..." : "Check Wallet"}
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-md p-4 text-destructive flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mt-4">
                <div className="flex flex-col gap-4">
                  <Card
                    className={
                      result.isFlagged
                        ? "border-destructive shadow-sm shadow-destructive/20"
                        : "border-green-500 shadow-sm shadow-green-500/20"
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {result.isFlagged ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {result.isFlagged
                          ? "Warning: Potentially Malicious Address"
                          : "Safe: No Threats Detected"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{result.message}</p>
                    </CardContent>
                  </Card>

                  {result.riskScore !== undefined && result.isFlagged && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                          Risk Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Risk Level
                            </span>
                            <span className="text-sm font-medium">
                              {result.riskScore.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                result.riskScore > 0.7
                                  ? "bg-destructive"
                                  : result.riskScore > 0.4
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${result.riskScore * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Safe</span>
                            <span>High Risk</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {result.details && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5" />
                          Threat Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
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
                      </CardContent>
                    </Card>
                  )}

                  {result.goPlusRisk && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          GoPlus Risk Flags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          {result.goPlusRisk.riskFlags.map((flag, i) => (
                            <p key={i} className="text-destructive">{flag}</p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div className="text-sm text-muted-foreground mt-6 border-t pt-4">
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-info mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p>
                This tool checks if a Solana wallet address has been identified
                as potentially malicious using threat intelligence from multiple
                sources including GoPlus and Phantom Blocklist.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
