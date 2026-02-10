"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSidebarCollapsed(customEvent.detail.collapsed);
    };

    document.addEventListener('toggle-sidebar', handleToggleSidebar);

    return () => {
      document.removeEventListener('toggle-sidebar', handleToggleSidebar);
    };
  }, []);
  return (
    <div className={cn(
      "grid min-h-screen w-full transition-all duration-300",
      sidebarCollapsed
        ? "md:grid-cols-[60px_1fr] lg:grid-cols-[60px_1fr]"
        : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]"
    )}>
      <div className="hidden border-r border-border/50 bg-card/50 backdrop-blur-sm md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <Sidebar />
        </div>
      </div>
      <div className="flex flex-col h-screen overflow-hidden grid-pattern">
        <Header />
        <ScrollArea className="flex-1">
          <main className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
