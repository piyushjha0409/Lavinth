"use client";

import { AppSidebar } from "./sidebar";
import { Header } from "./header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="grid-pattern">
        <Header />
        <ScrollArea className="flex-1">
          <main className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
