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
  FileSearch,
  Search,
  Loader2,
  Clock,
  Shield,
  AlertTriangle,
  Users,
  ExternalLink,
  Copy,
  Coins,
  ListOrdered,
  ShieldAlert,
  CheckCircle2,
  XCircle,
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
interface ThreatActor {
  address: string;
  label: string | null;
  source: string;
  confidence: number;
}

interface AffectedAsset {
  mint: string;
  symbol: string;
  amount: number;
  status: "stolen" | "at_risk" | "safe";
}

interface TimelineEvent {
  id?: number;
  reportId: string;
  eventType: string;
  timestamp: string;
  signature: string | null;
  description: string;
  fromAddress: string | null;
  toAddress: string | null;
  amount: number | null;
  tokenMint: string | null;
  severity: string;
  metadata: any;
}

interface ForensicReport {
  reportId: string;
  walletAddress: string;
  attackVector: string;
  firstCompromiseAt: string | null;
  lastDrainAt: string | null;
  totalStolen: number;
  totalAtRisk: number;
  threatActors: ThreatActor[];
  affectedAssets: AffectedAsset[];
  executiveSummary: string;
  recommendations: string[];
  confidenceScore: number;
  status: string;
  createdAt: string;
  timeline?: TimelineEvent[];
}

export default function ForensicsTab() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch(
        `/api/forensics/analyze/${walletAddress}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run forensic analysis");
      }

      setReport(data.report);
      toast.success("Forensic analysis complete");
    } catch (err: any) {
      console.error("Forensic analysis error:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  const getAssetStatusColor = (status: string) => {
    switch (status) {
      case "stolen":
        return "bg-severity-critical text-white";
      case "at_risk":
        return "bg-severity-medium text-black";
      case "safe":
        return "bg-severity-low text-white";
      default:
        return "bg-muted-foreground text-white";
    }
  };

  const getAttackVectorLabel = (vector: string) => {
    switch (vector) {
      case "known_drainer":
        return "Known Drainer";
      case "malicious_approval":
        return "Malicious Approval";
      case "drainer_interaction":
        return "Drainer Interaction";
      case "authority_exploit":
        return "Authority Exploit";
      case "private_key_compromise":
        return "Private Key Compromise";
      case "phishing":
        return "Phishing";
      default:
        return "Unknown";
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "approval_granted":
        return "Approval Granted";
      case "fund_drain":
        return "Fund Drain";
      case "exchange_deposit":
        return "Exchange Deposit";
      case "bridge_transfer":
        return "Bridge Transfer";
      case "threat_detected":
        return "Threat Detected";
      default:
        return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold tracking-tight">
          Forensic Analysis
        </h2>
        <p className="text-muted-foreground">
          Deep forensic investigation of compromised wallets — attack timeline,
          vector identification, and threat actor attribution
        </p>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Analyze Wallet
          </CardTitle>
          <CardDescription>
            Enter a wallet address to run a comprehensive forensic analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter Solana wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
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

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-semibold mb-1">
              Running Forensic Analysis
            </p>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Fetching transactions, analyzing patterns, attributing threat
              actors, and building timeline. This may take a minute...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {report && !isAnalyzing && (
        <>
          {/* Attack Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Attack Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Attack Vector</p>
                  <Badge
                    variant={report.attackVector === "unknown" ? "outline" : "destructive"}
                    className={`text-sm px-3 py-1 ${
                      report.attackVector === "known_drainer"
                        ? "bg-red-600 text-white border-red-600"
                        : report.attackVector === "unknown"
                        ? ""
                        : ""
                    }`}
                  >
                    {getAttackVectorLabel(report.attackVector)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Confidence Score
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">
                      {report.confidenceScore}%
                    </span>
                    <Progress
                      value={report.confidenceScore}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Stolen</p>
                  <p className="text-2xl font-bold text-red-500">
                    {report.totalStolen.toFixed(4)} SOL
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total At Risk</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {report.totalAtRisk.toFixed(4)} SOL
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    First Compromise
                  </p>
                  <p className="text-sm font-medium">
                    {report.firstCompromiseAt
                      ? new Date(report.firstCompromiseAt).toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Drain</p>
                  <p className="text-sm font-medium">
                    {report.lastDrainAt
                      ? new Date(report.lastDrainAt).toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm">{report.executiveSummary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {report.timeline && report.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Attack Timeline ({report.timeline.length} events)
                </CardTitle>
                <CardDescription>
                  Chronological sequence of events related to the compromise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Signature</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.timeline.map((event, i) => (
                        <TableRow
                          key={i}
                          className={
                            event.severity === "critical"
                              ? "bg-severity-critical/5"
                              : event.severity === "high"
                              ? "bg-severity-high/5"
                              : ""
                          }
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getEventTypeLabel(event.eventType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getSeverityColor(event.severity)}
                            >
                              {event.severity.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {event.description}
                          </TableCell>
                          <TableCell className="text-sm">
                            {event.amount
                              ? `${event.amount.toFixed(4)} SOL`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {event.signature ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://solscan.io/tx/${event.signature}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                                    >
                                      {truncateAddress(event.signature)}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{event.signature}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected Assets */}
          {report.affectedAssets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Affected Assets ({report.affectedAssets.length})
                </CardTitle>
                <CardDescription>
                  Token inventory with risk classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Mint</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.affectedAssets.map((asset, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {asset.symbol}
                        </TableCell>
                        <TableCell>
                          {asset.mint === "SOL" ? (
                            "Native SOL"
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="font-mono text-xs hover:underline"
                                    onClick={() => copyToClipboard(asset.mint)}
                                  >
                                    {truncateAddress(asset.mint)}
                                    <Copy className="ml-1 h-3 w-3 inline" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{asset.mint}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell>{asset.amount.toFixed(4)}</TableCell>
                        <TableCell>
                          <Badge
                            className={getAssetStatusColor(asset.status)}
                          >
                            {asset.status === "stolen" && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {asset.status === "at_risk" && (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {asset.status === "safe" && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {asset.status.toUpperCase().replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Threat Actors */}
          {report.threatActors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Threat Actors ({report.threatActors.length})
                </CardTitle>
                <CardDescription>
                  Identified malicious addresses involved in the compromise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.threatActors.map((actor, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex items-center gap-1 font-mono text-xs hover:underline"
                                  onClick={() =>
                                    copyToClipboard(actor.address)
                                  }
                                >
                                  {truncateAddress(actor.address)}
                                  <Copy className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{actor.address}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {actor.label || (
                            <span className="text-muted-foreground">
                              Unknown
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{actor.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={actor.confidence * 100}
                              className="w-16"
                            />
                            <span className="text-sm">
                              {(actor.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  Recovery Recommendations
                </CardTitle>
                <CardDescription>
                  Prioritized steps to secure your wallet and recover funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm">
                      {rec}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!report && !isAnalyzing && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Forensic Analysis
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a Solana wallet address to run a deep forensic analysis.
              This will reconstruct the attack timeline, identify the attack
              vector, attribute threat actors, and generate recovery
              recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
