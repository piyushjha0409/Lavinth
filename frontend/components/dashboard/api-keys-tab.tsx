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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import RedocDocumentation from "@/components/ui/redoc-documentation";

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
            <Card className="border-none shadow-none overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="text-2xl font-bold">
                  API Documentation
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Interactive API documentation powered by Redoc
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="w-full">
                  <RedocDocumentation 
                    spec={{
                      "openapi": "3.0.3",
                      "info": {
                        "title": "Lavinth Wallet Check API",
                        "description": "Lavinth's Wallet Check API allows you to scan wallet addresses for security risks and potential threats. The API provides comprehensive security analysis including risk scoring, threat detection, and detailed findings for cryptocurrency wallet addresses.",
                        "version": "1.0.0",
                        "contact": {
                          "name": "Lavinth Support",
                          "url": "https://lavinth.com/support",
                          "email": "support@lavinth.com"
                        }
                      },
                      "servers": [
                        {
                          "url": "https://api.lavinth.com/v1",
                          "description": "Production server"
                        }
                      ],
                      "security": [
                        {
                          "BearerAuth": []
                        }
                      ],
                      "paths": {
                        "/wallet-check": {
                          "post": {
                            "summary": "Check wallet address for security risks",
                            "description": "Analyzes a cryptocurrency wallet address for security risks, potential threats, and provides a comprehensive risk assessment with detailed findings.",
                            "operationId": "checkWallet",
                            "tags": ["Wallet Security"],
                            "requestBody": {
                              "required": true,
                              "content": {
                                "application/json": {
                                  "schema": {
                                    "$ref": "#/components/schemas/WalletCheckRequest"
                                  },
                                  "examples": {
                                    "ethereum_wallet": {
                                      "summary": "Ethereum wallet address",
                                      "value": {
                                        "wallet_address": "0x1234567890abcdef1234567890abcdef12345678"
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "responses": {
                              "200": {
                                "description": "Successful wallet analysis",
                                "content": {
                                  "application/json": {
                                    "schema": {
                                      "$ref": "#/components/schemas/WalletCheckResponse"
                                    },
                                    "examples": {
                                      "high_risk_wallet": {
                                        "summary": "High risk wallet with dust attack",
                                        "value": {
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
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              "400": {
                                "description": "Bad request - Invalid wallet address",
                                "content": {
                                  "application/json": {
                                    "schema": {
                                      "$ref": "#/components/schemas/ErrorResponse"
                                    }
                                  }
                                }
                              },
                              "401": {
                                "description": "Unauthorized - Invalid API key",
                                "content": {
                                  "application/json": {
                                    "schema": {
                                      "$ref": "#/components/schemas/ErrorResponse"
                                    }
                                  }
                                }
                              },
                              "429": {
                                "description": "Too many requests - Rate limit exceeded",
                                "content": {
                                  "application/json": {
                                    "schema": {
                                      "$ref": "#/components/schemas/ErrorResponse"
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      "components": {
                        "securitySchemes": {
                          "BearerAuth": {
                            "type": "http",
                            "scheme": "bearer",
                            "bearerFormat": "JWT",
                            "description": "Enter your API key with the 'lav_live_' or 'lav_test_' prefix"
                          }
                        },
                        "schemas": {
                          "WalletCheckRequest": {
                            "type": "object",
                            "required": ["wallet_address"],
                            "properties": {
                              "wallet_address": {
                                "type": "string",
                                "description": "The cryptocurrency wallet address to check for security risks",
                                "example": "0x1234567890abcdef1234567890abcdef12345678"
                              }
                            }
                          },
                          "WalletCheckResponse": {
                            "type": "object",
                            "required": ["wallet_address", "risk_score", "risk_level", "findings", "last_updated"],
                            "properties": {
                              "wallet_address": {
                                "type": "string",
                                "description": "The wallet address that was analyzed",
                                "example": "0x1234567890abcdef1234567890abcdef12345678"
                              },
                              "risk_score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100,
                                "description": "Risk score from 0-100, where higher values indicate greater risk",
                                "example": 85
                              },
                              "risk_level": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                                "description": "Categorized risk level based on the risk score",
                                "example": "high"
                              },
                              "findings": {
                                "type": "array",
                                "description": "List of security findings and threats detected",
                                "items": {
                                  "$ref": "#/components/schemas/SecurityFinding"
                                }
                              },
                              "last_updated": {
                                "type": "string",
                                "format": "date-time",
                                "description": "ISO 8601 timestamp of when the data was last updated",
                                "example": "2025-07-22T03:35:00+05:30"
                              }
                            }
                          },
                          "SecurityFinding": {
                            "type": "object",
                            "required": ["type", "severity", "description"],
                            "properties": {
                              "type": {
                                "type": "string",
                                "description": "Type of security finding",
                                "enum": ["dust_attack", "phishing_connection", "mixer_usage", "blacklisted_address", "suspicious_transaction"],
                                "example": "dust_attack"
                              },
                              "severity": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                                "description": "Severity level of the finding",
                                "example": "high"
                              },
                              "description": {
                                "type": "string",
                                "description": "Human-readable description of the security finding",
                                "example": "Wallet has received dust from known attacker addresses"
                              }
                            }
                          },
                          "ErrorResponse": {
                            "type": "object",
                            "required": ["error"],
                            "properties": {
                              "error": {
                                "type": "object",
                                "required": ["code", "message", "status"],
                                "properties": {
                                  "code": {
                                    "type": "string",
                                    "description": "Error code identifier",
                                    "example": "invalid_wallet_address"
                                  },
                                  "message": {
                                    "type": "string",
                                    "description": "Human-readable error message",
                                    "example": "The wallet address provided is not valid"
                                  },
                                  "status": {
                                    "type": "integer",
                                    "description": "HTTP status code",
                                    "example": 400
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      "tags": [
                        {
                          "name": "Wallet Security",
                          "description": "Operations for analyzing wallet security and risk assessment"
                        }
                      ]
                    }}
                    options={{
                      hideDownloadButton: false,
                      disableSearch: false,
                      expandResponses: "200,201",
                      jsonSampleExpandLevel: 2,
                      hideSingleRequestSampleTab: true,
                      showExtensions: true,
                      nativeScrollbars: false,
                      pathInMiddlePanel: true,
                      schemaExpansionLevel: 2,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
