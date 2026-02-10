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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Create new API key
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.apiKey);
        await fetchApiKeys();
        toast.success("API key created successfully. Please copy and save it now.");
        // Don't close the dialog - let the user see and copy the key
      } else {
        throw new Error("Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
      // Close dialog on error
      setIsCreateDialogOpen(false);
      setNewApiKey("");
      setNewKeyName("");
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke API key
  const handleRevokeApiKey = async (keyId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchApiKeys();
        toast.success("API key revoked successfully");
      } else {
        throw new Error("Failed to revoke API key");
      }
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast.error("Failed to revoke API key");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy API key to clipboard
  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  // Handle dialog open/close state changes
  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      // Reset form when closing dialog
      setNewApiKey("");
      setNewKeyName("");
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="keys" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="keys" className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span>API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4" />
              <span>Documentation</span>
            </TabsTrigger>
          </TabsList>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={handleDialogOpenChange}
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
                  <Alert className="bg-severity-medium/10 border-severity-medium/20">
                    <AlertCircle className="h-4 w-4 text-severity-medium" />
                    <AlertTitle className="text-severity-medium">
                      Important
                    </AlertTitle>
                    <AlertDescription className="text-severity-medium">
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
                      onClick={() => handleDialogOpenChange(false)}
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
                        placeholder="My API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => handleDialogOpenChange(false)}
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

        <TabsContent value="keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Create, manage, and monitor your API keys for secure access to
                the Lavinth Wallet Check API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && apiKeys.length === 0 ? (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Loading API keys...
                    </p>
                  </div>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Key className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">No API Keys Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Get started by creating your first API key to access the
                      Lavinth Wallet Check API. Your keys will appear here for
                      easy management.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First API Key
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Key className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{key.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Created{" "}
                                  {format(
                                    new Date(key.createdAt),
                                    "MMM d, yyyy"
                                  )}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={key.isActive ? "default" : "destructive"}
                              className={
                                key.isActive
                                  ? "bg-severity-low/15 text-severity-low hover:bg-severity-low/20"
                                  : ""
                              }
                            >
                              {key.isActive ? "Active" : "Revoked"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {key.lastUsed
                              ? format(new Date(key.lastUsed), "MMM d, yyyy")
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {key.key.substring(0, 8)}...{key.key.slice(-4)}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  toast.error("For security reasons, API keys are only shown once when created. Please create a new key if needed.");
                                }}
                                className="h-6 w-6 p-0 hover:bg-destructive/10"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeApiKey(key.id)}
                              disabled={!key.isActive || isLoading}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
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

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                API Documentation
              </CardTitle>
              <CardDescription>
                Complete guide to integrating the Lavinth Wallet Check API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Start */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quick Start</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        1
                      </div>
                      <h4 className="font-medium">Get API Key</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create an API key from the API Keys tab
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        2
                      </div>
                      <h4 className="font-medium">Make Request</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send GET request to check-wallet endpoint
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        3
                      </div>
                      <h4 className="font-medium">Get Results</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive risk score and security findings
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Base URL */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Base URL</h3>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <code className="text-sm font-mono">
                    https://api.lavinth.com
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyApiKey("https://api.lavinth.com")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Authentication */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Include your API key in the x-api-key header of every request:
                </p>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <code className="text-sm font-mono">
                    x-api-key: lav_live_your_api_key
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopyApiKey("x-api-key: lav_live_your_api_key")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Wallet Check Endpoint */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Wallet Check Endpoint</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="font-mono text-xs">
                          GET
                        </Badge>
                        <code className="text-sm font-mono">
                          /api/check-wallet/{"{address}"}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyApiKey(
                            "GET https://api.lavinth.com/api/check-wallet/{address}"
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Check a wallet address for security risks and potential
                      threats
                    </p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Example Request:
                        </h4>
                        <div className="bg-muted rounded p-3">
                          <code className="text-xs">
                            {`curl -X GET "https://api.lavinth.com/api/check-wallet/Ghdd6xxZzwEizgLn9nmSgDFwmH3twqKoAzNem17prrhL" \\
  -H "x-api-key: lav_live_your_api_key"`}
                          </code>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Response:</h4>
                        <div className="bg-muted rounded p-3">
                          <code className="text-xs">
                            {JSON.stringify(
                              {
                                status: "success",
                                isFlagged: true,
                                riskScore: 0.85,
                                message:
                                  "Address found in threat database",
                                details: {
                                  label: "Known scammer",
                                  category: "malicious_delegate",
                                  sources: [
                                    "phantom_blocklist",
                                    "goplus",
                                  ],
                                },
                                goPlusRisk: {
                                  isRisky: true,
                                  riskFlags: [
                                    "Blacklisted address",
                                  ],
                                },
                              },
                              null,
                              2
                            )}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Rate Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rate Limits</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Current Limits</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 1000 requests per hour</li>
                      <li>• 10 requests per second</li>
                      <li>• Rate limit headers included</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Best Practices</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Cache responses when possible</li>
                      <li>• Implement exponential backoff</li>
                      <li>• Monitor rate limit headers</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Error Codes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Common Error Codes</h3>
                <div className="space-y-2">
                  {[
                    {
                      code: "200",
                      desc: "Success - Request completed successfully",
                    },
                    {
                      code: "400",
                      desc: "Bad Request - Invalid wallet address format",
                    },
                    {
                      code: "401",
                      desc: "Unauthorized - Invalid or missing API key",
                    },
                    { code: "429", desc: "Rate Limited - Too many requests" },
                    {
                      code: "500",
                      desc: "Server Error - Internal processing error",
                    },
                  ].map((error) => (
                    <div
                      key={error.code}
                      className="flex items-center space-x-3 p-3 border rounded-lg"
                    >
                      <Badge
                        variant={
                          error.code === "200" ? "default" : "destructive"
                        }
                        className="font-mono"
                      >
                        {error.code}
                      </Badge>
                      <span className="text-sm">{error.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
