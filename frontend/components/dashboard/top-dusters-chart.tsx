import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DusterWallet } from "@/app/types/transactions";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface TopDustersChartProps {
  data: DusterWallet[];
}

export default function TopDustersChart({ data }: TopDustersChartProps) {
  if (!data || data.length === 0) {
    return null; // Don't render anything if there's no data
  }

  const chartData = data
    .slice(0, 5) // Show top 5
    .map((duster) => ({
      address: `${duster.address.substring(0, 6)}...`,
      transfers: duster.smallTransfersCount,
    }))
    .reverse(); // To display top-to-bottom in chart

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Dusters by Transfers</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="address"
              stroke="#888888"
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#333333" }}
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            <Bar
              dataKey="transfers"
              fill="#fb923c" // orange-400
              radius={[0, 4, 4, 0]}
              name="Dust Transfers"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
