"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Network,
  RefreshCw,
  Filter,
  Users,
  ArrowRight,
  Activity,
  AlertTriangle,
  TrendingUp,
  Eye,
} from "lucide-react";

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  avg_amount: number;
  last_interaction: string;
  dust_txs: number;
  poisoning_txs: number;
}

interface NetworkStats {
  totalEdges: number;
  totalNodes: number;
  avgWeight: number;
  maxWeight: number;
  dustConnections: number;
  poisoningConnections: number;
}

// Production configuration
const NETWORK_CONFIG = {
  DEFAULT_MIN_WEIGHT: 2,
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 1000,
  MIN_LIMIT: 50,
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RISK_THRESHOLDS: {
    HIGH: 10,
    MEDIUM: 5,
    LOW: 0,
  },
} as const;

export default function NetworkAnalysisTab() {
  const [networkData, setNetworkData] = useState<NetworkEdge[]>([]);
  const [filteredData, setFilteredData] = useState<NetworkEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [minWeight, setMinWeight] = useState<number[]>([
    NETWORK_CONFIG.DEFAULT_MIN_WEIGHT,
  ]);
  const [limit, setLimit] = useState<number[]>([NETWORK_CONFIG.DEFAULT_LIMIT]);
  const [searchAddress, setSearchAddress] = useState("");
  const [stats, setStats] = useState<NetworkStats | null>(null);

  const fetchNetworkData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/network-graph?limit=${limit[0]}&minWeight=${minWeight[0]}`
      );
      if (response.ok) {
        const data = await response.json();
        setNetworkData(data);
        setFilteredData(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error("Error fetching network data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: NetworkEdge[]) => {
    const nodes = new Set();
    let totalWeight = 0;
    let maxWeight = 0;
    let dustConnections = 0;
    let poisoningConnections = 0;

    data.forEach((edge) => {
      nodes.add(edge.source);
      nodes.add(edge.target);
      totalWeight += edge.weight;
      maxWeight = Math.max(maxWeight, edge.weight);
      if (edge.dust_txs > 0) dustConnections++;
      if (edge.poisoning_txs > 0) poisoningConnections++;
    });

    setStats({
      totalEdges: data.length,
      totalNodes: nodes.size,
      avgWeight: data.length > 0 ? totalWeight / data.length : 0,
      maxWeight,
      dustConnections,
      poisoningConnections,
    });
  };

  const filterData = () => {
    let filtered = networkData;

    if (searchAddress) {
      filtered = filtered.filter(
        (edge) =>
          edge.source.toLowerCase().includes(searchAddress.toLowerCase()) ||
          edge.target.toLowerCase().includes(searchAddress.toLowerCase())
      );
    }

    setFilteredData(filtered);
    calculateStats(filtered);
  };

  useEffect(() => {
    fetchNetworkData();
    // Auto-refresh for production
    const interval = setInterval(
      fetchNetworkData,
      NETWORK_CONFIG.REFRESH_INTERVAL
    );
    return () => clearInterval(interval);
  }, [minWeight, limit]);

  useEffect(() => {
    filterData();
  }, [searchAddress, networkData]);

  const getConnectionType = (edge: NetworkEdge) => {
    if (edge.poisoning_txs > 0)
      return { type: "Poisoning", color: "destructive" };
    if (edge.dust_txs > 0) return { type: "Dusting", color: "secondary" };
    return { type: "Normal", color: "outline" };
  };

  const getRiskLevel = (
    weight: number,
    dustTxs: number,
    poisoningTxs: number
  ) => {
    const riskScore = weight * 0.3 + dustTxs * 0.5 + poisoningTxs * 0.8;
    if (riskScore > NETWORK_CONFIG.RISK_THRESHOLDS.HIGH)
      return { level: "High", color: "destructive" };
    if (riskScore > NETWORK_CONFIG.RISK_THRESHOLDS.MEDIUM)
      return { level: "Medium", color: "secondary" };
    return { level: "Low", color: "outline" };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Network Analysis
            </h2>
            <p className="text-muted-foreground">
              Analyzing transaction relationships and patterns
            </p>
          </div>
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Network Analysis
            </h2>
            <p className="text-muted-foreground">
              {stats?.totalEdges || 0} transaction relationships and attack patterns analyzed
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchNetworkData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Network Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Network Nodes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalNodes || 0}</div>
              <p className="text-xs text-muted-foreground">Unique addresses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connections</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEdges || 0}</div>
              <p className="text-xs text-muted-foreground">
                Avg weight: {stats?.avgWeight.toFixed(1) || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dust Connections
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.dustConnections || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalEdges
                  ? ((stats.dustConnections / stats.totalEdges) * 100).toFixed(
                      1
                    )
                  : 0}
                % of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Poisoning Attempts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.poisoningConnections || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Enhanced detection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Network Filters
            </CardTitle>
            <CardDescription>
              Adjust parameters to explore different aspects of the network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Minimum Connection Weight: {minWeight[0]}</Label>
                <Slider
                  value={minWeight}
                  onValueChange={setMinWeight}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Connections: {limit[0]}</Label>
                <Slider
                  value={limit}
                  onValueChange={setLimit}
                  max={NETWORK_CONFIG.MAX_LIMIT}
                  min={NETWORK_CONFIG.MIN_LIMIT}
                  step={50}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Search Address</Label>
                <Input
                  placeholder="Enter address to filter..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Data */}
        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connections">Connection Details</TabsTrigger>
            <TabsTrigger value="clusters">Network Clusters</TabsTrigger>
            <TabsTrigger value="analysis">Risk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Network Connections</CardTitle>
                <CardDescription>
                  Detailed view of transaction relationships (
                  {filteredData.length} connections)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredData.map((edge, index) => {
                    const connectionType = getConnectionType(edge);
                    const riskLevel = getRiskLevel(
                      edge.weight,
                      edge.dust_txs,
                      edge.poisoning_txs
                    );

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Badge variant={riskLevel.color as any} className="text-xs">
                              {riskLevel.level}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 font-mono text-sm">
                            <span className="font-medium">
                              {edge.source.slice(0, 8)}...
                              {edge.source.slice(-6)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {edge.target.slice(0, 8)}...
                              {edge.target.slice(-6)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-lg font-bold text-foreground">{edge.weight}</div>
                            <div className="text-xs text-muted-foreground">
                              Weight
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold">
                              {parseFloat(
                                edge.avg_amount?.toString() || "0"
                              ).toFixed(4)} SOL
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Average
                            </div>
                          </div>
                          <div className="text-center">
                            <Badge
                              variant={connectionType.color as any}
                              className="text-xs"
                            >
                              {connectionType.type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {new Date(edge.last_interaction).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last activity
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clusters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Network Clusters</CardTitle>
                <CardDescription>
                  Identified groups of interconnected addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Advanced clustering analysis will be displayed here
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This feature uses the enhanced network pattern analysis from
                    the backend improvements
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        level: "High Risk",
                        count: filteredData.filter(
                          (e) =>
                            getRiskLevel(e.weight, e.dust_txs, e.poisoning_txs)
                              .level === "High"
                        ).length,
                        color: "bg-red-500",
                      },
                      {
                        level: "Medium Risk",
                        count: filteredData.filter(
                          (e) =>
                            getRiskLevel(e.weight, e.dust_txs, e.poisoning_txs)
                              .level === "Medium"
                        ).length,
                        color: "bg-yellow-500",
                      },
                      {
                        level: "Low Risk",
                        count: filteredData.filter(
                          (e) =>
                            getRiskLevel(e.weight, e.dust_txs, e.poisoning_txs)
                              .level === "Low"
                        ).length,
                        color: "bg-green-500",
                      },
                    ].map((item) => (
                      <div
                        key={item.level}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${item.color}`} />
                          <span className="text-sm font-medium">{item.level}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold">{item.count}</span>
                          <span className="text-xs text-muted-foreground">
                            ({filteredData.length > 0
                              ? ((item.count / filteredData.length) * 100).toFixed(1)
                              : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Detection Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">
                        Total Connections Analyzed
                      </span>
                      <span className="text-lg font-bold text-blue-600">{filteredData.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm font-medium">Dust Connections</span>
                      <span className="text-lg font-bold text-amber-600">
                        {stats?.dustConnections || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium">Poisoning Connections</span>
                      <span className="text-lg font-bold text-red-600">
                        {stats?.poisoningConnections || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Unique Addresses</span>
                      <span className="text-lg font-bold text-green-600">{stats?.totalNodes || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
