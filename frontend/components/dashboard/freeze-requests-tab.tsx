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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  Plus,
  Snowflake,
  Shield,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface ExchangeContact {
  exchangeId: string;
  exchangeName: string;
  exchangeType: "cex" | "dex";
  complianceEmail?: string;
  emergencyEmail?: string;
  responseTimeSla: number;
  freezeCapability: boolean;
  kycRequired: boolean;
  isVerified: boolean;
  avgResponseTime?: number;
  successRate?: number;
}

interface FreezeRequest {
  requestId: string;
  traceId: string;
  exchangeId: string;
  exchangeName: string;
  victimWallet: string;
  depositAddress: string;
  depositSignature: string;
  amount: number;
  tokenSymbol?: string;
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  evidencePackageId?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  frozenAt?: string;
  exchangeTicketId?: string;
  exchangeResponse?: string;
  followUpCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FreezeStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  successRate: number;
  avgResponseTime: number;
}

interface EmailTemplate {
  subject: string;
  body: string;
  attachments: string[];
  recipientEmail?: string;
}

export default function FreezeRequestsTab() {
  const [exchanges, setExchanges] = useState<ExchangeContact[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FreezeRequest[]>([]);
  const [followUpRequests, setFollowUpRequests] = useState<FreezeRequest[]>([]);
  const [statistics, setStatistics] = useState<FreezeStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FreezeRequest | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { toast } = useToast();

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchExchanges(),
        fetchPendingRequests(),
        fetchFollowUpRequests(),
        fetchStatistics(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExchanges = async () => {
    try {
      const response = await fetch("/api/exchanges/contacts");
      const data = await response.json();
      if (response.ok) {
        setExchanges(data.contacts || []);
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch("/api/freeze-requests/pending");
      const data = await response.json();
      if (response.ok) {
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const fetchFollowUpRequests = async () => {
    try {
      const response = await fetch("/api/freeze-requests/follow-up");
      const data = await response.json();
      if (response.ok) {
        setFollowUpRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching follow-up requests:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/freeze-requests/statistics");
      const data = await response.json();
      if (response.ok) {
        setStatistics(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleGenerateEmail = async (requestId: string) => {
    setIsGeneratingEmail(true);
    try {
      const response = await fetch(`/api/freeze-requests/${requestId}/email-template`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate email template");
      }

      setEmailTemplate(data.template);
      toast({
        title: "Email Generated",
        description: "Freeze request email template generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleUpdateStatus = async (
    requestId: string,
    status: string,
    ticketId?: string,
    response?: string
  ) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/freeze-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          exchangeTicketId: ticketId,
          exchangeResponse: response,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast({
        title: "Status Updated",
        description: `Request status updated to ${status}`,
      });

      // Refresh data
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRecordFollowUp = async (requestId: string) => {
    try {
      const response = await fetch(`/api/freeze-requests/${requestId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUpHours: 24 }),
      });

      if (!response.ok) {
        throw new Error("Failed to record follow-up");
      }

      toast({
        title: "Follow-up Recorded",
        description: "Next follow-up scheduled in 24 hours",
      });

      await fetchFollowUpRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const truncateAddress = (address: string) => {
    if (!address) return "-";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "frozen":
        return "bg-blue-500";
      case "partially_frozen":
        return "bg-cyan-500";
      case "submitted":
        return "bg-purple-500";
      case "acknowledged":
        return "bg-indigo-500";
      case "under_review":
        return "bg-yellow-500";
      case "ready":
        return "bg-green-500";
      case "draft":
        return "bg-gray-500";
      case "rejected":
        return "bg-red-500";
      case "released":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "frozen":
        return <Snowflake className="h-4 w-4" />;
      case "submitted":
        return <Send className="h-4 w-4" />;
      case "acknowledged":
        return <CheckCircle2 className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold tracking-tight">Freeze Requests</h2>
          <p className="text-muted-foreground">
            Coordinate with exchanges to freeze stolen funds
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="text-3xl font-bold">{statistics.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-8 w-8 text-yellow-500" />
                <span className="text-3xl font-bold">{pendingRequests.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-green-500">
                  {(statistics.successRate ?? 0).toFixed(0)}%
                </div>
                <Progress value={statistics.successRate ?? 0} className="flex-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                <span className="text-3xl font-bold">
                  {(statistics.avgResponseTime ?? 0).toFixed(1)}h
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="mr-2 h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="follow-up">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Needs Follow-up ({followUpRequests.length})
          </TabsTrigger>
          <TabsTrigger value="exchanges">
            <Building2 className="mr-2 h-4 w-4" />
            Exchange Contacts ({exchanges.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Freeze Requests</CardTitle>
              <CardDescription>
                Active requests awaiting exchange response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Snowflake className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending freeze requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.requestId}>
                        <TableCell className="font-mono text-xs">
                          {truncateAddress(request.requestId)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {request.exchangeName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(request.amount ?? 0).toFixed(4)} {request.tokenSymbol || "SOL"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(request.priority)}>
                            {request.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getStatusColor(request.status)} flex items-center gap-1 w-fit`}
                          >
                            {getStatusIcon(request.status)}
                            {request.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Freeze Request Details</DialogTitle>
                                  <DialogDescription>
                                    Request ID: {request.requestId}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Exchange</Label>
                                      <p className="font-medium">{request.exchangeName}</p>
                                    </div>
                                    <div>
                                      <Label>Amount</Label>
                                      <p className="font-medium">
                                        {(request.amount ?? 0).toFixed(4)} {request.tokenSymbol || "SOL"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Victim Wallet</Label>
                                      <p className="font-mono text-xs">
                                        {truncateAddress(request.victimWallet)}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Deposit Address</Label>
                                      <p className="font-mono text-xs">
                                        {truncateAddress(request.depositAddress)}
                                      </p>
                                    </div>
                                    {request.exchangeTicketId && (
                                      <div>
                                        <Label>Exchange Ticket</Label>
                                        <p className="font-medium">{request.exchangeTicketId}</p>
                                      </div>
                                    )}
                                    {request.exchangeResponse && (
                                      <div className="col-span-2">
                                        <Label>Exchange Response</Label>
                                        <p className="text-sm text-muted-foreground">
                                          {request.exchangeResponse}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Status Update Section */}
                                  <div className="space-y-2">
                                    <Label>Update Status</Label>
                                    <div className="flex gap-2 flex-wrap">
                                      {["submitted", "acknowledged", "under_review", "frozen", "rejected"].map(
                                        (status) => (
                                          <Button
                                            key={status}
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleUpdateStatus(request.requestId, status)
                                            }
                                            disabled={isUpdatingStatus}
                                          >
                                            {status.replace(/_/g, " ")}
                                          </Button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => handleGenerateEmail(request.requestId)}
                                    disabled={isGeneratingEmail}
                                  >
                                    {isGeneratingEmail ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Mail className="mr-2 h-4 w-4" />
                                    )}
                                    Generate Email
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateEmail(request.requestId)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-up Tab */}
        <TabsContent value="follow-up">
          <Card>
            <CardHeader>
              <CardTitle>Requests Needing Follow-up</CardTitle>
              <CardDescription>
                Requests that require action or response follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {followUpRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No requests need follow-up</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUpRequests.map((request) => (
                    <Alert key={request.requestId} variant="default">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>
                          {request.exchangeName} - {(request.amount ?? 0).toFixed(4)}{" "}
                          {request.tokenSymbol || "SOL"}
                        </span>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority.toUpperCase()}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>
                          Status: {request.status.replace(/_/g, " ")} | Follow-ups:{" "}
                          {request.followUpCount}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordFollowUp(request.requestId)}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Record Follow-up
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateEmail(request.requestId)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Reminder
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exchanges Tab */}
        <TabsContent value="exchanges">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Compliance Contacts</CardTitle>
              <CardDescription>
                Contact information for exchange compliance teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exchanges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4" />
                  <p>No exchange contacts loaded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Compliance Email</TableHead>
                      <TableHead>SLA (hrs)</TableHead>
                      <TableHead>Freeze Capable</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchanges.map((exchange) => (
                      <TableRow key={exchange.exchangeId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">{exchange.exchangeName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {exchange.exchangeType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {exchange.complianceEmail ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() =>
                                      copyToClipboard(exchange.complianceEmail!)
                                    }
                                  >
                                    <Mail className="mr-1 h-3 w-3" />
                                    {exchange.complianceEmail.split("@")[0]}...
                                    <Copy className="ml-1 h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{exchange.complianceEmail}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{exchange.responseTimeSla}h</TableCell>
                        <TableCell>
                          {exchange.freezeCapability ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          {exchange.successRate !== undefined ? (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={exchange.successRate ?? 0}
                                className="w-16"
                              />
                              <span className="text-sm">
                                {(exchange.successRate ?? 0).toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {exchange.isVerified ? (
                            <Badge className="bg-green-500">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Unverified</Badge>
                          )}
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

      {/* Email Template Dialog */}
      {emailTemplate && (
        <Dialog open={!!emailTemplate} onOpenChange={() => setEmailTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Freeze Request Email Template</DialogTitle>
              <DialogDescription>
                Copy and send this email to the exchange compliance team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {emailTemplate.recipientEmail && (
                <div className="space-y-2">
                  <Label>Recipient</Label>
                  <div className="flex items-center gap-2">
                    <Input value={emailTemplate.recipientEmail} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(emailTemplate.recipientEmail!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Subject</Label>
                <div className="flex items-center gap-2">
                  <Input value={emailTemplate.subject} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(emailTemplate.subject)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <div className="relative">
                  <Textarea
                    value={emailTemplate.body}
                    readOnly
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(emailTemplate.body)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>

              {emailTemplate.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div className="flex flex-wrap gap-2">
                    {emailTemplate.attachments.map((attachment, i) => (
                      <Badge key={i} variant="outline">
                        <FileText className="mr-1 h-3 w-3" />
                        {attachment}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailTemplate(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const fullEmail = `Subject: ${emailTemplate.subject}\n\n${emailTemplate.body}`;
                  copyToClipboard(fullEmail);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Full Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
