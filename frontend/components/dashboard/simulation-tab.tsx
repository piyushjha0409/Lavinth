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
import { Textarea } from "@/components/ui/textarea";
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
  ShieldX,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  Loader2,
  PlayCircle,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ArrowRightLeft,
  Coins,
  Key,
  Code,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Types
interface SimulationWarning {
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
  details?: Record<string, any>;
}

interface BalanceChange {
  tokenAddress: string;
  tokenSymbol?: string;
  before: number;
  after: number;
  change: number;
  isNative: boolean;
}

interface ApprovalChange {
  tokenAddress: string;
  tokenSymbol?: string;
  spenderAddress: string;
  spenderLabel?: string;
  isKnownSpender: boolean;
  previousAmount: number | null;
  newAmount: number | "unlimited";
  isRevoke: boolean;
  riskLevel: string;
}

interface ProgramInfo {
  programId: string;
  programName?: string;
  category?: string;
  isVerified: boolean;
  isAudited: boolean;
  riskLevel: string;
  instructionCount: number;
}

interface TransactionEffect {
  type: string;
  description: string;
  riskContribution: number;
}

interface SimulationResult {
  simulationId: string;
  success: boolean;
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  riskScore: number;
  warnings: SimulationWarning[];
  effects: TransactionEffect[];
  balanceChanges: BalanceChange[];
  approvalChanges: ApprovalChange[];
  programsInvoked: ProgramInfo[];
  estimatedFee: number;
  computeUnits: number;
  simulatedAt: string;
}

interface QuickRiskCheck {
  riskLevel: string;
  riskScore: number;
  warnings: SimulationWarning[];
  shouldSimulate: boolean;
  recommendation: "proceed" | "simulate_first" | "review_carefully" | "do_not_sign";
}

