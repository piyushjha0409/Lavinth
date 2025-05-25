"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar() {
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
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4",
        isScrolled
          ? "bg-black/80 backdrop-blur-md border-b border-blue-500/20"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
            <Image
              src="/lavinth-logo.png"
              alt="Lavinth Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Lavinth
          </span>
        </Link>

        {/* <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-300 hover:text-blue-400 transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-gray-300 hover:text-blue-400 transition-colors">
            How It Works
          </Link>
          <Link href="#security" className="text-gray-300 hover:text-blue-400 transition-colors">
            Security
          </Link>
          <Link href="#api" className="text-gray-300 hover:text-blue-400 transition-colors">
            API
          </Link>
        </nav> */}

        <div className="hidden md:flex items-center gap-4">
          {/* <Button variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
            Log In
          </Button> */}
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Dashboard
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden text-gray-300"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-md border-b border-blue-500/20 py-4">
          <div className="container mx-auto px-4 flex flex-col gap-4">
            {/* <Link
              href="#features"
              className="text-gray-300 hover:text-blue-400 transition-colors py-2 flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
              <ChevronRight size={16} className="text-blue-500" />
            </Link>
            <Link
              href="#how-it-works"
              className="text-gray-300 hover:text-blue-400 transition-colors py-2 flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How It Works
              <ChevronRight size={16} className="text-blue-500" />
            </Link>
            <Link
              href="#security"
              className="text-gray-300 hover:text-blue-400 transition-colors py-2 flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Security
              <ChevronRight size={16} className="text-blue-500" />
            </Link>
            <Link
              href="#api"
              className="text-gray-300 hover:text-blue-400 transition-colors py-2 flex items-center justify-between"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              API
              <ChevronRight size={16} className="text-blue-500" />
            </Link> */}
            <div className="flex flex-col gap-3 mt-2">
              {/* <Button
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10 w-full"
              >
                Log In
              </Button> */}
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
