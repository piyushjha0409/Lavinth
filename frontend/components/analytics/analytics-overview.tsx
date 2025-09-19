"use client";

import { useState } from "react";
import { AnalyticsHeader, createStatItems, StatDetailView } from "./index";
import { MotionWrapper, FadeInUp, SlideInLeft, ScaleIn } from "./motion-wrapper";
import { DashboardData } from "@/app/types/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAddress } from "@/app/utils/dataProcessing";
import { Progress } from "@/components/ui/progress";
import { WalletIcon, User, AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface AnalyticsOverviewProps {
  dashboardData: DashboardData | null;
}

export function AnalyticsOverview({ dashboardData }: AnalyticsOverviewProps) {
  const [activeTab, setActiveTab] = useState("transactions");
  const stats = createStatItems(dashboardData);

  const activeStatItem = stats.find(stat => stat.id === activeTab);

  // Generate sample data for overview charts
  const generateOverviewData = () => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      transactions: Math.floor(Math.random() * 1000) + 500,
      successful: Math.floor(Math.random() * 800) + 400,
      failed: Math.floor(Math.random() * 200) + 50,
      volume: Math.floor(Math.random() * 50) + 20
    }));
  };

  const securityData = [
    { name: "Safe", value: 85, color: "#10b981" },
    { name: "Medium Risk", value: 12, color: "#f59e0b" },
    { name: "High Risk", value: 3, color: "#ef4444" }
  ];

  const overviewData = generateOverviewData();

  if (!activeStatItem) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Analytics Header with Stat Navigation */}
      <AnalyticsHeader 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
      />

      {/* Main Content Area */}
      <FadeInUp delay={0.3}>
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Detailed View for Selected Stat */}
          <motion.div 
            className="lg:col-span-3"
            key={activeStatItem.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.25, 0, 1] }}
          >
            <StatDetailView
              statId={activeStatItem.id}
              title={activeStatItem.title}
              value={activeStatItem.value}
              icon={activeStatItem.icon}
              color={activeStatItem.color}
              description={activeStatItem.description}
              dashboardData={dashboardData}
            />
          </motion.div>

          {/* Sidebar with Additional Info */}
          <SlideInLeft delay={0.4} className="space-y-6">
            {/* Security Overview */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={securityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {securityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {securityData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Attackers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Top Threats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.attackerPatterns && dashboardData.attackerPatterns.length > 0 ? (
                  dashboardData.attackerPatterns.slice(0, 3).map((attacker, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {formatAddress(attacker.address)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {attacker.risk_score.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {attacker.small_transfers_count} attacks • {attacker.unique_victims_count} victims
                      </div>
                      <Progress 
                        value={attacker.regularity_score * 100} 
                        className="h-1"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No threats detected
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Network Health</span>
                <Badge variant="secondary">Excellent</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm font-medium">99.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Update</span>
                <span className="text-sm font-medium">2 min ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data Quality</span>
                <Badge variant="default">High</Badge>
              </div>
            </CardContent>
          </Card>
          </SlideInLeft>
        </div>
      </FadeInUp>

      {/* Bottom Overview Charts */}
      <FadeInUp delay={0.6}>
        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Transaction Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={overviewData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="successful" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="failed" 
                  stackId="1"
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={overviewData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
      </FadeInUp>
    </div>
  );
}
