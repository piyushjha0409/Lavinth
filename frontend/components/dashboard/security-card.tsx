import { Card, CardContent } from "@/components/ui/card";

export interface SecurityCardProps {
  title: string;
  value: number;
  description: string;
  severity: "low" | "medium" | "high";
  icon: React.ReactNode;
}

export function SecurityCard({
  title,
  value,
  description,
  severity,
  icon,
}: SecurityCardProps) {
  const severityColor = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div
            className={`p-3 rounded-full ${
              severity === "high"
                ? "bg-red-100"
                : severity === "medium"
                ? "bg-yellow-100"
                : "bg-green-100"
            }`}
          >
            {icon}
          </div>
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-end">
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
          <span
            className={`px-2 py-1 rounded text-xs ${severityColor[severity]}`}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Risk
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default SecurityCard;
