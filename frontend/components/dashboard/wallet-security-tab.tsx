"use client";

import { useState, useEffect } from "react";
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
  Trash2,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmergencyRecoveryModal } from "./emergency-recovery-modal";

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

export default function WalletSecurityTab() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [profile, setProfile] = useState<SecurityProfile | null>(null);
  const [approvals, setApprovals] = useState<TokenApproval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const { toast } = useToast();

  // Scan wallet for approvals
  const handleScanWallet = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(`/api/approvals/scan/${walletAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan wallet");
      }

      setProfile(data.profile);
      setApprovals(data.profile?.approvals || []);

      toast({
        title: "Scan Complete",
        description: `Found ${data.profile?.totalApprovals || 0} token approvals`,
      });
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message);
      toast({
        title: "Scan Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get risk badge variant
  const getRiskBadgeVariant = (score: number) => {
    if (score >= 75) return "destructive";
    if (score >= 50) return "default";
    if (score >= 25) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Wallet Security</h2>
          <p className="text-muted-foreground">
            Scan your wallet for risky token approvals and revoke them
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
            Enter a Solana wallet address to scan for token approvals
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

      {/* Security Profile */}
      {profile && (
        <>
          {/* Security Score Card */}
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
                <Badge
                  className={`mt-2 ${getRiskLevelColor(profile.riskLevel)}`}
                >
                  {profile.riskLevel.toUpperCase()} RISK
                </Badge>
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

          {/* Emergency Action */}
          {(profile.highRiskApprovals > 0 || profile.unlimitedApprovals > 0) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Your wallet has {profile.highRiskApprovals} high-risk and{" "}
                  {profile.unlimitedApprovals} unlimited approvals that should be
                  revoked.
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowEmergencyModal(true)}
                >
                  Emergency Revoke All
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Approvals Table */}
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
                All active token delegate approvals for this wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active token approvals found</p>
                  <p className="text-sm">Your wallet is secure</p>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map((approval, index) => (
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
                          <div className="flex gap-2 justify-end">
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
                          </div>
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
              Enter your Solana wallet address above to scan for token approvals.
              We&apos;ll analyze each approval and identify any potential risks.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Emergency Recovery Modal */}
      <EmergencyRecoveryModal
        open={showEmergencyModal}
        onOpenChange={setShowEmergencyModal}
        walletAddress={walletAddress}
        approvals={approvals}
        onSuccess={() => {
          handleScanWallet();
          setShowEmergencyModal(false);
        }}
      />
    </div>
  );
}
