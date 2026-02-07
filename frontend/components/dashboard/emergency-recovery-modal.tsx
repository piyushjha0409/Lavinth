"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TokenApproval {
  walletAddress: string;
  tokenMint: string;
  tokenAccount: string;
  delegateAddress: string;
  delegatedAmount: number;
  isUnlimited: boolean;
  riskScore: number;
  riskFactors: {
    isKnownMalicious: boolean;
    isUnlimited: boolean;
    isNewDelegate: boolean;
    hasHighVolume: boolean;
  };
  delegateLabel?: string;
  status: string;
}

interface EmergencyRecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  approvals: TokenApproval[];
  onSuccess: () => void;
}

type RevocationStep = "preview" | "preparing" | "signing" | "submitting" | "complete" | "error";

export function EmergencyRecoveryModal({
  open,
  onOpenChange,
  walletAddress,
  approvals,
  onSuccess,
}: EmergencyRecoveryModalProps) {
  const [step, setStep] = useState<RevocationStep>("preview");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<string[]>([]);
  const [estimatedFee, setEstimatedFee] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<string[]>([]);
  const { toast } = useToast();

  // Filter high-risk approvals
  const highRiskApprovals = approvals.filter(
    (a) => a.riskScore >= 50 || a.isUnlimited
  );

  // Create emergency revocation plan
  const handleCreatePlan = async () => {
    setStep("preparing");
    setError(null);
    setProgress(10);

    try {
      const response = await fetch("/api/approvals/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create revocation plan");
      }

      setSessionId(data.sessionId);
      setTransactions(data.transactions);
      setEstimatedFee(data.estimatedTotalFee);
      setProgress(30);
      setStep("signing");

      toast({
        title: "Plan Created",
        description: `Ready to revoke ${data.totalHighRiskApprovals} approvals`,
      });
    } catch (err: any) {
      console.error("Error creating plan:", err);
      setError(err.message);
      setStep("error");
    }
  };

  // Handle wallet signing (placeholder - would integrate with wallet adapter)
  const handleSign = async () => {
    setProgress(50);

    // In a real implementation, this would:
    // 1. Connect to wallet (Phantom, Solflare, etc.)
    // 2. Sign each transaction
    // 3. Return signed transactions

    toast({
      title: "Wallet Connection Required",
      description: "Please connect your wallet to sign the revocation transactions. This feature requires wallet adapter integration.",
      variant: "default",
    });

    // For now, show that signing would happen here
    setStep("signing");
  };

  // Submit signed transactions
  const handleSubmit = async (signedTransactions: string[]) => {
    if (!sessionId) return;

    setStep("submitting");
    setProgress(70);

    try {
      const response = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          signedTransactions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit transactions");
      }

      setProgress(100);
      setSignatures(data.signatures);
      setStep("complete");

      toast({
        title: "Success!",
        description: `Successfully revoked ${data.totalRevoked} approvals`,
      });

      // Call success callback after delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting:", err);
      setError(err.message);
      setStep("error");
    }
  };

  // Reset modal state
  const handleClose = () => {
    setStep("preview");
    setSessionId(null);
    setTransactions([]);
    setEstimatedFee(0);
    setProgress(0);
    setError(null);
    setSignatures([]);
    onOpenChange(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Transaction signature copied",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Emergency Revocation
          </DialogTitle>
          <DialogDescription>
            Revoke all high-risk token approvals from your wallet
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Preview Step */}
          {step === "preview" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This will revoke {highRiskApprovals.length} token approvals.
                  Make sure you understand what approvals are being revoked.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">Approvals to Revoke:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {highRiskApprovals.map((approval, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            approval.riskScore >= 75
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          Risk: {approval.riskScore}
                        </Badge>
                        <span className="text-sm font-mono">
                          {approval.tokenAccount.slice(0, 8)}...
                        </span>
                      </div>
                      {approval.isUnlimited && (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Estimated network fee: ~{(estimatedFee / 1e9).toFixed(6)} SOL
              </div>
            </div>
          )}

          {/* Preparing Step */}
          {step === "preparing" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-lg font-medium">Preparing Transactions...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Creating revocation instructions
              </p>
              <Progress value={progress} className="mt-4" />
            </div>
          )}

          {/* Signing Step */}
          {step === "signing" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Shield className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <p className="text-lg font-medium">Ready to Sign</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {transactions.length} transaction(s) prepared
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Wallet Connection Required</AlertTitle>
                <AlertDescription>
                  To complete the revocation, you need to connect your wallet and
                  sign the transactions. This ensures only you can revoke your
                  approvals.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Transaction Summary:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• {highRiskApprovals.length} approvals will be revoked</li>
                  <li>• {transactions.length} transaction(s) to sign</li>
                  <li>
                    • Estimated fee: ~{(estimatedFee / 1e9).toFixed(6)} SOL
                  </li>
                </ul>
              </div>

              <Progress value={progress} className="mt-4" />
            </div>
          )}

          {/* Submitting Step */}
          {step === "submitting" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-lg font-medium">Submitting Transactions...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Broadcasting to Solana network
              </p>
              <Progress value={progress} className="mt-4" />
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium text-green-500">
                  Revocation Complete!
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your wallet is now more secure
                </p>
              </div>

              {signatures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Transaction Signatures:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {signatures.map((sig, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                      >
                        <span className="font-mono">
                          {sig.slice(0, 20)}...{sig.slice(-8)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(sig)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              window.open(
                                `https://solscan.io/tx/${sig}`,
                                "_blank"
                              )
                            }
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
                <p className="text-lg font-medium text-red-500">
                  Revocation Failed
                </p>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleCreatePlan}
                disabled={highRiskApprovals.length === 0}
              >
                Revoke {highRiskApprovals.length} Approvals
              </Button>
            </>
          )}

          {step === "signing" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSign}>
                Connect Wallet & Sign
              </Button>
            </>
          )}

          {(step === "preparing" || step === "submitting") && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </Button>
          )}

          {step === "complete" && (
            <Button onClick={handleClose}>Done</Button>
          )}

          {step === "error" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleCreatePlan}>Try Again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
