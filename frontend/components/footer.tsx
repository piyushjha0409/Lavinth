"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowRight,
  ChevronUp,
  Code,
  Database,
  Lock,
  Mail,
  Shield,
  Twitter
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setEmail("");

      // Reset after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    }, 1500);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer ref={ref} className="relative overflow-hidden pt-24 pb-12">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />

      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        {/* Radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(76,201,240,0.15),transparent_50%)]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(67,97,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(67,97,238,0.1)_1px,transparent_1px)]"
            style={{ backgroundSize: "20px 20px" }}
          />
        </div>

        {/* Animated glowing orbs */}
        {isInView && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full blur-xl opacity-20"
                style={{
                  background:
                    i % 2 === 0
                      ? "radial-gradient(circle, #4cc9f0, transparent)"
                      : "radial-gradient(circle, #7209b7, transparent)",
                  width: `${Math.random() * 300 + 100}px`,
                  height: `${Math.random() * 300 + 100}px`,
                }}
                initial={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0.8, 1, 0],
                }}
                transition={{
                  duration: 15 + Math.random() * 10,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Logo and about section */}
          <motion.div
            className="md:col-span-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-3 mb-6 group"
            >
              <div className="relative w-12 h-12 overflow-hidden rounded-xl transition-all duration-300 group-hover:rounded-3xl">
                <Image
                  src="/lavinth-logo.png"
                  alt="Lavinth Logo"
                  fill
                  className="object-contain scale-110 transition-transform duration-500 group-hover:scale-125"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                  Lavinth
                </span>
                <div className="text-xs text-gray-400 mt-0.5">
                  Blockchain Security Layer
                </div>
              </div>
            </Link>

            <p className="text-gray-300 mb-6 leading-relaxed">
              Securing the Solana ecosystem with advanced detection and
              protection against address poisoning and dusting attacks.
            </p>

            <div className="flex gap-4 mb-6">
              <Link
                href="https://x.com/lavinth_secure"
                target="_blank"
                className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </Link>
              <Link
                href="mailto:work.lavinth@gmail.com"
                target="_blank"
                className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 hover:scale-110"
                aria-label="Email"
              >
                <Mail size={18} />
              </Link>
            </div>
          </motion.div>

          {/* Quick links columns */}
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <Database className="w-4 h-4 mr-2 text-blue-400" />
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
                >
                  <span className="relative">
                    Dashboard
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/wallet-check"
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
                >
                  <span className="relative">
                    Wallet Checker
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
                >
                  <span className="relative">
                    API
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              </li>
            </ul>
          </motion.div>

          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <Code className="w-4 h-4 mr-2 text-blue-400" />
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
                >
                  <span className="relative">
                    Documentation
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
                >
                  <span className="relative">
                    Security Reports
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="https://medium.com/@amann.jha1107/introduction-to-dusting-and-address-poisoning-on-solana-bfe6fef82f59"
                  target="_blank"
                  className="text-gray-400 hover:text-blue-400 transition-colors flex items-center group"
                >
                  <span className="relative">
                    Blog
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </Link>
              </li>
            </ul>
          </motion.div>

          <motion.div
            className="md:col-span-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
              <Lock className="w-4 h-4 mr-2 text-blue-400" />
              Stay Updated
            </h3>
            <p className="text-gray-400 mb-4">
              Subscribe to our newsletter for the latest security updates and
              features.
            </p>

            <form onSubmit={handleSubmit} className="relative">
              <Input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-blue-900/10 border-blue-500/30 focus-visible:ring-blue-500 pr-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || isSubmitted}
                required
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 bg-blue-500 hover:bg-blue-600"
                disabled={isSubmitting || isSubmitted}
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : isSubmitted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <motion.path
                        d="M3 8L7 12L13 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    </svg>
                  </motion.div>
                ) : (
                  <ArrowRight size={16} />
                )}
              </Button>
            </form>

            <AnimatePresence>
              {isSubmitted && (
                <motion.div
                  className="mt-2 text-green-400 text-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Thank you for subscribing!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Divider with animated glow */}
        <div className="relative h-px w-full mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            initial={{ x: "-100%" }}
            animate={isInView ? { x: "100%" } : { x: "-100%" }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <motion.div
            className="flex items-center mb-4 md:mb-0"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Shield size={16} className="text-blue-500 mr-2" />
            <span className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Lavinth. All rights reserved.
            </span>
          </motion.div>

          <motion.div
            className="flex gap-6 text-sm"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link
              href="#"
              className="text-gray-400 hover:text-blue-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-gray-400 hover:text-blue-400 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-gray-400 hover:text-blue-400 transition-colors"
            >
              Contact
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll to top button */}
      <motion.button
        className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg z-50 hover:scale-110 transition-transform duration-300"
        onClick={scrollToTop}
        initial={{ opacity: 0, scale: 0 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.6 }}
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Scroll to top"
      >
        <ChevronUp size={24} />
        <div className="absolute inset-0 rounded-full border border-white/30 animate-ping" />
      </motion.button>

      {/* Animated particles */}
      {isInView && (
        <>
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-blue-500/50"
              initial={{
                x: Math.random() * 100 + "%",
                y: "100%",
                opacity: 0.1 + Math.random() * 0.3,
              }}
              animate={{
                y: "0%",
                opacity: [0.1 + Math.random() * 0.3, 0.5, 0],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
                delay: i * 0.2,
              }}
            />
          ))}
        </>
      )}
    </footer>
  );
}
