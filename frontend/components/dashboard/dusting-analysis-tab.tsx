import { WalletIcon, Users, ArrowRightLeft, Target } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { DashboardData, DusterWallet } from "@/app/types/transactions";
import { StatsCard } from "./stats-card";
import { motion } from "framer-motion";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import DustingTrendChart from "./dusting-trend-chart";
import TopDustersChart from "./top-dusters-chart";

export default function DustingAnalysisTab({
  dashboardData,
  topDusters,
}: {
  dashboardData: DashboardData | null;
  topDusters: DusterWallet[];
}) {
  const stats = [
    {
      title: "Total Transactions",
      value: dashboardData?.activeTransactions || 0,
      icon: <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Dust Transactions",
      value: dashboardData?.potentialDustCount || 0,
      icon: <Target className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Potential Dusters",
      value: topDusters.length,
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  const totalDustFromTop = topDusters.reduce(
    (sum, duster) => sum + duster.smallTransfersCount,
    0
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-blue-500 text-transparent bg-clip-text">
          Dusting Analysis
        </h2>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        variants={containerVariants}
      >
        {stats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <DustingTrendChart data={dashboardData?.dailySummary} />
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <TopDustersChart data={topDusters} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-yellow-300 to-orange-500 text-transparent bg-clip-text">
                Top Dusting Wallets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet</TableHead>
                    <TableHead className="text-right">Transfers</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDusters.slice(0, 7).map((duster, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[150px]">
                          {duster.address}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {duster.uniqueRecipients.length} unique recipients
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {duster.smallTransfersCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {((
                            duster.smallTransfersCount / totalDustFromTop
                          ) * 100).toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {topDusters.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No dusters found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}


