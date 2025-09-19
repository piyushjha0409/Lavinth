"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { FadeInUp, ScaleIn, SlideInLeft } from "./motion-wrapper";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

interface StatDetailViewProps {
  statId: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description: string;
  dashboardData: any;
}

// Sample data generators for different chart types
const generateTimeSeriesData = (days: number = 30) => {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    value: Math.floor(Math.random() * 1000) + 100,
    previous: Math.floor(Math.random() * 800) + 50
  }));
};

const generateDistributionData = () => [
  { name: "Successful", value: 75, color: "#10b981" },
  { name: "Failed", value: 15, color: "#ef4444" },
  { name: "Pending", value: 10, color: "#f59e0b" }
];

const generateVolumeData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    volume: Math.floor(Math.random() * 50) + 10,
    transactions: Math.floor(Math.random() * 200) + 50
  }));
};

export function StatDetailView({ 
  statId, 
  title, 
  value, 
  icon, 
  color, 
  description, 
  dashboardData 
}: StatDetailViewProps) {
  
  const renderChart = () => {
    switch (statId) {
      case "transactions":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={generateTimeSeriesData()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" className="text-xs" />
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
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "successful":
      case "failed":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={generateDistributionData()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {generateDistributionData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "volume":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={generateVolumeData()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="volume" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "dust":
      case "poisoning":
      case "sources":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={generateTimeSeriesData(7)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#f97316" 
                strokeWidth={3}
                dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={generateTimeSeriesData()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" className="text-xs" />
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
                dataKey="value" 
                stroke="#6366f1" 
                fill="#6366f1" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  const getMetrics = () => {
    const baseMetrics = [
      { label: "24h Change", value: "+12.5%", trend: "up" },
      { label: "7d Average", value: "1,234", trend: "up" },
      { label: "Peak Value", value: "2,456", trend: "neutral" },
      { label: "Success Rate", value: "98.2%", trend: "up" }
    ];

    switch (statId) {
      case "transactions":
        return [
          { label: "24h Change", value: "+8.3%", trend: "up" },
          { label: "Peak TPS", value: "2,456", trend: "up" },
          { label: "Success Rate", value: "97.8%", trend: "up" },
          { label: "Avg Size", value: "0.045 SOL", trend: "neutral" }
        ];
      case "dust":
        return [
          { label: "Risk Level", value: "Medium", trend: "down" },
          { label: "Detection Rate", value: "94.2%", trend: "up" },
          { label: "False Positives", value: "2.1%", trend: "down" },
          { label: "Avg Amount", value: "0.001 SOL", trend: "neutral" }
        ];
      case "volume":
        return [
          { label: "24h Volume", value: "+15.7%", trend: "up" },
          { label: "Peak Hour", value: "14:00 UTC", trend: "neutral" },
          { label: "Avg Tx Size", value: "1.23 SOL", trend: "up" },
          { label: "Total Value", value: "$45.2K", trend: "up" }
        ];
      default:
        return baseMetrics;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <ScaleIn>
        <Card className="border-2 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className={`p-3 rounded-lg ${color}`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {icon}
                </motion.div>
                <div>
                  <CardTitle className="text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
              </div>
              <div className="text-right">
                <motion.div 
                  className="text-4xl font-bold"
                  key={value}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.25, 0, 1] }}
                >
                  {value}
                </motion.div>
                <Badge variant="secondary" className="mt-2">
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-green-500 rounded-full mr-2"
                  />
                  Live Data
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>
      </ScaleIn>

      {/* Chart and Metrics Grid */}
      <FadeInUp delay={0.2}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Trend Analysis</span>
                  <Badge variant="outline">Last 30 days</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  {renderChart()}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Metrics */}
          <SlideInLeft delay={0.4}>
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getMetrics().map((metric, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-all duration-200"
                  >
                    <div>
                      <p className="text-sm font-medium">{metric.label}</p>
                      <p className="text-lg font-bold">{metric.value}</p>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getTrendIcon(metric.trend)}
                    </motion.div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </SlideInLeft>
        </div>
      </FadeInUp>

      {/* Additional Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing Efficiency</span>
                <span>92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Security Score</span>
                <span>87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Network Health</span>
                <span>95%</span>
              </div>
              <Progress value={95} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: "2 min ago", event: "High volume detected", type: "info" },
                { time: "5 min ago", event: "Dust attack blocked", type: "warning" },
                { time: "12 min ago", event: "System optimization", type: "success" },
                { time: "18 min ago", event: "New pattern identified", type: "info" }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/30">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'warning' ? 'bg-yellow-500' :
                    activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.event}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
