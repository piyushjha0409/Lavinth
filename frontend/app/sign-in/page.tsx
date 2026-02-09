"use client";

import Navbar from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { useWalletAuth } from "@/hooks/use-wallet-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

function SignInErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to load sign-in</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={resetErrorBoundary}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SignInContent() {
  const { connected } = useWalletAuth();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push("/dashboard");
    }
  }, [connected, router]);

  return (
    <>
      <Navbar showDashboardButton={false} />
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Connect your Solana wallet to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletMultiButton
              style={{
                width: "100%",
                justifyContent: "center",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <ErrorBoundary FallbackComponent={SignInErrorFallback}>
      <SignInContent />
    </ErrorBoundary>
  );
}
