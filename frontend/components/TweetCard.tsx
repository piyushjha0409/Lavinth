import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define the ApiTransaction interface here to avoid circular imports
interface ApiTransaction {
  id: number;
  signature: string;
  timestamp: string;
  slot: string;
  success: boolean;
  sender: string;
  recipient: string;
  amount: string;
  fee: string;
  token_type: string;
  token_address: string | null;
  is_potential_dust: boolean;
  is_potential_poisoning: boolean;
  risk_score: string;
  created_at: string;
}

interface TweetCardProps {
  transaction: ApiTransaction;
}

export function TweetCard({ transaction }: TweetCardProps) {
  // Format timestamp
  const formattedDate = new Date(transaction.timestamp).toLocaleString();
  
  // Determine risk level badge color
  const riskScore = parseFloat(transaction.risk_score);
  let riskBadgeVariant: "outline" | "destructive" | "secondary" = "outline";
  let riskLabel = "Low Risk";
  
  if (riskScore >= 0.7) {
    riskBadgeVariant = "destructive";
    riskLabel = "High Risk";
  } else if (riskScore >= 0.4) {
    riskBadgeVariant = "secondary";
    riskLabel = "Medium Risk";
  }

  return (
    <Card className="border border-muted hover:border-muted-foreground/50 transition-colors bg-black">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-cyan-300">{transaction.sender.slice(0, 8)}...{transaction.sender.slice(-8)}</span>
            <span className="text-xs text-cyan-200">{formattedDate}</span>
          </div>
          <Badge variant={riskBadgeVariant}>{riskLabel}</Badge>
        </div>
        
        <div className="mt-2 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-cyan-200">Amount:</span>
            <span className="text-cyan-300 font-medium">{transaction.amount} {transaction.token_type}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-cyan-200">Recipient:</span>
            <span className="text-cyan-300 font-medium">{transaction.recipient.slice(0, 6)}...{transaction.recipient.slice(-6)}</span>
          </div>
          {transaction.is_potential_dust && (
            <div className="mt-2 text-yellow-400 text-xs font-medium">⚠️ Potential dust attack</div>
          )}
          {transaction.is_potential_poisoning && (
            <div className="mt-2 text-red-400 text-xs font-medium">⚠️ Potential address poisoning</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
