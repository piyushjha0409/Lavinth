"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
  expiresAt: string | null;
  permissions: string[];
  usageLimit: number | null;
  currentUsage: number;
};

export default function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/api-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      } else {
        throw new Error("Failed to fetch API keys");
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Create a new API key
  const handleCreateApiKey = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.apiKey);
        fetchApiKeys();
        toast({
          title: "Success",
          description: "API key created successfully",
        });
      } else {
        throw new Error("Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke an API key
  const handleRevokeApiKey = async (keyId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchApiKeys();
        toast({
          title: "Success",
          description: "API key revoked successfully",
        });
      } else {
        throw new Error("Failed to revoke API key");
      }
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy API key to clipboard
  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="keys" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for accessing the Wallet Check API.
                </DialogDescription>
              </DialogHeader>
              {newApiKey ? (
                <div className="space-y-4">
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">
                      Important
                    </AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      This API key will only be shown once. Please copy it and
                      store it securely.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Your New API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="api-key"
                        value={newApiKey}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyApiKey(newApiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewApiKey("");
                        setNewKeyName("");
                      }}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">API Key Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Production API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateApiKey}
                      disabled={!newKeyName || isLoading}
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <TabsContent value="keys">
          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for accessing the Wallet Check API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && apiKeys.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading API keys...
                    </p>
                  </div>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="rounded-full bg-muted p-3">
                    <Key className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No API Keys</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    You haven't created any API keys yet. Create your first API
                    key to start using the Wallet Check API.
                  </p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create your first API key
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">
                            {key.name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(key.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {key.lastUsed
                              ? format(new Date(key.lastUsed), "MMM d, yyyy")
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={key.isActive ? "default" : "destructive"}
                              className={
                                key.isActive
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : ""
                              }
                            >
                              {key.isActive ? "Active" : "Revoked"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeApiKey(key.id)}
                              disabled={!key.isActive || isLoading}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Revoke</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                API keys are used to authenticate requests to the Wallet Check
                API.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="relative">
          <div className="w-full">
            {/* Main Content */}
            <div className="w-full">
              <Card className="border-none shadow-none overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-transparent">
                  <CardTitle className="text-2xl font-bold">
                    API Documentation
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Learn how to use the Wallet Check API with your API keys
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <ScrollArea className="pr-2 sm:pr-4">
                    <div className="space-y-8 pb-4">
                      {/* Getting Started Section */}
                      <section
                        id="getting-started"
                        className="space-y-4 rounded-lg p-4 sm:p-6 border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                      >
                        <h2 className="text-2xl font-semibold tracking-tight text-primary">
                          Getting Started
                        </h2>
                        <p className="text-muted-foreground leading-7">
                          Lavinth's Wallet Check API allows you to scan wallet
                          addresses for security risks and potential threats.
                          Follow this documentation to integrate our API into
                          your application.
                        </p>

                        <Alert className="border-primary/20 bg-primary/5">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Important</AlertTitle>
                          <AlertDescription>
                            All API requests must be made over HTTPS. Calls made
                            over plain HTTP will fail.
                          </AlertDescription>
                        </Alert>
                      </section>

                      <Separator />

                      {/* Authentication Section */}
                      <section
                        id="authentication"
                        className="space-y-4 rounded-lg p-4 sm:p-6 border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                      >
                        <h2 className="text-2xl font-semibold tracking-tight text-primary">
                          Authentication
                        </h2>
                        <p className="text-muted-foreground leading-7">
                          The Wallet Check API uses API keys to authenticate
                          requests. You can view and manage your API keys in the
                          API Keys tab.
                        </p>

                        <div className="not-prose relative bg-muted rounded-lg overflow-hidden">
                          <div className="flex items-center px-4 py-2 text-xs font-sans justify-between rounded-t-md bg-muted border-b">
                            <span>Authorization Header</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                handleCopyApiKey(
                                  "Authorization: Bearer lav_live_your_api_key"
                                )
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <pre className="p-4 text-sm overflow-x-auto">
                            <code className="text-primary-foreground">
                              Authorization: Bearer lav_live_your_api_key
                            </code>
                          </pre>
                        </div>

                        <div className="prose prose-slate dark:prose-invert max-w-none">
                          <ReactMarkdown
                            rehypePlugins={[rehypeHighlight, rehypeRaw]}
                            remarkPlugins={[remarkGfm]}
                          >
                            {`
> **Warning**: Keep your API keys secure! Do not share them in publicly accessible areas such as GitHub, client-side code, etc.
                          `}
                          </ReactMarkdown>
                        </div>
                      </section>

                      <Separator />

                      {/* Wallet Check API Section */}
                      <section
                        id="wallet-check"
                        className="space-y-4 rounded-lg p-4 sm:p-6 border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                      >
                        <h2 className="text-2xl font-semibold tracking-tight text-primary">
                          Wallet Check API
                        </h2>
                        <p className="text-muted-foreground leading-7">
                          The Wallet Check endpoint allows you to check a wallet
                          address for security risks and potential threats.
                        </p>

                        <div className="space-y-6">
                          {/* Endpoint */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium text-primary/90">
                              Endpoint
                            </h3>
                            <div className="not-prose relative bg-muted rounded-lg overflow-hidden">
                              <div className="flex items-center px-4 py-2 text-xs font-sans justify-between rounded-t-md bg-muted border-b">
                                <span>POST Request</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleCopyApiKey(
                                      "POST https://api.lavinth.com/v1/wallet-check"
                                    )
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <pre className="p-4 text-sm overflow-x-auto">
                                <code className="text-primary-foreground">
                                  POST https://api.lavinth.com/v1/wallet-check
                                </code>
                              </pre>
                            </div>
                          </div>

                          {/* Request Body */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium text-primary/90">
                              Request Body
                            </h3>
                            <div className="not-prose relative bg-muted rounded-lg overflow-hidden">
                              <div className="flex items-center px-4 py-2 text-xs font-sans justify-between rounded-t-md bg-muted border-b">
                                <span>JSON</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleCopyApiKey(
                                      '{\n  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678"\n}'
                                    )
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <pre className="p-4 text-sm overflow-x-auto">
                                <code className="text-primary-foreground">{`{
  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678"
}`}</code>
                              </pre>
                            </div>

                            <table className="w-full border-collapse text-sm mt-4">
                              <thead>
                                <tr>
                                  <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                    Parameter
                                  </th>
                                  <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                    Type
                                  </th>
                                  <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                    Description
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border-b py-2 px-3">
                                    wallet_address
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    string
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    The cryptocurrency wallet address to check
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Response */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium text-primary/90">
                              Response
                            </h3>
                            <div className="not-prose relative bg-muted rounded-lg overflow-hidden">
                              <div className="flex items-center px-4 py-2 text-xs font-sans justify-between rounded-t-md bg-muted border-b">
                                <span>200: OK</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleCopyApiKey(
                                      '{\n  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",\n  "risk_score": 85,\n  "risk_level": "high",\n  "findings": [\n    {\n      "type": "dust_attack",\n      "severity": "high",\n      "description": "Wallet has received dust from known attacker addresses"\n    }\n  ],\n  "last_updated": "2025-07-22T03:35:00+05:30"\n}'
                                    )
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <pre className="p-4 text-sm overflow-x-auto">
                                <code className="text-primary-foreground">{`{
  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
  "risk_score": 85,
  "risk_level": "high",
  "findings": [
    {
      "type": "dust_attack",
      "severity": "high",
      "description": "Wallet has received dust from known attacker addresses"
    }
  ],
  "last_updated": "2025-07-22T03:35:00+05:30"
}`}</code>
                              </pre>
                            </div>

                            <table className="w-full border-collapse text-sm mt-4">
                              <thead>
                                <tr>
                                  <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                    Property
                                  </th>
                                  <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                    Type
                                  </th>
                                  <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                    Description
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border-b py-2 px-3">
                                    wallet_address
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    string
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    The wallet address that was checked
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border-b py-2 px-3 font-medium">
                                    risk_score
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    integer
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    Risk score from 0-100 (higher is riskier)
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border-b py-2 px-3 font-medium">
                                    risk_level
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    string
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    Risk level: low, medium, high
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border-b py-2 px-3 font-medium">
                                    findings
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    array
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    List of security findings
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border-b py-2 px-3 font-medium">
                                    last_updated
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    string
                                  </td>
                                  <td className="border-b py-2 px-3 text-muted-foreground">
                                    ISO 8601 timestamp of last data update
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>

                      <Separator />

                      <section
                        id="rate-limits"
                        className="space-y-4 rounded-lg p-4 sm:p-6 border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                      >
                        <h2 className="text-2xl font-semibold tracking-tight text-primary">
                          Rate Limits
                        </h2>
                        <p className="text-muted-foreground leading-7">
                          API requests are subject to rate limiting based on
                          your subscription tier. Rate limits are applied per
                          API key.
                        </p>

                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                Plan
                              </th>
                              <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                Rate Limit
                              </th>
                              <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                Burst Limit
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <div className="font-medium text-primary/90">
                                  Free
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  For testing and development
                                </div>
                              </td>
                              <td className="border-b py-2 px-3">
                                100 requests/day
                              </td>
                              <td className="border-b py-2 px-3">
                                10 requests/minute
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <div className="font-medium text-primary/90">
                                  Pro
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  For small to medium applications
                                </div>
                              </td>
                              <td className="border-b py-2 px-3">
                                1,000 requests/day
                              </td>
                              <td className="border-b py-2 px-3">
                                60 requests/minute
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <div className="font-medium text-primary/90">
                                  Enterprise
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  For large-scale applications
                                </div>
                              </td>
                              <td className="border-b py-2 px-3">
                                Custom limits
                              </td>
                              <td className="border-b py-2 px-3">
                                Custom limits
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <Alert
                          variant="default"
                          className="border-primary/20 bg-primary/5"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Rate Limit Headers</AlertTitle>
                          <AlertDescription>
                            Each response includes headers that indicate your
                            rate limit status:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>
                                <code>X-RateLimit-Limit</code>: Total requests
                                allowed in the period
                              </li>
                              <li>
                                <code>X-RateLimit-Remaining</code>: Requests
                                remaining in the period
                              </li>
                              <li>
                                <code>X-RateLimit-Reset</code>: Time when the
                                rate limit resets (Unix timestamp)
                              </li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </section>

                      <Separator />

                      <section
                        id="error-handling"
                        className="space-y-4 rounded-lg p-4 sm:p-6 border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent"
                      >
                        <h2 className="text-2xl font-semibold tracking-tight text-primary">
                          Error Handling
                        </h2>
                        <p className="text-muted-foreground leading-7">
                          The API uses conventional HTTP response codes to
                          indicate the success or failure of an API request.
                        </p>

                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                Code
                              </th>
                              <th className="border-b py-2 px-3 text-left font-medium text-primary/80">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <code className="text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 px-1 py-0.5 rounded">
                                  200 - OK
                                </code>
                              </td>
                              <td className="border-b py-2 px-3 text-muted-foreground">
                                The request was successful.
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <code className="text-primary-foreground bg-primary/20 px-1 py-0.5 rounded">
                                  400 - Bad Request
                                </code>
                              </td>
                              <td className="border-b py-2 px-3 text-muted-foreground">
                                The request was invalid or cannot be otherwise
                                served.
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <code className="text-primary-foreground bg-primary/20 px-1 py-0.5 rounded">
                                  401 - Unauthorized
                                </code>
                              </td>
                              <td className="border-b py-2 px-3 text-muted-foreground">
                                Authentication failed or user doesn't have
                                permissions.
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <code className="text-primary-foreground bg-primary/20 px-1 py-0.5 rounded">
                                  404 - Not Found
                                </code>
                              </td>
                              <td className="border-b py-2 px-3 text-muted-foreground">
                                The requested resource could not be found.
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <code className="text-primary-foreground bg-primary/20 px-1 py-0.5 rounded">
                                  429 - Too Many Requests
                                </code>
                              </td>
                              <td className="border-b py-2 px-3 text-muted-foreground">
                                You've hit the rate limit for your API key.
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b py-2 px-3">
                                <code className="text-primary-foreground bg-primary/20 px-1 py-0.5 rounded">
                                  500 - Server Error
                                </code>
                              </td>
                              <td className="border-b py-2 px-3 text-muted-foreground">
                                Something went wrong on our end.
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="not-prose relative bg-muted rounded-lg overflow-hidden mt-4">
                          <div className="flex items-center px-4 py-2 text-xs font-sans rounded-t-md bg-muted border-b">
                            <span>Error Response Example</span>
                          </div>
                          <pre className="p-4 text-sm overflow-x-auto">
                            <code>{`{
  "error": {
    "code": "invalid_wallet_address",
    "message": "The wallet address provided is not valid",
    "status": 400
  }
}`}</code>
                          </pre>
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
