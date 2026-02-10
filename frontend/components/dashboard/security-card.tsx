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
    low: "bg-severity-low/10 text-severity-low",
    medium: "bg-severity-medium/10 text-severity-medium",
    high: "bg-severity-critical/10 text-severity-critical",
  };

  const severityBadge = {
    low: "bg-severity-low/10 text-severity-low",
    medium: "bg-severity-medium/10 text-severity-medium",
    high: "bg-severity-critical/10 text-severity-critical",
  };

  return (
    <Card className="bg-card border-border/50 rounded-xl shadow-lg shadow-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${severityColor[severity]}`}>
            {icon}
          </div>
          <div>
            <h4 className="font-heading font-medium">{title}</h4>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-end">
          <div className="text-2xl font-heading font-bold">{value.toLocaleString()}</div>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${severityBadge[severity]}`}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Risk
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default SecurityCard;
