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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  Activity,
  Radar,
  DollarSign,
  Bell,
  FileText,
  Building2,
  ArrowRightLeft,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Types
interface CompromiseAlert {
  alertId: string;
  walletAddress: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  metadata: any;
  createdAt: string;
  isAcknowledged?: boolean;
}

interface WalletTransaction {
  signature: string;
  walletAddress: string;
  transactionType: string;
  amount: number;
  tokenMint?: string;
  counterparty?: string;
  isSuspicious: boolean;
  suspicionReasons: string[];
  riskScore: number;
  timestamp: string;
}

interface AnalysisResult {
  isCompromised: boolean;
  riskScore: number;
  alertCount: number;
  alerts: CompromiseAlert[];
  recentTransactions: WalletTransaction[];
}

interface FundTrace {
  traceId: string;
  sourceWallet: string;
  initialAmount: number;
  status: string;
  currentDepth: number;
  recoveryProbability: number;
  totalTracked: number;
  totalRecoverable: number;
  startedAt: string;
  completedAt?: string;
}

interface RecoveryReport {
  traceId: string;
  sourceWallet: string;
  totalStolen: number;
  tracingDepth: number;
  uniqueAddresses: number;
  totalTransactions: number;
  fundDistribution: {
    inExchanges: number;
    inBridges: number;
    inUnknown: number;
    remaining: number;
  };
  exchangeDeposits: any[];
  bridgeTransfers: any[];
  recoveryProbability: number;
  recommendedActions: string[];
}

