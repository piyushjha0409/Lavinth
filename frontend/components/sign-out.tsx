import { signOutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutProps {
  variant?: "default" | "outline" | "ghost";
  showIcon?: boolean;
  className?: string;
}

export function SignOut({ variant = "outline", showIcon = false, className }: SignOutProps) {
  return (
    <form action={signOutAction} className={className}>
      <Button
        type="submit"
        variant={variant}
        className="w-full justify-start"
      >
        {showIcon && <LogOut className="mr-2 h-4 w-4" />}
        Sign Out
      </Button>
    </form>
  );
}
