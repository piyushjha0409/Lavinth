"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Menu, PanelLeftClose } from "lucide-react";
import { MobileSidebar } from "./sidebar";
import { WalletCheckModal } from "./wallet-check-modal";

const getTabTitle = (activeTab: string | null) => {
  switch (activeTab) {
    case "transactions":
      return "Transactions";
    case "dusting":
      return "Dusting Analysis";
    case "api-keys":
      return "API Keys";
    case "poisoning":
      return "Poisoning Detection";
    case "attackers":
      return "Attackers";
    case "victims":
      return "Victims";
    case "alerts":
      return "Alerts";
    default:
      return "Dashboard Overview";
  }
};

function HeaderContent() {
  const [isWalletCheckOpen, setIsWalletCheckOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const title = getTabTitle(activeTab);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    document.dispatchEvent(
      new CustomEvent("toggle-sidebar", {
        detail: { collapsed: !isSidebarCollapsed },
      })
    );
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <MobileSidebar />

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex"
        onClick={toggleSidebar}
        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isSidebarCollapsed ? (
          <Menu className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
        <span className="sr-only">
          {isSidebarCollapsed ? "Expand" : "Collapse"} sidebar
        </span>
      </Button>

      <h1 className="text-lg font-semibold md:text-xl hidden md:block">
        {title}
      </h1>
      <div className="flex-1" />

      <Button
        variant="default"
        size="sm"
        className="gap-2"
        onClick={() => setIsWalletCheckOpen(true)}
      >
        <Shield className="h-4 w-4" />
        Wallet Check
      </Button>

      <WalletCheckModal
        isOpen={isWalletCheckOpen}
        onClose={() => setIsWalletCheckOpen(false)}
      />
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={
      <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
        <div className="flex-1" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}
