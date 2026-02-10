import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: number;
  valueFormatter?: (val: number) => string;
  icon: React.ReactNode;
  change?: number;
  trend?: "up" | "down" | "neutral";
}

export function StatsCard({
  title,
  value,
  valueFormatter,
  icon,
  change = 0,
  trend = "neutral",
}: StatsCardProps) {
  const formattedValue = valueFormatter
    ? valueFormatter(value)
    : value.toLocaleString();

  return (
    <Card className="bg-card border-border/50 rounded-xl shadow-lg shadow-primary/5 hover:border-primary/20 transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn(
          "rounded-lg p-2",
          trend === "up" && "bg-severity-low/10 text-severity-low",
          trend === "down" && "bg-severity-critical/10 text-severity-critical",
          trend === "neutral" && "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-heading font-bold">{formattedValue}</div>
        {change !== 0 && (
          <p className={cn(
            "text-xs flex items-center mt-1",
            trend === "up" && "text-severity-low",
            trend === "down" && "text-severity-critical",
            trend === "neutral" && "text-muted-foreground"
          )}>
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change).toFixed(1)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default StatsCard;
