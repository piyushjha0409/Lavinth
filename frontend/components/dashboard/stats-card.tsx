import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formattedValue}</p>
          </div>
          <div className="rounded-full bg-muted p-2">{icon}</div>
        </div>
        {change !== 0 && (
          <div
            className={`mt-4 flex items-center text-sm ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            ) : null}
            <span>
              {Math.abs(change).toFixed(1)}%{" "}
              {trend === "up" ? "increase" : "decrease"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatsCard;
