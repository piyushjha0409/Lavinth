import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";

export default function PoisoningDetectionTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-cyan-200">
          Poisoning Detection
        </h3>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10">
          <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-cyan-300">
            Coming Soon: Address Poisoning Analysis
          </h3>
          <p className="text-cyan-200 max-w-md mx-auto mb-6">
            Our advanced poisoning detection module is currently under
            development. Soon you'll be able to detect potential address
            poisoning attacks by analyzing transaction patterns and identifying
            similar addresses used in suspicious transactions.
          </p>
          <div className="flex justify-center items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-75"></div>
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-150"></div>
          </div>
          <p className="text-xs text-cyan-400 mt-4">
            Expected launch: June 2025
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
