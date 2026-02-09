"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const isRateLimit = error.message.toLowerCase().includes("too many requests") || error.message.includes("429");

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center p-6 text-center">
      {isRateLimit ? (
        <Clock className="h-12 w-12 text-yellow-500 mb-4" />
      ) : (
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      )}
      <h2 className="text-xl font-semibold mb-2">
        {isRateLimit ? "Rate limit reached" : "Something went wrong"}
      </h2>
      <p className="text-muted-foreground mb-4">
        {isRateLimit
          ? "You're making too many requests. Please wait a moment before trying again."
          : error.message}
      </p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}
