"use client";

import MyTokenApprovals from "./my-token-approvals";

export default function TokenApprovalsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold tracking-tight">
          Token Approvals
        </h2>
        <p className="text-muted-foreground">
          Manage and revoke token delegate approvals for your connected wallet
        </p>
      </div>

      <MyTokenApprovals />
    </div>
  );
}
