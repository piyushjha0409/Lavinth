"use client";

import ApiKeysTab from "./api-keys-tab";

export default function SettingsApiTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Management</h2>
          <p className="text-muted-foreground">
            Manage API keys and access comprehensive wallet security
            documentation
          </p>
        </div>
      </div>

      <ApiKeysTab />
    </div>
  );
}
