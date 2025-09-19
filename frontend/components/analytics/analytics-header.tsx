"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  WalletIcon,
  AlertTriangle,
  Shield,
  Users,
  UserPlus,
  Banknote,
  Percent
} from "lucide-react";

export interface StatItem {
  id: string;
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface AnalyticsHeaderProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  stats: StatItem[];
}

export function AnalyticsHeader({ activeTab, onTabChange, stats }: AnalyticsHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.25, 0, 1] }}
        className="flex flex-col space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your transaction patterns and security metrics
        </p>
      </motion.div>

      {/* Stats Navigation as Tabs */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        className="bg-muted/30 rounded-lg p-1 overflow-x-auto"
      >
        <div className="flex space-x-1">
          {stats.slice(0, 5).map((stat, index) => (
            <motion.div
              key={stat.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.3, ease: [0.25, 0.25, 0, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                variant="ghost"
                className={cn(
                  "relative h-auto p-2 flex items-center space-x-2 transition-all duration-300 w-full",
                  "hover:bg-background/80 border-0 rounded-md",
                  activeTab === stat.id && "bg-background shadow-sm"
                )}
                onClick={() => onTabChange(stat.id)}
              >
                {/* Active tab indicator */}
                {activeTab === stat.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background rounded-md shadow-sm border"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className="relative flex items-center space-x-2 w-full min-w-0">
                  <motion.div 
                    className={cn("p-1.5 rounded-md flex-shrink-0", stat.color)}
                    whileHover={{ rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-4 h-4">
                      {stat.icon}
                    </div>
                  </motion.div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-baseline space-x-1">
                      <motion.span 
                        className="text-sm font-bold truncate"
                        key={stat.value}
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {stat.value}
                      </motion.span>
                    </div>
                    <span className={cn(
                      "text-xs font-medium transition-colors duration-200 truncate block",
                      activeTab === stat.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stat.title}
                    </span>
                  </div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
        
        {/* Second row for remaining tabs */}
        {stats.length > 5 && (
          <div className="flex space-x-1 mt-1">
            {stats.slice(5).map((stat, index) => (
              <motion.div
                key={stat.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.3, ease: [0.25, 0.25, 0, 1], delay: 0.05 * (index + 5) }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "relative h-auto p-2 flex items-center space-x-2 transition-all duration-300 w-full",
                    "hover:bg-background/80 border-0 rounded-md",
                    activeTab === stat.id && "bg-background shadow-sm"
                  )}
                  onClick={() => onTabChange(stat.id)}
                >
                  {/* Active tab indicator */}
                  {activeTab === stat.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-background rounded-md shadow-sm border"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <div className="relative flex items-center space-x-2 w-full min-w-0">
                    <motion.div 
                      className={cn("p-1.5 rounded-md flex-shrink-0", stat.color)}
                      whileHover={{ rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-4 h-4">
                        {stat.icon}
                      </div>
                    </motion.div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-baseline space-x-1">
                        <motion.span 
                          className="text-sm font-bold truncate"
                          key={stat.value}
                          initial={{ scale: 1.1, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {stat.value}
                        </motion.span>
                      </div>
                      <span className={cn(
                        "text-xs font-medium transition-colors duration-200 truncate block",
                        activeTab === stat.id ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {stat.title}
                      </span>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Helper function to create stat items from dashboard data
export function createStatItems(dashboardData: any): StatItem[] {
  return [
    {
      id: "transactions",
      title: "Total Transactions",
      value: dashboardData?.activeTransactions?.toLocaleString() || "0",
      icon: <Activity className="h-5 w-5 text-white" />,
      color: "bg-blue-500",
      description: "Total number of transactions processed across all networks"
    },
    {
      id: "successful",
      title: "Successful",
      value: dashboardData?.successfulTransactions?.toLocaleString() || "0",
      icon: <ArrowUpRight className="h-5 w-5 text-white" />,
      color: "bg-green-500",
      description: "Successfully completed transactions with confirmed status"
    },
    {
      id: "failed",
      title: "Failed",
      value: dashboardData?.failedTransactions?.toLocaleString() || "0",
      icon: <ArrowDownRight className="h-5 w-5 text-white" />,
      color: "bg-red-500",
      description: "Failed transactions due to various network or validation issues"
    },
    {
      id: "volume",
      title: "Volume (SOL)",
      value: `${(dashboardData?.totalVolume || 0).toFixed(2)}K`,
      icon: <DollarSign className="h-5 w-5 text-white" />,
      color: "bg-yellow-500",
      description: "Total transaction volume in SOL across all processed transactions"
    },
    {
      id: "dust",
      title: "Dust Attacks",
      value: dashboardData?.potentialDustCount?.toLocaleString() || "0",
      icon: <WalletIcon className="h-5 w-5 text-white" />,
      color: "bg-orange-500",
      description: "Potential dust attack transactions detected by our security algorithms"
    },
    {
      id: "poisoning",
      title: "Poisoning Attempts",
      value: dashboardData?.poisoningAttempts?.toLocaleString() || "0",
      icon: <AlertTriangle className="h-5 w-5 text-white" />,
      color: "bg-purple-500",
      description: "Address poisoning attempts identified through pattern analysis"
    },
    {
      id: "sources",
      title: "Dusting Sources",
      value: dashboardData?.dustingSources?.toLocaleString() || "0",
      icon: <Shield className="h-5 w-5 text-white" />,
      color: "bg-indigo-500",
      description: "Unique wallet addresses identified as sources of dust transactions"
    },
    {
      id: "senders",
      title: "Unique Senders",
      value: dashboardData?.uniqueSenders?.toLocaleString() || "0",
      icon: <Users className="h-5 w-5 text-white" />,
      color: "bg-teal-500",
      description: "Total number of unique sender addresses in the transaction pool"
    },
    {
      id: "recipients",
      title: "Recipients",
      value: dashboardData?.uniqueRecipients?.toLocaleString() || "0",
      icon: <UserPlus className="h-5 w-5 text-white" />,
      color: "bg-cyan-500",
      description: "Total number of unique recipient addresses receiving transactions"
    },
    {
      id: "fees",
      title: "Avg Fee",
      value: `${(dashboardData?.avgTransactionFee || 0).toFixed(6)}`,
      icon: <Banknote className="h-5 w-5 text-white" />,
      color: "bg-emerald-500",
      description: "Average transaction fee across all processed transactions"
    }
  ];
}
