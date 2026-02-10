"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="dark antialiased bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-6" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 max-w-md">{error.message}</p>
          <div className="flex gap-4">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