export default function RecoveryTab() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [traces, setTraces] = useState<FundTrace[]>([]);
  const [selectedReport, setSelectedReport] = useState<RecoveryReport | null>(null);
  const [traceAmount, setTraceAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Analyze wallet for compromise
  const handleAnalyzeWallet = async () => {
    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/compromise/analyze/${walletAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze wallet");
      }

      setAnalysisResult(data);

      // Also fetch existing traces for this wallet
      await fetchTraces();

      if (data.isCompromised) {
        toast.error("Warning: Potential compromise detected!");
      } else {
        toast.success("No signs of compromise detected");
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fetch traces for wallet
  const fetchTraces = async () => {
    try {
      const response = await fetch(`/api/funds/traces/${walletAddress}`);
      const data = await response.json();

      if (response.ok) {
        setTraces(data.traces || []);
      }
    } catch (err) {
      console.error("Error fetching traces:", err);
    }
  };

  // Start fund trace
  const handleStartTrace = async () => {
    if (!walletAddress.trim() || !traceAmount.trim()) {
      toast.error("Please enter wallet address and amount to trace");
      return;
    }

    setIsTracing(true);

    try {
      const response = await fetch("/api/funds/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWallet: walletAddress,
          initialAmount: parseFloat(traceAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start trace");
      }

      toast.success(`Tracing ${traceAmount} SOL from wallet`);

      // Refresh traces
      await fetchTraces();
    } catch (err: any) {
      console.error("Trace error:", err);
      toast.error(err.message);
    } finally {
      setIsTracing(false);
    }
  };

  // Get recovery report
  const handleViewReport = async (traceId: string) => {
    try {
      const response = await fetch(`/api/funds/report/${traceId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      setSelectedReport(data);
    } catch (err: any) {
      console.error("Report error:", err);
      toast.error(err.message);
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/compromise/alerts/${alertId}/acknowledge`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to acknowledge alert");
      }

      // Refresh analysis
      await handleAnalyzeWallet();

      toast.success("Alert has been marked as acknowledged");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Copy address
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Truncate address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Severity colors
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-severity-critical text-white";
      case "high":
        return "bg-severity-high text-white";
      case "medium":
        return "bg-severity-medium text-black";
      case "low":
        return "bg-severity-low text-white";
      default:
        return "bg-muted-foreground text-white";
    }
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-severity-low";
      case "in_progress":
        return "bg-primary";
      case "partial":
        return "bg-severity-medium";
      case "funds_recovered":
        return "bg-severity-low";
      case "funds_lost":
        return "bg-severity-critical";
      default:
        return "bg-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight">Wallet Recovery</h2>
          <p className="text-muted-foreground">
            Detect compromises, track stolen funds, and coordinate recovery
          </p>
        </div>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5" />
            Analyze Wallet
          </CardTitle>
          <CardDescription>
            Enter a wallet address to check for signs of compromise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter Solana wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeWallet()}
              className="flex-1"
            />
            <Button onClick={handleAnalyzeWallet} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze
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

      {/* Analysis Results */}
      {analysisResult && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Activity className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="mr-2 h-4 w-4" />
              Alerts ({analysisResult.alertCount})
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="traces">
              <Eye className="mr-2 h-4 w-4" />
              Fund Traces ({traces.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult.isCompromised ? (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-8 w-8 text-red-500" />
                      <span className="text-xl font-bold text-red-500">
                        COMPROMISED
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span className="text-xl font-bold text-green-500">
                        SECURE
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold">
                      {analysisResult.riskScore}
                    </div>
                    <Progress
                      value={analysisResult.riskScore}
                      className="flex-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Bell className="h-8 w-8 text-orange-500" />
                    <span className="text-3xl font-bold">
                      {analysisResult.alertCount}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
                    <span className="text-3xl font-bold">
                      {analysisResult.recentTransactions.length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compromise Warning */}
            {analysisResult.isCompromised && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Wallet Potentially Compromised</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    We&apos;ve detected suspicious activity on this wallet. Review the
                    alerts and consider starting a fund trace to track stolen
                    assets.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Start Fund Trace
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start Fund Trace</DialogTitle>
                          <DialogDescription>
                            Enter the amount of SOL stolen to begin tracing the
                            funds across the blockchain.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Source Wallet</Label>
                            <Input value={walletAddress} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Amount Stolen (SOL)</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 10.5"
                              value={traceAmount}
                              onChange={(e) => setTraceAmount(e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={handleStartTrace}
                            disabled={isTracing}
                            className="w-full"
                          >
                            {isTracing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting Trace...
                              </>
                            ) : (
                              "Start Trace"
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Security Alerts</CardTitle>
                <CardDescription>
                  Detected threats and suspicious activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult.alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No alerts detected</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisResult.alerts.map((alert) => (
                      <Alert
                        key={alert.alertId}
                        variant={
                          alert.severity === "critical" ||
                          alert.severity === "high"
                            ? "destructive"
                            : "default"
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="flex items-center justify-between">
                          <span>{alert.title}</span>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>{alert.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Type: {alert.alertType.replace(/_/g, " ")}
                            </span>
                            <span>
                              {new Date(alert.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {!alert.isAcknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleAcknowledgeAlert(alert.alertId)
                              }
                            >
                              Acknowledge
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Transaction history with suspicious activity flagged
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult.recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent transactions found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Signature</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.recentTransactions.map((tx) => (
                        <TableRow
                          key={tx.signature}
                          className={tx.isSuspicious ? "bg-severity-critical/5" : ""}
                        >
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-mono text-xs"
                                    onClick={() => copyToClipboard(tx.signature)}
                                  >
                                    {truncateAddress(tx.signature)}
                                    <Copy className="ml-1 h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{tx.signature}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {tx.transactionType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.amount.toFixed(4)} SOL</TableCell>
                          <TableCell>
                            {tx.counterparty
                              ? truncateAddress(tx.counterparty)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  tx.riskScore > 30 ? "destructive" : "secondary"
                                }
                              >
                                {tx.riskScore}
                              </Badge>
                              {tx.isSuspicious && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(tx.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fund Traces Tab */}
          <TabsContent value="traces">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Fund Traces</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <DollarSign className="mr-2 h-4 w-4" />
                        New Trace
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Start Fund Trace</DialogTitle>
                        <DialogDescription>
                          Track stolen funds across the blockchain
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Source Wallet</Label>
                          <Input value={walletAddress} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount Stolen (SOL)</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 10.5"
                            value={traceAmount}
                            onChange={(e) => setTraceAmount(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleStartTrace}
                          disabled={isTracing}
                          className="w-full"
                        >
                          {isTracing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            "Start Trace"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Track stolen funds and generate recovery reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {traces.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4" />
                    <p>No fund traces started</p>
                    <p className="text-sm">
                      Start a trace to track stolen funds
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trace ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Depth</TableHead>
                        <TableHead>Recovery %</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {traces.map((trace) => (
                        <TableRow key={trace.traceId}>
                          <TableCell className="font-mono text-xs">
                            {truncateAddress(trace.traceId)}
                          </TableCell>
                          <TableCell>
                            {trace.initialAmount.toFixed(4)} SOL
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(trace.status)}>
                              {trace.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{trace.currentDepth} hops</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={trace.recoveryProbability}
                                className="w-16"
                              />
                              <span className="text-sm">
                                {trace.recoveryProbability}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(trace.startedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewReport(trace.traceId)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Report
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Recovery Report</DialogTitle>
                                  <DialogDescription>
                                    Fund tracking analysis and recovery
                                    recommendations
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedReport && (
                                  <div className="space-y-4 py-4">
                                    {/* Summary */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                          Total Stolen
                                        </p>
                                        <p className="text-xl font-bold">
                                          {selectedReport.totalStolen.toFixed(4)}{" "}
                                          SOL
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                          Recovery Probability
                                        </p>
                                        <p className="text-xl font-bold text-green-500">
                                          {selectedReport.recoveryProbability}%
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                          Addresses Traced
                                        </p>
                                        <p className="text-xl font-bold">
                                          {selectedReport.uniqueAddresses}
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                          Transactions
                                        </p>
                                        <p className="text-xl font-bold">
                                          {selectedReport.totalTransactions}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Fund Distribution */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold">
                                        Fund Distribution
                                      </h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            In Exchanges
                                          </span>
                                          <span className="font-medium text-green-500">
                                            {selectedReport.fundDistribution.inExchanges.toFixed(
                                              4
                                            )}{" "}
                                            SOL
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="flex items-center gap-2">
                                            <ArrowRightLeft className="h-4 w-4" />
                                            In Bridges
                                          </span>
                                          <span className="font-medium text-orange-500">
                                            {selectedReport.fundDistribution.inBridges.toFixed(
                                              4
                                            )}{" "}
                                            SOL
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Unknown
                                          </span>
                                          <span className="font-medium text-muted-foreground">
                                            {selectedReport.fundDistribution.inUnknown.toFixed(
                                              4
                                            )}{" "}
                                            SOL
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Exchange Deposits */}
                                    {selectedReport.exchangeDeposits.length >
                                      0 && (
                                      <div className="space-y-2">
                                        <h4 className="font-semibold">
                                          Exchange Deposits
                                        </h4>
                                        {selectedReport.exchangeDeposits.map(
                                          (deposit, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center justify-between p-2 bg-muted rounded"
                                            >
                                              <div>
                                                <p className="font-medium">
                                                  {deposit.exchangeName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {truncateAddress(
                                                    deposit.exchangeAddress
                                                  )}
                                                </p>
                                              </div>
                                              <p className="font-bold">
                                                {deposit.amount.toFixed(4)} SOL
                                              </p>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}

                                    {/* Recommended Actions */}
                                    <div className="space-y-2">
                                      <h4 className="font-semibold">
                                        Recommended Actions
                                      </h4>
                                      <ul className="list-disc pl-4 space-y-1">
                                        {selectedReport.recommendedActions.map(
                                          (action, i) => (
                                            <li
                                              key={i}
                                              className="text-sm text-muted-foreground"
                                            >
                                              {action}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!analysisResult && !isAnalyzing && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Analyze Wallet for Compromise
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a Solana wallet address to scan for signs of compromise,
              track suspicious transactions, and coordinate fund recovery.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
