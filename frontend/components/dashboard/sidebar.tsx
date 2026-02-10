"use client";

import * as React from "react";
import { Suspense } from "react";
import {
  BarChart3,
  ShieldCheck,
  Settings,
  Radar,
  Snowflake,
  PlayCircle,
  KeyRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarUser } from "./sidebar-user";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function SidebarNav() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <>
      <SidebarHeader className="px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <div className="relative flex-shrink-0 w-8 h-8">
            <Image
              src={logo}
              alt="Lavinth Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-heading font-bold text-gradient-purple transition-opacity duration-300">
              Lavinth
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigation.map((item) => {
              const isActive =
                item.tab === activeTab ||
                (item.tab === "overview" && !activeTab);

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <Suspense
        fallback={
          <div className="flex h-full w-full flex-col p-4">
            <div className="h-8 w-32 bg-muted rounded animate-pulse mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <SidebarNav />
      </Suspense>
    </Sidebar>
  );
}
