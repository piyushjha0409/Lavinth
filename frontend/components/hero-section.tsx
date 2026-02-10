"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  Scan,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const trustStats = [
  { label: "API Endpoints", value: "55+" },
  { label: "Security Services", value: "7" },
  { label: "Real-time Monitoring", value: "24/7" },
];

function DashboardPreview() {
  return (
    <div className="relative w-full">
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 rounded-3xl blur-2xl" />

      {/* Dashboard frame */}
      <div className="relative bg-card/80 border border-border/60 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 backdrop-blur-sm">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/60">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-severity-critical/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-severity-medium/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-severity-low/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-0.5 rounded-md bg-secondary/60 text-[10px] font-mono text-muted-foreground">
              lavinth.com/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4 space-y-3">
          {/* Top row — Score + Status */}
          <div className="grid grid-cols-5 gap-3">
            {/* Security Score */}
            <div className="col-span-2 bg-secondary/40 border border-border/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-severity-low/10">
                  <Shield className="h-3.5 w-3.5 text-severity-low" />
                </div>
                <span className="text-xs font-heading font-medium">
                  Security Score
                </span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-heading font-bold text-severity-low leading-none">
                  92
                </span>
                <div className="flex gap-0.5 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-5 rounded-full ${
                        i < 4 ? "bg-severity-low" : "bg-secondary"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Low risk — 2 approvals flagged
              </div>
            </div>

            {/* Quick stats */}
            <div className="col-span-3 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Approvals",
                  value: "12",
                  icon: Scan,
                  color: "text-primary",
                },
                {
                  label: "Alerts",
                  value: "3",
                  icon: AlertTriangle,
                  color: "text-severity-high",
                },
                {
                  label: "Traced",
                  value: "4.3",
                  unit: "SOL",
                  icon: Activity,
                  color: "text-accent",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-secondary/40 border border-border/30 rounded-xl p-3 flex flex-col"
                  >
                    <Icon className={`h-3.5 w-3.5 ${stat.color} mb-2`} />
                    <span className="text-lg font-heading font-bold leading-none">
                      {stat.value}
                      {stat.unit && (
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                          {stat.unit}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approval scan row */}
          <div className="bg-secondary/40 border border-border/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Scan className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-heading font-medium">
                  Approval Scan
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-severity-critical/10 text-severity-critical font-medium">
                2 High Risk
              </span>
            </div>
            {/* Table rows */}
            <div className="space-y-0 rounded-lg overflow-hidden border border-border/20">
              {[
                {
                  delegate: "7xKt...3mPq",
                  risk: "High",
                  score: 85,
                  color: "text-severity-critical",
                  barColor: "bg-severity-critical",
                  barWidth: "w-[85%]",
                },
                {
                  delegate: "Phn2...9kWa",
                  risk: "Medium",
                  score: 52,
                  color: "text-severity-medium",
                  barColor: "bg-severity-medium",
                  barWidth: "w-[52%]",
                },
                {
                  delegate: "Bnce...4xTr",
                  risk: "Low",
                  score: 12,
                  color: "text-severity-low",
                  barColor: "bg-severity-low",
                  barWidth: "w-[12%]",
                },
              ].map((row, i) => (
                <div
                  key={row.delegate}
                  className={`flex items-center gap-3 px-3 py-2 text-xs ${
                    i !== 2 ? "border-b border-border/20" : ""
                  } ${i % 2 === 0 ? "bg-card/30" : "bg-transparent"}`}
                >
                  <span className="font-mono text-muted-foreground w-20 flex-shrink-0">
                    {row.delegate}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.barColor} ${row.barWidth}`}
                    />
                  </div>
                  <span className={`${row.color} font-medium w-8 text-right`}>
                    {row.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fund trace row */}
          <div className="bg-secondary/40 border border-border/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-accent/10">
                  <RefreshCw className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-xs font-heading font-medium">
                  Fund Trace
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                Exchange detected
              </span>
            </div>
            {/* Trace flow */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-severity-critical/10 border border-severity-critical/20">
                <div className="h-1.5 w-1.5 rounded-full bg-severity-critical" />
                <span className="font-mono text-muted-foreground">
                  4rPn...8xLq
                </span>
              </div>
              <div className="flex-shrink-0 text-muted-foreground/40">→</div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-severity-high/10 border border-severity-high/20">
                <span className="text-muted-foreground">2.5 SOL</span>
              </div>
              <div className="flex-shrink-0 text-muted-foreground/40">→</div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-severity-medium/10 border border-severity-medium/20">
                <span className="text-muted-foreground">1.8 SOL</span>
              </div>
              <div className="flex-shrink-0 text-muted-foreground/40">→</div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                <CheckCircle2 className="h-3 w-3 text-accent" />
                <span className="font-medium text-accent">Binance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      className="relative min-h-screen pt-28 pb-16 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-background to-background z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-160px)]">
          {/* Left side - Text content */}
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                Solana Security Protocol
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 leading-[1.1] tracking-tight">
              Post-Compromise{" "}
              <span className="text-gradient-purple">Wallet Recovery</span>
            </h1>

            <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-lg leading-relaxed">
              Scan approvals, trace stolen funds, revoke malicious permissions,
              and coordinate exchange freeze requests — all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/dashboard">
                <Button className="btn-gradient text-white text-base px-7 py-6 rounded-lg">
                  Launch Dashboard
                </Button>
              </Link>
              <Link href="/wallet-check">
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary text-base px-7 py-6 rounded-lg"
                >
                  Check Wallet <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Trust stats */}
            <div className="flex items-center gap-8">
              {trustStats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-heading font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right side - Dashboard preview */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
