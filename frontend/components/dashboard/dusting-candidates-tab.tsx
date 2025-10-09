"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye, 
  RefreshCw, 
  Filter,
  AlertTriangle,
  TrendingUp,
  Clock,
  Search,
  BarChart3
} from "lucide-react";

interface DustingCandidate {
  address: string;
  risk_score: number;
  first_detected_at: string;
  last_updated: string;
}

interface CandidateStats {
  totalCandidates: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  avgRiskScore: number;
  recentDetections: number;
}

interface SystemStatus {
  enhancedDetection: { status: string; label: string };
  walletIntelligence: { status: string; label: string };
  realTimeUpdates: { status: string; label: string };
  coverageImprovement: { ratio: number; label: string };
  lastUpdated: string;
}

// Configuration for production
const RISK_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.4,
  LOW: 0.0
} as const;

const DEFAULT_CONFIG = {
  MIN_RISK_SCORE: 0.3,
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 500,
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

export default function DustingCandidatesTab() {
  const [candidates, setCandidates] = useState<DustingCandidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<DustingCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [minRiskScore, setMinRiskScore] = useState<number[]>([DEFAULT_CONFIG.MIN_RISK_SCORE]);
  const [limit, setLimit] = useState<number[]>([DEFAULT_CONFIG.DEFAULT_LIMIT]);
  const [searchAddress, setSearchAddress] = useState("");
  const [sortBy, setSortBy] = useState("risk_score");
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const fetchCandidates = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [candidatesRes, statusRes] = await Promise.all([
        fetch(`/api/dusting-candidates?minRiskScore=${minRiskScore[0]}&limit=${limit[0]}`),
        fetch('/api/system-status')
      ]);
      
      if (candidatesRes.ok) {
        const data = await candidatesRes.json();
        setCandidates(data);
        setFilteredCandidates(data);
        calculateStats(data);
      }
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemStatus(statusData);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const calculateStats = (data: DustingCandidate[]) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const highRisk = data.filter(c => c.risk_score >= RISK_THRESHOLDS.HIGH).length;
    const mediumRisk = data.filter(c => c.risk_score >= RISK_THRESHOLDS.MEDIUM && c.risk_score < RISK_THRESHOLDS.HIGH).length;
    const lowRisk = data.filter(c => c.risk_score < RISK_THRESHOLDS.MEDIUM).length;
    const avgRiskScore = data.length > 0 ? data.reduce((sum, c) => sum + c.risk_score, 0) / data.length : 0;
    const recentDetections = data.filter(c => new Date(c.last_updated) > oneDayAgo).length;

    setStats({
      totalCandidates: data.length,
      highRisk,
      mediumRisk,
      lowRisk,
      avgRiskScore,
      recentDetections
    });
  };

  const filterAndSortCandidates = () => {
    let filtered = [...candidates];

    // Filter by search address
    if (searchAddress) {
      filtered = filtered.filter(candidate => 
        candidate.address.toLowerCase().includes(searchAddress.toLowerCase())
      );
    }

    // Sort candidates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'risk_score':
          return b.risk_score - a.risk_score;
        case 'first_detected_at':
          return new Date(b.first_detected_at).getTime() - new Date(a.first_detected_at).getTime();
        case 'last_updated':
          return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
        default:
          return 0;
      }
    });

    setFilteredCandidates(filtered);
    calculateStats(filtered);
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    // Debounce API calls when filters change
    const timeoutId = setTimeout(() => {
      fetchCandidates(false); // Don't show loading spinner for filter changes
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [minRiskScore, limit]);

  useEffect(() => {
    filterAndSortCandidates();
  }, [searchAddress, sortBy, candidates]);

  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= RISK_THRESHOLDS.HIGH) return { level: "High", color: "destructive", bgColor: "bg-red-100" };
    if (riskScore >= RISK_THRESHOLDS.MEDIUM) return { level: "Medium", color: "secondary", bgColor: "bg-yellow-100" };
    return { level: "Low", color: "outline", bgColor: "bg-green-100" };
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Risk Candidates</h2>
            <p className="text-muted-foreground">Loading candidate analysis...</p>
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
            <h2 className="text-2xl font-bold tracking-tight">Risk Candidates</h2>
            <p className="text-muted-foreground">
              {stats?.totalCandidates || 0} addresses flagged for potential dusting activity
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchCandidates(true)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCandidates || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tracked addresses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.highRisk || 0}</div>
              <p className="text-xs text-muted-foreground">
                Risk score ≥ 70%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Risk</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.avgRiskScore ? (stats.avgRiskScore * 100).toFixed(1) : '0.0'}%
              </div>
              <Progress 
                value={(stats?.avgRiskScore || 0) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.recentDetections || 0}</div>
              <p className="text-xs text-muted-foreground">
                Updated in 24h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Candidate Filters
            </CardTitle>
            <CardDescription>
              Adjust parameters to explore different risk levels and detection criteria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Minimum Risk Score: {(minRiskScore[0] * 100).toFixed(0)}%</Label>
                <Slider
                  value={minRiskScore}
                  onValueChange={setMinRiskScore}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Results: {limit[0]}</Label>
                <Slider
                  value={limit}
                  onValueChange={setLimit}
                  max={DEFAULT_CONFIG.MAX_LIMIT}
                  min={50}
                  step={50}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Search Address</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter address..."
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk_score">Risk Score</SelectItem>
                    <SelectItem value="last_updated">Last Updated</SelectItem>
                    <SelectItem value="first_detected_at">First Detected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Data */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Candidate List</TabsTrigger>
            <TabsTrigger value="analytics">Risk Analytics</TabsTrigger>
            <TabsTrigger value="timeline">Detection Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Details</CardTitle>
                <CardDescription>
                  Detailed view of dusting candidates ({filteredCandidates.length} shown)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredCandidates.map((candidate, index) => {
                    const riskLevel = getRiskLevel(candidate.risk_score);
                    
                    return (
                      <div key={candidate.address} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Badge variant={riskLevel.color as any} className="text-xs">
                              {riskLevel.level}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <p className="font-mono text-sm font-medium">
                              {candidate.address.slice(0, 12)}...{candidate.address.slice(-8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              First detected: {new Date(candidate.first_detected_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                              {(candidate.risk_score * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Risk Score
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {getTimeSince(candidate.last_updated)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last updated
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

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { level: "High Risk (≥70%)", count: stats?.highRisk || 0, color: "bg-red-500", percentage: stats?.totalCandidates ? ((stats.highRisk / stats.totalCandidates) * 100) : 0 },
                      { level: "Medium Risk (40-69%)", count: stats?.mediumRisk || 0, color: "bg-yellow-500", percentage: stats?.totalCandidates ? ((stats.mediumRisk / stats.totalCandidates) * 100) : 0 },
                      { level: "Low Risk (<40%)", count: stats?.lowRisk || 0, color: "bg-green-500", percentage: stats?.totalCandidates ? ((stats.lowRisk / stats.totalCandidates) * 100) : 0 }
                    ].map((item) => (
                      <div key={item.level} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded ${item.color}`} />
                            <span>{item.level}</span>
                          </div>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                        <div className="text-xs text-muted-foreground text-right">
                          {item.percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detection Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Enhanced Detection</span>
                      <Badge 
                        variant="secondary" 
                        className={`${
                          systemStatus?.enhancedDetection.status === 'enabled' 
                            ? 'bg-green-100 text-green-800' 
                            : systemStatus?.enhancedDetection.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {systemStatus?.enhancedDetection.status === 'enabled' ? '✓' : 
                         systemStatus?.enhancedDetection.status === 'error' ? '✗' : '○'} {systemStatus?.enhancedDetection.label || 'Loading...'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Wallet Intelligence</span>
                      <Badge 
                        variant="secondary" 
                        className={`${
                          systemStatus?.walletIntelligence.status === 'active' 
                            ? 'bg-blue-100 text-blue-800' 
                            : systemStatus?.walletIntelligence.status === 'limited'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {systemStatus?.walletIntelligence.status === 'active' ? '✓' : 
                         systemStatus?.walletIntelligence.status === 'limited' ? '◐' : '○'} {systemStatus?.walletIntelligence.label || 'Loading...'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Real-time Updates</span>
                      <Badge 
                        variant="secondary" 
                        className={`${
                          systemStatus?.realTimeUpdates.status === 'live' 
                            ? 'bg-green-100 text-green-800' 
                            : systemStatus?.realTimeUpdates.status === 'idle'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {systemStatus?.realTimeUpdates.status === 'live' ? '✓' : 
                         systemStatus?.realTimeUpdates.status === 'idle' ? '◐' : '○'} {systemStatus?.realTimeUpdates.label || 'Loading...'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Coverage Improvement</span>
                      <Badge 
                        variant="secondary" 
                        className="bg-purple-100 text-purple-800"
                      >
                        {systemStatus?.coverageImprovement.label || 'Calculating...'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detection Timeline</CardTitle>
                <CardDescription>
                  Recent candidate detection activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredCandidates
                    .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
                    .slice(0, 20)
                    .map((candidate) => {
                      const riskLevel = getRiskLevel(candidate.risk_score);
                      return (
                        <div key={candidate.address} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex-shrink-0">
                            <Badge variant={riskLevel.color as any} className="text-xs">
                              {riskLevel.level}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <p className="font-mono text-sm font-medium">
                              {candidate.address.slice(0, 12)}...{candidate.address.slice(-8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Risk: {(candidate.risk_score * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{getTimeSince(candidate.last_updated)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(candidate.last_updated).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
