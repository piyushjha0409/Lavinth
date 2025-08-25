"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Search } from "lucide-react";

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

interface AttackerDetails {
  smallTransfersCount: number;
  uniqueVictimsCount: number;
  temporalPattern:
    | string
    | {
        burstCount: number;
        regularityScore: number;
        averageTimeBetweenTransfers: number;
      };
  networkPattern:
    | string
    | {
        clusterSize: number;
        centralityScore: number;
        recipientOverlap: number;
      };
  behavioralIndicators:
    | string
    | {
        usesNewAccounts: boolean;
        targetsPremiumWallets: boolean;
        usesScriptedTransactions: boolean;
        hasAbnormalFundingPattern: boolean;
      };
  lastUpdated: string;
}

interface WalletCheckResult {
  status: string;
  isDusted: boolean;
  riskScore: number;
  message: string;
  attackerDetails?: AttackerDetails;
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

  const parseJsonField = (field: string | object): any => {
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch (e) {
        console.error("Error parsing JSON field:", e);
        return {};
      }
    }
    return field;
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
            Check if a Solana wallet address is flagged as a potential dusting
            source
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
                      result.isDusted
                        ? "border-destructive shadow-sm shadow-destructive/20"
                        : "border-green-500 shadow-sm shadow-green-500/20"
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {result.isDusted ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {result.isDusted
                          ? "Warning: Potential Dusting Source Detected"
                          : "Safe: No Dusting Activity Detected"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{result.message}</p>
                    </CardContent>
                  </Card>

                  {result.riskScore !== undefined && (
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

                  {result.attackerDetails && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-shield-alert"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M12 8v4" />
                            <path d="M12 16h.01" />
                          </svg>
                          Attacker Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-activity"
                              >
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                              </svg>
                              Activity
                            </h4>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="text-muted-foreground">
                                  Small Transfers:
                                </span>{" "}
                                {result.attackerDetails.smallTransfersCount}
                              </p>
                              <p>
                                <span className="text-muted-foreground">
                                  Unique Victims:
                                </span>{" "}
                                {result.attackerDetails.uniqueVictimsCount}
                              </p>
                              <p>
                                <span className="text-muted-foreground">
                                  Last Updated:
                                </span>{" "}
                                {new Date(
                                  result.attackerDetails.lastUpdated
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-clock"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Temporal Pattern
                            </h4>
                            <div className="space-y-1 text-sm">
                              {(() => {
                                const temporal = parseJsonField(
                                  result.attackerDetails.temporalPattern
                                );
                                return (
                                  <>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Burst Count:
                                      </span>{" "}
                                      {temporal.burstCount || 0}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Regularity Score:
                                      </span>{" "}
                                      {(temporal.regularityScore || 0).toFixed(
                                        2
                                      )}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Avg Time Between:
                                      </span>{" "}
                                      {temporal.averageTimeBetweenTransfers ||
                                        0}
                                      min
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-network"
                              >
                                <rect
                                  x="16"
                                  y="16"
                                  width="6"
                                  height="6"
                                  rx="1"
                                />
                                <rect
                                  x="2"
                                  y="16"
                                  width="6"
                                  height="6"
                                  rx="1"
                                />
                                <rect x="9" y="2" width="6" height="6" rx="1" />
                                <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
                                <path d="M12 12V8" />
                              </svg>
                              Network Pattern
                            </h4>
                            <div className="space-y-1 text-sm">
                              {(() => {
                                const network = parseJsonField(
                                  result.attackerDetails.networkPattern
                                );
                                return (
                                  <>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Cluster Size:
                                      </span>{" "}
                                      {network.clusterSize || 0}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Centrality Score:
                                      </span>{" "}
                                      {(network.centralityScore || 0).toFixed(
                                        2
                                      )}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Recipient Overlap:
                                      </span>{" "}
                                      {(network.recipientOverlap || 0).toFixed(
                                        2
                                      )}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-brain-circuit"
                              >
                                <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z" />
                                <path d="M16 8V5c0-1.1.9-2 2-2" />
                                <path d="M12 13h4" />
                                <path d="M12 18h6a2 2 0 0 1 2 2v1" />
                                <path d="M12 8h8" />
                                <path d="M20.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                <path d="M16.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                <path d="M20.5 21a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                <path d="M20.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                              </svg>
                              Behavioral Indicators
                            </h4>
                            <div className="space-y-1 text-sm">
                              {(() => {
                                const behavior = parseJsonField(
                                  result.attackerDetails.behavioralIndicators
                                );
                                return (
                                  <>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Uses New Accounts:
                                      </span>{" "}
                                      {behavior.usesNewAccounts ? "Yes" : "No"}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Targets Premium Wallets:
                                      </span>{" "}
                                      {behavior.targetsPremiumWallets
                                        ? "Yes"
                                        : "No"}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Uses Scripted Transactions:
                                      </span>{" "}
                                      {behavior.usesScriptedTransactions
                                        ? "Yes"
                                        : "No"}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Abnormal Funding Pattern:
                                      </span>{" "}
                                      {behavior.hasAbnormalFundingPattern
                                        ? "Yes"
                                        : "No"}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
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
                as a potential source of dusting attacks. Dusting attacks
                involve sending small amounts of tokens to many wallets to track
                them or for phishing purposes.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
