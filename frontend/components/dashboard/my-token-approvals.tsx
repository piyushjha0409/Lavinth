"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Wallet,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (m) => m.WalletMultiButton
    ),
  { ssr: false }
);

interface TokenApproval {
  walletAddress: string;
  tokenMint: string;
  tokenAccount: string;
  delegateAddress: string;
  delegatedAmount: number;
  isUnlimited: boolean;
  riskScore: number;
  riskFactors: {
    isKnownMalicious: boolean;
    isUnlimited: boolean;
    isNewDelegate: boolean;
    hasHighVolume: boolean;
    victimCount?: number;
    reportedLosses?: number;
  };
  delegateLabel?: string;
  status: string;
}

type RevocationStep =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "complete"
  | "error";

export default function MyTokenApprovals() {
  const { publicKey, connected, signAllTransactions } = useWallet();
  const { toast } = useToast();

  const [approvals, setApprovals] = useState<TokenApproval[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Revocation state
  const [revocationStep, setRevocationStep] = useState<RevocationStep>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<string[]>([]);
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [signatures, setSignatures] = useState<string[]>([]);
  const [revocationError, setRevocationError] = useState<string | null>(null);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Address copied to clipboard" });
  };

  const getRiskBadgeVariant = (score: number) => {
    if (score >= 75) return "destructive" as const;
    if (score >= 50) return "default" as const;
    if (score >= 25) return "secondary" as const;
    return "outline" as const;
  };

  // Scan connected wallet for approvals
  const scanWallet = useCallback(async () => {
    if (!publicKey) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch(
        `/api/approvals/scan/${publicKey.toBase58()}`
      );

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = "Failed to scan wallet";
        try {
          errorMsg = JSON.parse(text).error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const walletApprovals: TokenApproval[] =
        data.profile?.approvals || [];
      setApprovals(walletApprovals);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to scan wallet";
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  }, [publicKey]);

  // Auto-scan when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      scanWallet();
    } else {
      setApprovals([]);
      setSelectedIds(new Set());
    }
  }, [connected, publicKey, scanWallet]);

  // Selection handlers
  const toggleSelect = (tokenAccount: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tokenAccount)) {
        next.delete(tokenAccount);
      } else {
        next.add(tokenAccount);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvals.map((a) => a.tokenAccount)));
    }
  };

  const selectedApprovals = approvals.filter((a) =>
    selectedIds.has(a.tokenAccount)
  );

  // Revocation flow
  const handleRevokeSelected = async () => {
    if (!publicKey || selectedApprovals.length === 0) return;

    setRevocationStep("building");
    setRevocationError(null);
    setSignatures([]);

    try {
      const response = await fetch("/api/approvals/revoke-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          approvals: selectedApprovals,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to build revocation plan");
      }

      setSessionId(data.sessionId);
      setTransactions(data.transactions);
      setEstimatedFee(data.estimatedTotalFee);
      setRevocationStep("signing");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to build revocation";
      setRevocationError(message);
      setRevocationStep("error");
    }
  };

  const handleSign = async () => {
    if (!connected || !signAllTransactions) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to sign transactions.",
        variant: "destructive",
      });
      return;
    }

    try {
      const txObjects = transactions.map((txBase64) => {
        const buffer = Buffer.from(txBase64, "base64");
        return Transaction.from(buffer);
      });

      const signedTxs = await signAllTransactions(txObjects);
      const signedBase64 = signedTxs.map((tx) =>
        tx.serialize().toString("base64")
      );

      await handleSubmit(signedBase64);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign transactions";
      setRevocationError(message);
      setRevocationStep("error");
    }
  };

  const handleSubmit = async (signedTransactions: string[]) => {
    if (!sessionId) return;

    setRevocationStep("submitting");

    try {
      const response = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, signedTransactions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit transactions");
      }

      setSignatures(data.signatures || []);
      setRevocationStep("complete");

      toast({
        title: "Revocation Complete",
        description: `Successfully revoked ${data.totalRevoked} approval(s)`,
      });

      // Auto-rescan after a short delay
      setTimeout(() => {
        resetRevocation();
        scanWallet();
      }, 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit transactions";
      setRevocationError(message);
      setRevocationStep("error");
    }
  };

  const resetRevocation = () => {
    setRevocationStep("idle");
    setSessionId(null);
    setTransactions([]);
    setEstimatedFee(0);
    setSignatures([]);
    setRevocationError(null);
  };

  // Not connected state
  if (!connected || !publicKey) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Connect your wallet to manage token approvals and revoke
            unwanted delegations.
          </p>
          <WalletMultiButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scan error */}
      {scanError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Scan Error</AlertTitle>
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      )}

      {/* Revocation inline flow */}
      {revocationStep !== "idle" && (
        <Card>
          <CardContent className="py-6">
            {/* Building */}
            {revocationStep === "building" && (
              <div className="text-center py-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-blue-500" />
                <p className="font-medium">Building Revocation Transactions...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Preparing {selectedApprovals.length} revocation(s)
                </p>
              </div>
            )}

            {/* Signing */}
            {revocationStep === "signing" && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <Shield className="h-10 w-10 mx-auto mb-3 text-blue-500" />
                  <p className="font-medium">Ready to Sign</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {transactions.length} transaction(s) prepared
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Transaction Summary</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>
                      {selectedApprovals.length} approval(s) will be revoked
                    </li>
                    <li>
                      {transactions.length} transaction(s) to sign
                    </li>
                    <li>
                      Estimated fee: ~{(estimatedFee / 1e9).toFixed(6)} SOL
                    </li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetRevocation}>
                    Cancel
                  </Button>
                  <Button onClick={handleSign}>Sign & Submit</Button>
                </div>
              </div>
            )}

            {/* Submitting */}
            {revocationStep === "submitting" && (
              <div className="text-center py-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-blue-500" />
                <p className="font-medium">Submitting Transactions...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Broadcasting to Solana network
                </p>
              </div>
            )}

            {/* Complete */}
            {revocationStep === "complete" && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium text-green-500">
                    Revocation Complete!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rescanning wallet...
                  </p>
                </div>

                {signatures.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Transaction Signatures:
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {signatures.map((sig, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                        >
                          <span className="font-mono">
                            {sig.slice(0, 20)}...{sig.slice(-8)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(sig)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                window.open(
                                  `https://solscan.io/tx/${sig}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {revocationStep === "error" && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <XCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
                  <p className="font-medium text-red-500">Revocation Failed</p>
                </div>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{revocationError}</AlertDescription>
                </Alert>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetRevocation}>
                    Cancel
                  </Button>
                  <Button onClick={handleRevokeSelected}>Try Again</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Token Approvals
            </span>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && revocationStep === "idle" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokeSelected}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke Selected ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={scanWallet}
                disabled={isScanning}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Active token delegate approvals for your connected wallet (
            {truncateAddress(publicKey.toBase58())})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isScanning ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Scanning approvals...</p>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No active token approvals found</p>
              <p className="text-sm">Your wallet has no outstanding delegations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedIds.size === approvals.length
                          ? true
                          : selectedIds.size > 0
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all approvals"
                    />
                  </TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Delegate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => (
                  <TableRow
                    key={approval.tokenAccount}
                    className={
                      selectedIds.has(approval.tokenAccount)
                        ? "bg-muted/50"
                        : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(approval.tokenAccount)}
                        onCheckedChange={() =>
                          toggleSelect(approval.tokenAccount)
                        }
                        aria-label={`Select ${approval.tokenMint}`}
                      />
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-mono text-xs"
                              onClick={() =>
                                copyToClipboard(approval.tokenMint)
                              }
                            >
                              {truncateAddress(approval.tokenMint)}
                              <Copy className="ml-1 h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{approval.tokenMint}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-mono text-xs"
                                onClick={() =>
                                  copyToClipboard(approval.delegateAddress)
                                }
                              >
                                {truncateAddress(approval.delegateAddress)}
                                <Copy className="ml-1 h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{approval.delegateAddress}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {approval.delegateLabel && (
                          <Badge variant="outline" className="text-xs">
                            {approval.delegateLabel}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {approval.isUnlimited ? (
                        <Badge variant="destructive">Unlimited</Badge>
                      ) : (
                        <span>
                          {approval.delegatedAmount.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getRiskBadgeVariant(approval.riskScore)}
                      >
                        {approval.riskScore}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {approval.riskFactors.isKnownMalicious && (
                          <Badge
                            variant="destructive"
                            className="text-xs"
                          >
                            Malicious
                          </Badge>
                        )}
                        {approval.riskFactors.isUnlimited && (
                          <Badge variant="secondary" className="text-xs">
                            Unlimited
                          </Badge>
                        )}
                        {approval.riskFactors.isNewDelegate && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                window.open(
                                  `https://solscan.io/account/${approval.delegateAddress}`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View on Solscan</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
