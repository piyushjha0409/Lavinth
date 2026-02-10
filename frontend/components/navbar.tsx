"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/public/lavinth-logo.png";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
];

export default function Navbar({
  showDashboardButton = true,
}: {
  showDashboardButton?: boolean;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-4 left-4 right-4 z-50 transition-all duration-300 rounded-2xl",
        isScrolled
          ? "glass border border-border/50 shadow-lg shadow-black/20"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-9 h-9">
            <Image
              src={logo}
              alt="Lavinth Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-heading font-bold text-gradient-purple">
            Lavinth
          </span>
        </Link>

        {showDashboardButton && (
          <>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/dashboard">
                <Button className="btn-gradient text-white text-sm px-5 py-2 rounded-lg">
                  Launch Dashboard
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </>
        )}
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden glass border-t border-border/50 rounded-b-2xl px-6 py-4">
          <nav className="flex flex-col gap-3 mb-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Link href="/dashboard">
            <Button className="btn-gradient text-white w-full rounded-lg">
              Launch Dashboard
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
