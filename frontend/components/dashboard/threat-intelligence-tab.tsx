"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Users,
  Eye,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

// Import existing components for reuse
import AttackersTab from "./attackers-tab";
import VictimsTab from "./victims-tab";
import DustingCandidatesTab from "./dusting-candidates-tab";

interface ThreatSummary {
  totalAttackers: number;
  totalVictims: number;
  totalCandidates: number;
  highRiskThreats: number;
  activeThreats24h: number;
  avgRiskScore: number;
}

export default function ThreatIntelligenceTab() {
  const [activeSubTab, setActiveSubTab] = useState("attackers");
  const [threatSummary, setThreatSummary] = useState<ThreatSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchThreatSummary = async () => {
    setIsLoading(true);
    try {
      // Fetch summary data from multiple endpoints
      const [threatsRes, candidatesRes] = await Promise.all([
        fetch("/api/top-threats"),
        fetch("/api/dusting-candidates?minRiskScore=0.5&limit=10"),
      ]);

      if (threatsRes.ok && candidatesRes.ok) {
        const threats = await threatsRes.json();
        const candidates = await candidatesRes.json();

        setThreatSummary({
          totalAttackers: threats.topAttackers?.length || 0,
          totalVictims: threats.topVictims?.length || 0,
          totalCandidates: candidates.length || 0,
          highRiskThreats:
            candidates.filter((c: any) => c.risk_score >= 0.7).length || 0,
          activeThreats24h:
            threats.topAttackers?.filter(
              (a: any) =>
                new Date(a.last_activity) >
                new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length || 0,
          avgRiskScore:
            candidates.length > 0
              ? candidates.reduce(
                  (sum: number, c: any) => sum + c.risk_score,
                  0
                ) / candidates.length
              : 0,
        });
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching threat summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatSummary();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchThreatSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "attackers":
        return <AttackersTab />;
      case "victims":
        return <VictimsTab />;
      case "watchlist":
        return <DustingCandidatesTab />;
      default:
        return <AttackersTab />;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Threat Intelligence
            </h2>
            <p className="text-muted-foreground">
              Comprehensive threat analysis and monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchThreatSummary}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Threat Overview */}
        {threatSummary && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Attackers
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {threatSummary.totalAttackers}
                </div>
                <p className="text-xs text-muted-foreground">
                  {threatSummary.activeThreats24h} active in 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Potential Victims
                </CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {threatSummary.totalVictims}
                </div>
                <p className="text-xs text-muted-foreground">
                  Addresses at risk
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Risk Candidates
                </CardTitle>
                <Eye className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {threatSummary.totalCandidates}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress
                    value={(threatSummary.avgRiskScore || 0) * 100}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((threatSummary.avgRiskScore || 0) * 100)}% avg
                    risk
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Threat Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              <span>Threat Analysis</span>
            </CardTitle>
            <CardDescription>
              Search and analyze threats across all intelligence sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search addresses, risk scores, patterns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>

            {/* Tabbed Interface for Different Threat Types */}
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="attackers"
                  className="flex items-center space-x-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Attackers</span>
                </TabsTrigger>
                <TabsTrigger
                  value="victims"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Victims</span>
                </TabsTrigger>
                <TabsTrigger
                  value="watchlist"
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Risk Candidates</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attackers" className="mt-6">
                {renderSubTabContent()}
              </TabsContent>

              <TabsContent value="victims" className="mt-6">
                {renderSubTabContent()}
              </TabsContent>

              <TabsContent value="watchlist" className="mt-6">
                {renderSubTabContent()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
