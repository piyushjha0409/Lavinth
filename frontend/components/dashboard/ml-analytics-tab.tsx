"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, 
  RefreshCw, 
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  Zap,
  GitBranch,
  Database,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";

// Simplified ML metrics for early implementation
const ML_MODELS = [
  {
    name: "Random Forest",
    accuracy: 0.7234,
    precision: 0.6892,
    recall: 0.7456,
    status: "active",
    trainingTime: "15 min",
    dataPoints: 45000,
    features: 12
  },
  {
    name: "Logistic Regression",
    accuracy: 0.6789,
    precision: 0.6234,
    recall: 0.7123,
    status: "baseline",
    trainingTime: "3 min",
    dataPoints: 45000,
    features: 8
  },
  {
    name: "XGBoost (Basic)",
    accuracy: 0.7456,
    precision: 0.7123,
    recall: 0.7234,
    status: "testing",
    trainingTime: "28 min",
    dataPoints: 32000,
    features: 15
  }
];

const CURRENT_METRICS = {
  bestAccuracy: 0.7456,
  avgAccuracy: 0.7160,
  falsePositiveRate: 0.1234,
  falseNegativeRate: 0.0892,
  avgInferenceTime: "45ms",
  modelsInUse: 3,
  totalTrainingData: 45000
};

const FEATURE_IMPORTANCE = [
  { name: "Transaction Amount", importance: 0.28, category: "statistical" },
  { name: "Transaction Frequency", importance: 0.22, category: "behavioral" },
  { name: "Wallet Age", importance: 0.18, category: "metadata" },
  { name: "Fee Patterns", importance: 0.15, category: "statistical" },
  { name: "Address Similarity", importance: 0.12, category: "network" },
  { name: "Time Patterns", importance: 0.05, category: "behavioral" }
];

const TRAINING_PROGRESS = [
  { date: "2024-09-20", accuracy: 0.6234, dataSize: 15000, model: "Baseline" },
  { date: "2024-09-28", accuracy: 0.6789, dataSize: 25000, model: "Logistic Regression" },
  { date: "2024-10-05", accuracy: 0.7234, dataSize: 35000, model: "Random Forest" },
  { date: "2024-10-08", accuracy: 0.7456, dataSize: 45000, model: "XGBoost" }
];

export default function MLAnalyticsTab() {
  const [selectedModel, setSelectedModel] = useState("ensemble");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "production": return "bg-green-100 text-green-800";
      case "testing": return "bg-yellow-100 text-yellow-800";
      case "deprecated": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "behavioral": return "bg-blue-100 text-blue-800";
      case "statistical": return "bg-purple-100 text-purple-800";
      case "network": return "bg-green-100 text-green-800";
      case "metadata": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">ML Analytics</h2>
            <p className="text-muted-foreground">
              Machine learning model performance and algorithm improvements
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Models
            </Button>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Brain className="h-3 w-3 mr-1" />
              Ensemble Active
            </Badge>
          </div>
        </div>

        {/* Current ML Performance Overview */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Accuracy</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(CURRENT_METRICS.bestAccuracy * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                XGBoost model performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">False Positive Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(CURRENT_METRICS.falsePositiveRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Room for improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inference Time</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {CURRENT_METRICS.avgInferenceTime}
              </div>
              <p className="text-xs text-muted-foreground">
                Average per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Data</CardTitle>
              <Database className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(CURRENT_METRICS.totalTrainingData / 1000).toFixed(0)}K
              </div>
              <p className="text-xs text-muted-foreground">
                Labeled transactions
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="models" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="models">Model Performance</TabsTrigger>
            <TabsTrigger value="features">Feature Analysis</TabsTrigger>
            <TabsTrigger value="training">Training History</TabsTrigger>
            <TabsTrigger value="deployment">Production Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Individual Model Performance</CardTitle>
                <CardDescription>
                  Comparison of different ML algorithms in the ensemble
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ML_MODELS.map((model, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Badge variant="secondary" className={getStatusColor(model.status)}>
                            {model.status === 'production' ? <CheckCircle className="h-3 w-3 mr-1" /> : 
                             model.status === 'testing' ? <Clock className="h-3 w-3 mr-1" /> : null}
                            {model.status}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-semibold">{model.name}</h4>
                          <p className="text-sm text-muted-foreground">{model.features} features • {model.trainingTime}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold">{(model.accuracy * 100).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{(model.precision * 100).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Precision</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{(model.recall * 100).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Recall</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Importance Analysis</CardTitle>
                <CardDescription>
                  Top contributing features in the ensemble model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {FEATURE_IMPORTANCE.map((feature, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{feature.name}</span>
                          <Badge variant="secondary" className={`text-xs ${getCategoryColor(feature.category)}`}>
                            {feature.category}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold">{(feature.importance * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={feature.importance * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Progress & Model Development</CardTitle>
                <CardDescription>
                  Our journey in building ML models for dust detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TRAINING_PROGRESS.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <GitBranch className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">{entry.model}</div>
                          <div className="text-sm text-muted-foreground">{entry.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-lg font-bold">{(entry.accuracy * 100).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{entry.dataSize.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Training Samples</div>
                        </div>
                        {index > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              +{((entry.accuracy - TRAINING_PROGRESS[index-1].accuracy) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Improvement</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Production Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Model Status</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Running
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Predictions/hour</span>
                      <span className="font-semibold">~3,200</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Response Time</span>
                      <span className="font-semibold">45ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="font-semibold">1.2GB / 4GB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">CPU Usage</span>
                      <span className="font-semibold">18.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Daily Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Transactions Analyzed</span>
                      <span className="font-semibold">12,847</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Potential Dust</span>
                      <span className="font-semibold text-orange-600">892</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Confidence</span>
                      <span className="font-semibold text-red-600">234</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Clean Transactions</span>
                      <span className="font-semibold text-green-600">11,721</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Detection Rate</span>
                      <span className="font-semibold">8.8%</span>
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
