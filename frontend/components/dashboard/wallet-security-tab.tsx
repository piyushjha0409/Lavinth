"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  ShieldAlert,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types
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

interface SecurityProfile {
  walletAddress: string;
  totalApprovals: number;
  highRiskApprovals: number;
  unlimitedApprovals: number;
  securityScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  approvals: TokenApproval[];
}

interface ThreatIntelResult {
  status: string;
  isFlagged: boolean;
  riskScore: number;
  message: string;
  details: {
    label: string;
    category: string;
    sources: string[];
  } | null;
  goPlusRisk: {
    isRisky: boolean;
    riskFlags: string[];
  } | null;
}

export default function WalletSecurityTab() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelResult | null>(null);
  // Scan wallet for approvals and threat intelligence
  const handleScanWallet = async () => {
    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setIsScanning(true);
    setError(null);
    setThreatIntel(null);

    try {
      const [approvalResult, threatResult] = await Promise.allSettled([
        fetch(`/api/approvals/scan/${walletAddress}`),
        fetch(`/api/wallet-check/${walletAddress}`),
      ]);

      // Process approval result
      if (approvalResult.status === "fulfilled") {
        if (!approvalResult.value.ok) {
          const text = await approvalResult.value.text();
          let errorMsg = "Failed to scan wallet";
          try { errorMsg = JSON.parse(text).error || errorMsg; } catch {}
          throw new Error(errorMsg);
        }
        const approvalData = await approvalResult.value.json();
        setProfile(approvalData.profile);
      } else {
        throw new Error(approvalResult.reason?.message || "Failed to scan wallet");
      }

      // Process threat intel result (non-blocking — approval scan still shows if this fails)
      try {
        if (threatResult.status === "fulfilled" && threatResult.value.ok) {
          const text = await threatResult.value.text();
          const threatData = JSON.parse(text);
          setThreatIntel(threatData);
        }
      } catch (e) {
        console.warn("Threat intel response was not valid JSON, skipping");
      }

      toast.success(`Scan finished for ${walletAddress.slice(0, 8)}...`);
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard");
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-severity-critical";
      case "high":
        return "bg-severity-high";
      case "medium":
        return "bg-severity-medium";
      case "low":
        return "bg-severity-low";
      default:
        return "bg-muted-foreground";
    }
  };

  // Get risk badge variant
  const getRiskBadgeVariant = (score: number) => {
    if (score >= 75) return "destructive";
    if (score >= 50) return "default";
    if (score >= 25) return "secondary";
    return "outline";
  };

  const scannedApprovals = profile?.approvals || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight">Wallet Security</h2>
          <p className="text-muted-foreground">
            Scan any address for threat intelligence flags and risky token approvals
          </p>
        </div>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Scan Wallet
          </CardTitle>
          <CardDescription>
            Enter a Solana wallet address to check threat intelligence and scan for token approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter Solana wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScanWallet()}
              className="flex-1"
            />
            <Button onClick={handleScanWallet} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Scan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Threat Intelligence Alert */}
      {threatIntel && (
        threatIntel.isFlagged ? (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              Warning: Potentially Malicious Address
            </AlertTitle>
            <AlertDescription>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Threat Risk Score</span>
                    <span className="text-sm font-bold text-red-400">
                      {Math.round(threatIntel.riskScore * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={threatIntel.riskScore * 100}
                    className="h-2"
                  />
                </div>
                {threatIntel.details && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Label:</span>
                      <span className="font-medium">{threatIntel.details.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{threatIntel.details.category}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-muted-foreground">Sources:</span>
                      {threatIntel.details.sources.map((source) => (
                        <Badge key={source} variant="outline" className="text-xs border-red-500/50 text-red-400">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {threatIntel.goPlusRisk && (
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">GoPlus Flags:</span>
                    {threatIntel.goPlusRisk.riskFlags.map((flag) => (
                      <Badge key={flag} variant="destructive" className="text-xs">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-green-400">Address Not Flagged</AlertTitle>
            <AlertDescription className="text-green-300/80">
              This address is not flagged in threat intelligence databases or GoPlus real-time checks.
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Security Profile */}
      {profile && (
        <>
          {/* Security Score Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Security Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">{profile.securityScore}</div>
                  <Progress value={profile.securityScore} className="flex-1" />
                </div>
                {threatIntel?.isFlagged ? (
                  <Badge className="mt-2 bg-red-500">
                    FLAGGED
                  </Badge>
                ) : (
                  <Badge
                    className={`mt-2 ${getRiskLevelColor(profile.riskLevel)}`}
                  >
                    {profile.riskLevel.toUpperCase()} RISK
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                  <span className="text-3xl font-bold">
                    {profile.totalApprovals}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-8 w-8 text-red-500" />
                  <span className="text-3xl font-bold text-red-500">
                    {profile.highRiskApprovals}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Unlimited
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                  <span className="text-3xl font-bold text-orange-500">
                    {profile.unlimitedApprovals}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Read-only Approvals Table for scanned address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Token Approvals</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScanWallet}
                  disabled={isScanning}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                All active token delegate approvals for the scanned address
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scannedApprovals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active token approvals found</p>
                  <p className="text-sm">This address has no outstanding delegations</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Delegate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scannedApprovals.map((approval, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-mono text-xs"
                                  onClick={() => copyToClipboard(approval.tokenMint)}
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
                            <span>{approval.delegatedAmount.toLocaleString()}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeVariant(approval.riskScore)}>
                            {approval.riskScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {approval.riskFactors.isKnownMalicious && (
                              <Badge variant="destructive" className="text-xs">
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
        </>
      )}

      {/* Empty State */}
      {!profile && !isScanning && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Check Your Wallet Security
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a Solana wallet address above to check against threat intelligence
              databases and scan for risky token approvals.
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
