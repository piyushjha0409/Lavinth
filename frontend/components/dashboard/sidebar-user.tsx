"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { MoreVertical, Wallet, Bell, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function SidebarUser() {
  const { publicKey, connected, disconnect } = useWallet();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCollapsed(customEvent.detail.collapsed);
    };

    document.addEventListener('toggle-sidebar', handleToggleSidebar);

    return () => {
      document.removeEventListener('toggle-sidebar', handleToggleSidebar);
    };
  }, []);

  if (!connected || !publicKey) {
    return null;
  }

  const walletAddress = publicKey.toBase58();
  const displayAddress = truncateAddress(walletAddress);

  const handleDisconnect = () => {
    document.cookie = "wallet_address=; path=/; max-age=0";
    disconnect();
  };

  return (
    <div className="mt-auto px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 px-2 py-3 h-auto",
              "hover:bg-muted rounded-lg",
              collapsed && "justify-center px-0"
            )}
            title={walletAddress}
          >
            <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
              <AvatarFallback className="rounded-lg">
                <Wallet className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayAddress}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Solana Wallet
                  </span>
                </div>
                <MoreVertical className="ml-auto h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-lg"
          side="top"
          align="start"
          alignOffset={20}
          sideOffset={8}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <Wallet className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayAddress}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {walletAddress}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
