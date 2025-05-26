import { Card, CardContent, CardHeader } from "../ui/card";
import { Clock } from "lucide-react";

export default function AlertsTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-cyan-200">Security Alerts</h3>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10">
          <Clock className="h-16 w-16 mx-auto text-blue-500 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-cyan-300">
            Coming Soon: Real-time Alerts
          </h3>
          <p className="text-cyan-200 max-w-md mx-auto mb-6">
            Our real-time alert system is in the final stages of development.
            Soon you'll be able to configure and monitor security alerts for
            dusting attacks, poisoning attempts, and other suspicious blockchain
            activity.
          </p>
          <div className="flex justify-center items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-75"></div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
          </div>
          <p className="text-xs text-cyan-400 mt-4">
            Expected launch: May 2025
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