export default function SimulationTab() {
  const [walletAddress, setWalletAddress] = useState("");
  const [serializedTx, setSerializedTx] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isQuickChecking, setIsQuickChecking] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [quickCheck, setQuickCheck] = useState<QuickRiskCheck | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [verifiedPrograms, setVerifiedPrograms] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("simulate");
  const { toast } = useToast();

  // Fetch simulation history on mount
  useEffect(() => {
    if (walletAddress) {
      fetchHistory();
    }
  }, [walletAddress]);

  // Fetch verified programs on mount
  useEffect(() => {
    fetchVerifiedPrograms();
  }, []);

  const fetchHistory = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/simulation/history/${walletAddress}`);
      const data = await response.json();

      if (response.ok) {
        setHistory(data.simulations || []);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const fetchVerifiedPrograms = async () => {
    try {
      const response = await fetch("/api/programs/verified");
      const data = await response.json();

      if (response.ok) {
        setVerifiedPrograms(data.programs || []);
      }
    } catch (err) {
      console.error("Error fetching programs:", err);
    }
  };

  // Quick risk check
  const handleQuickCheck = async () => {
    if (!serializedTx.trim()) {
      toast({
        title: "Error",
        description: "Please enter a serialized transaction",
        variant: "destructive",
      });
      return;
    }

    setIsQuickChecking(true);
    setError(null);
    setQuickCheck(null);

    try {
      const response = await fetch("/api/simulation/quick-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serializedTransaction: serializedTx }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Quick check failed");
      }

      setQuickCheck(data.check);

      toast({
        title: "Quick Check Complete",
        description: `Risk Level: ${data.check.riskLevel}`,
      });
    } catch (err: any) {
      console.error("Quick check error:", err);
      setError(err.message);
      toast({
        title: "Quick Check Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsQuickChecking(false);
    }
  };

  // Full simulation
  const handleSimulate = async () => {
    if (!serializedTx.trim() || !walletAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter both wallet address and transaction",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    setError(null);
    setSimulation(null);

    try {
      const response = await fetch("/api/simulation/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serializedTransaction: serializedTx,
          walletAddress,
          storeResult: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      setSimulation(data.simulation);
      fetchHistory();

      toast({
        title: "Simulation Complete",
        description: `Risk Level: ${data.simulation.riskLevel}, Score: ${data.simulation.riskScore}`,
      });
    } catch (err: any) {
      console.error("Simulation error:", err);
      setError(err.message);
      toast({
        title: "Simulation Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-blue-500 text-white";
      case "safe":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <ShieldX className="h-4 w-4 text-red-500" />;
      case "high":
        return <ShieldAlert className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "info":
        return <Info className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Get recommendation text and color
  const getRecommendation = (rec: string) => {
    switch (rec) {
      case "proceed":
        return { text: "Safe to proceed", color: "text-green-500", icon: <CheckCircle2 className="h-5 w-5" /> };
      case "simulate_first":
        return { text: "Run full simulation first", color: "text-blue-500", icon: <PlayCircle className="h-5 w-5" /> };
      case "review_carefully":
        return { text: "Review carefully before signing", color: "text-yellow-500", icon: <AlertTriangle className="h-5 w-5" /> };
      case "do_not_sign":
        return { text: "DO NOT SIGN - High Risk Detected", color: "text-red-500", icon: <XCircle className="h-5 w-5" /> };
      default:
        return { text: rec, color: "text-gray-500", icon: <Info className="h-5 w-5" /> };
    }
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transaction Simulation</h2>
          <p className="text-muted-foreground">
            Simulate transactions before signing to detect risks and understand effects
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Simulate Transaction
          </CardTitle>
          <CardDescription>
            Enter a serialized transaction to analyze its risks and effects before signing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Wallet Address</label>
              <Input
                placeholder="Enter your wallet address..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={handleQuickCheck}
                disabled={isQuickChecking || !serializedTx}
                className="flex-1"
              >
                {isQuickChecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Quick Check
              </Button>
              <Button
                onClick={handleSimulate}
                disabled={isSimulating || !serializedTx || !walletAddress}
                className="flex-1"
              >
                {isSimulating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Full Simulation
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Serialized Transaction (Base64)</label>
            <Textarea
              placeholder="Paste the serialized transaction here..."
              value={serializedTx}
              onChange={(e) => setSerializedTx(e.target.value)}
              className="font-mono text-sm min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Check Result */}
      {quickCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Risk Check Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">Risk Level</div>
                <Badge className={getRiskLevelColor(quickCheck.riskLevel)}>
                  {quickCheck.riskLevel.toUpperCase()}
                </Badge>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
                <div className="text-2xl font-bold">{quickCheck.riskScore}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">Recommendation</div>
                <div className={`flex items-center justify-center gap-2 ${getRecommendation(quickCheck.recommendation).color}`}>
                  {getRecommendation(quickCheck.recommendation).icon}
                  <span className="text-sm font-medium">{getRecommendation(quickCheck.recommendation).text}</span>
                </div>
              </div>
            </div>
            {quickCheck.warnings.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Warnings</h4>
                <div className="space-y-2">
                  {quickCheck.warnings.map((warning, idx) => (
                    <Alert key={idx} variant={warning.severity === "critical" || warning.severity === "high" ? "destructive" : "default"}>
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(warning.severity)}
                        <div>
                          <AlertTitle className="text-sm">{warning.type.replace(/_/g, " ").toUpperCase()}</AlertTitle>
                          <AlertDescription className="text-sm">{warning.message}</AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Full Simulation Result */}
      {simulation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Simulation Result
              </div>
              <Badge className={getRiskLevelColor(simulation.riskLevel)}>
                {simulation.riskLevel.toUpperCase()} RISK
              </Badge>
            </CardTitle>
            <CardDescription>
              Simulated at {new Date(simulation.simulatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="warnings">Warnings ({simulation.warnings.length})</TabsTrigger>
                <TabsTrigger value="balances">Balances ({simulation.balanceChanges.length})</TabsTrigger>
                <TabsTrigger value="approvals">Approvals ({simulation.approvalChanges.length})</TabsTrigger>
                <TabsTrigger value="programs">Programs ({simulation.programsInvoked.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
                    <div className="text-3xl font-bold">{simulation.riskScore}</div>
                    <Progress value={simulation.riskScore} className="mt-2" />
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">Success</div>
                    <div className="flex items-center justify-center gap-2">
                      {simulation.success ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-500" />
                      )}
                      <span className="text-lg font-medium">{simulation.success ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">Estimated Fee</div>
                    <div className="text-xl font-bold">{(simulation.estimatedFee / 1e9).toFixed(6)} SOL</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">Compute Units</div>
                    <div className="text-xl font-bold">{simulation.computeUnits.toLocaleString()}</div>
                  </div>
                </div>

                {/* Effects Summary */}
                {simulation.effects.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Transaction Effects</h4>
                    <div className="space-y-2">
                      {simulation.effects.map((effect, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" />
                            <span className="font-medium">{effect.type.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">- {effect.description}</span>
                          </div>
                          {effect.riskContribution > 0 && (
                            <Badge variant="outline">+{effect.riskContribution} risk</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="warnings" className="mt-4">
                {simulation.warnings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No warnings detected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {simulation.warnings.map((warning, idx) => (
                      <Alert key={idx} variant={warning.severity === "critical" || warning.severity === "high" ? "destructive" : "default"}>
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(warning.severity)}
                          <div className="flex-1">
                            <AlertTitle className="text-sm flex items-center gap-2">
                              {warning.type.replace(/_/g, " ").toUpperCase()}
                              <Badge variant="outline" className="text-xs">{warning.severity}</Badge>
                            </AlertTitle>
                            <AlertDescription className="text-sm">{warning.message}</AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="balances" className="mt-4">
                {simulation.balanceChanges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="h-12 w-12 mx-auto mb-2" />
                    <p>No balance changes detected</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead className="text-right">Before</TableHead>
                        <TableHead className="text-right">After</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulation.balanceChanges.map((change, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4" />
                              <span>{change.tokenSymbol || (change.isNative ? "SOL" : truncateAddress(change.tokenAddress))}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{change.before.toFixed(6)}</TableCell>
                          <TableCell className="text-right font-mono">{change.after.toFixed(6)}</TableCell>
                          <TableCell className={`text-right font-mono ${change.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {change.change >= 0 ? "+" : ""}{change.change.toFixed(6)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="approvals" className="mt-4">
                {simulation.approvalChanges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-2" />
                    <p>No approval changes detected</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Spender</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulation.approvalChanges.map((change, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{change.tokenSymbol || truncateAddress(change.tokenAddress)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{change.spenderLabel || truncateAddress(change.spenderAddress)}</span>
                              {change.isKnownSpender && (
                                <Badge variant="outline" className="text-xs">Verified</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{change.previousAmount === null ? "None" : change.previousAmount}</TableCell>
                          <TableCell>
                            {change.isRevoke ? (
                              <Badge variant="outline" className="text-green-500">Revoked</Badge>
                            ) : (
                              <span className={change.newAmount === "unlimited" ? "text-red-500 font-medium" : ""}>
                                {change.newAmount === "unlimited" ? "UNLIMITED" : change.newAmount}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRiskLevelColor(change.riskLevel)}>{change.riskLevel}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="programs" className="mt-4">
                {simulation.programsInvoked.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-2" />
                    <p>No programs invoked</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Instructions</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulation.programsInvoked.map((program, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              <span>{program.programName || truncateAddress(program.programId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{program.category || "Unknown"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {program.isVerified && <Badge variant="outline" className="text-xs text-green-500">Verified</Badge>}
                              {program.isAudited && <Badge variant="outline" className="text-xs text-blue-500">Audited</Badge>}
                              {!program.isVerified && !program.isAudited && <Badge variant="outline" className="text-xs text-yellow-500">Unknown</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{program.instructionCount}</TableCell>
                          <TableCell>
                            <Badge className={getRiskLevelColor(program.riskLevel)}>{program.riskLevel}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Simulation History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Simulations
            </CardTitle>
            <CardDescription>
              Your recent transaction simulations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Warnings</TableHead>
                  <TableHead>Success</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 10).map((sim) => (
                  <TableRow key={sim.simulationId} className="cursor-pointer hover:bg-muted" onClick={() => setSimulation(sim)}>
                    <TableCell>{new Date(sim.simulatedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getRiskLevelColor(sim.riskLevel)}>{sim.riskLevel}</Badge>
                    </TableCell>
                    <TableCell>{sim.riskScore}</TableCell>
                    <TableCell>{sim.warnings.length}</TableCell>
                    <TableCell>
                      {sim.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Verified Programs Reference */}
      {verifiedPrograms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Verified Programs
            </CardTitle>
            <CardDescription>
              Programs that have been verified and audited
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="programs">
                <AccordionTrigger>View {verifiedPrograms.length} verified programs</AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verifiedPrograms.map((program) => (
                        <TableRow key={program.program_id}>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="font-medium">{program.program_name}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono text-xs">{program.program_id}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>{program.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {program.is_verified && <Badge variant="outline" className="text-xs text-green-500">Verified</Badge>}
                              {program.is_audited && <Badge variant="outline" className="text-xs text-blue-500">Audited</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRiskLevelColor(program.risk_level)}>{program.risk_level}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
