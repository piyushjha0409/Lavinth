"use client";

import Image from "next/image";
import Link from "next/link";
import { Shield, Twitter, Mail, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="relative border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/lavinth-logo.png"
                alt="Lavinth Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-heading font-bold text-gradient-purple">
                Lavinth
              </span>
              <span className="text-muted-foreground text-sm ml-2">
                Built for Solana
              </span>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/wallet-check"
              className="hover:text-foreground transition-colors"
            >
              Wallet Check
            </Link>
            <Link
              href="https://github.com"
              target="_blank"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href="https://x.com/lavinth_secure"
                target="_blank"
                aria-label="Twitter"
              >
                <Twitter size={14} />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link
                href="mailto:work.lavinth@gmail.com"
                aria-label="Email"
              >
                <Mail size={14} />
              </Link>
            </Button>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield size={12} className="text-primary" />
            <span>&copy; {new Date().getFullYear()} Lavinth. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
