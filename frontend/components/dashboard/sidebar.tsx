"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  ShieldCheck,
  Menu,
  Settings,
  Radar,
  Snowflake,
  PlayCircle,
  KeyRound,
} from "lucide-react";
import { SidebarUser } from "./sidebar-user";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import logo from "@/public/lavinth-logo.png";

const navigation = [
  {
    name: "Dashboard Overview",
    href: "/dashboard",
    tab: "overview",
    icon: BarChart3,
  },
  {
    name: "Wallet Security",
    href: "/dashboard?tab=wallet-security",
    tab: "wallet-security",
    icon: ShieldCheck,
  },
  {
    name: "Token Approvals",
    href: "/dashboard?tab=token-approvals",
    tab: "token-approvals",
    icon: KeyRound,
  },
  {
    name: "Transaction Simulation",
    href: "/dashboard?tab=simulation",
    tab: "simulation",
    icon: PlayCircle,
  },
  {
    name: "Recovery",
    href: "/dashboard?tab=recovery",
    tab: "recovery",
    icon: Radar,
  },
  {
    name: "Freeze Requests",
    href: "/dashboard?tab=freeze-requests",
    tab: "freeze-requests",
    icon: Snowflake,
  },
  {
    name: "Settings & API",
    href: "/dashboard?tab=settings-api",
    tab: "settings-api",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

function SidebarContent({ className }: SidebarProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCollapsed(customEvent.detail.collapsed);
    };

    document.addEventListener("toggle-sidebar", handleToggleSidebar);

    return () => {
      document.removeEventListener("toggle-sidebar", handleToggleSidebar);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300 overflow-hidden",
        collapsed ? "w-[60px]" : "w-full",
        className
      )}
    >
      <div className="flex-1 space-y-4 py-4">
        <div className="px-3 py-2">
          <div
            className={cn(
              "flex items-center mb-6",
              collapsed ? "justify-center" : "gap-2"
            )}
          >
            <Link
              href="/"
              className={cn(
                "flex items-center",
                collapsed ? "justify-center" : "gap-2"
              )}
            >
              <div
                className={cn(
                  "relative flex-shrink-0",
                  collapsed ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12"
                )}
              >
                <Image
                  src={logo}
                  alt="Lavinth Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              {!collapsed && (
                <span className="text-xl md:text-2xl font-heading font-bold text-gradient-purple transition-opacity duration-300">
                  Lavinth
                </span>
              )}
            </Link>
          </div>
          <div className="space-y-1 overflow-hidden">
            <nav className="grid items-start text-sm font-medium overflow-hidden">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.tab === activeTab ||
                  (item.tab === "overview" && !activeTab);

                const navLink = (
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-foreground whitespace-nowrap overflow-hidden",
                      collapsed && "justify-center px-2",
                      isActive && "text-foreground bg-primary/5"
                    )}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-primary to-accent" />
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors",
                        isActive ? "text-accent" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );

                return collapsed ? (
                  <TooltipProvider key={item.name}>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        align="start"
                        className="font-medium"
                      >
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div key={item.name}>{navLink}</div>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <SidebarUser />
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <Suspense fallback={
      <div className={cn("flex h-full w-full flex-col bg-card/50", className)}>
        <div className="flex h-14 items-center border-b border-border/50 px-4 lg:h-[60px] lg:px-6">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="grid items-start px-2 text-sm font-medium lg:px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
                <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <SidebarContent className={className} />
    </Suspense>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col h-full">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
