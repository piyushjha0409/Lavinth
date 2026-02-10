"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Radar,
  Scan,
  PlayCircle,
  Database,
  Bell,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertTriangle,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Wallet Security",
    description:
      "Approval scanning, risk scoring, and emergency revocation for SPL token delegates.",
    highlights: ["Approval Scanner", "Risk Scoring", "Emergency Revoke"],
    accentColor: "from-primary to-accent",
  },
  {
    icon: Radar,
    title: "Fund Recovery",
    description:
      "Multi-hop fund tracing, exchange deposit detection, and automated freeze requests.",
    stat: "16",
    statLabel: "Exchanges tracked",
  },
  {
    icon: Scan,
    title: "Compromise Detection",
    description:
      "Real-time monitoring with behavioral anomaly detection and pattern analysis.",
    stat: "24/7",
    statLabel: "Monitoring",
  },
  {
    icon: PlayCircle,
    title: "Transaction Simulation",
    description:
      "Simulate transactions before signing to detect hidden risks and drains.",
    stat: "Pre-sign",
    statLabel: "Protection",
  },
  {
    icon: Database,
    title: "Threat Intelligence",
    description:
      "7 sources — community blocklists, GoPlus API, and address risk scoring.",
    stat: "7",
    statLabel: "Intel sources",
  },
  {
    icon: Bell,
    title: "Alert System",
    description:
      "Real-time SSE alerts with webhook integration and severity classification.",
    badges: ["Critical", "High", "Medium", "Low"],
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Complete Security Suite
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Six integrated services covering the full post-compromise recovery
            workflow — from detection to fund recovery.
          </p>
        </motion.div>

        {/* Bento Grid — asymmetric layout */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto auto-rows-[minmax(180px,auto)]"
        >
          {/* Hero card — tall, left column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0 }}
            className="group relative md:row-span-2 bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/30 card-glow"
          >
            {/* Top gradient accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="p-6 flex flex-col h-full">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-5 group-hover:bg-primary/15 transition-colors">
                <Shield className="h-6 w-6 text-primary" />
              </div>

              <h3 className="text-xl font-heading font-semibold mb-2">
                {features[0].title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {features[0].description}
              </p>

              {/* Mini feature list */}
              <div className="mt-auto space-y-3">
                {features[0].highlights!.map((highlight, i) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {i === 0 && <Scan className="h-3.5 w-3.5 text-primary" />}
                      {i === 1 && (
                        <Activity className="h-3.5 w-3.5 text-accent" />
                      )}
                      {i === 2 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                      )}
                    </div>
                    <span className="text-foreground/80">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Cards 2-5: 2x2 grid in top-right area */}
          {features.slice(1, 5).map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: (index + 1) * 0.1 }}
                className="group relative bg-card border border-border/50 rounded-xl p-6 transition-all duration-300 hover:border-primary/30 card-glow flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {feature.stat && (
                    <div className="text-right">
                      <div className="text-2xl font-heading font-bold text-accent">
                        {feature.stat}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {feature.statLabel}
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-heading font-semibold mb-2">
                  {feature.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}

          {/* Banner card — full width bottom */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="group relative md:col-span-3 bg-card border border-border/50 rounded-xl p-6 transition-all duration-300 hover:border-primary/30 card-glow"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="p-2.5 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/15 transition-colors">
                <Bell className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">
                  {features[5].title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {features[5].description}
                </p>
              </div>

              {/* Severity badges */}
              <div className="flex items-center gap-2">
                {features[5].badges!.map((badge) => {
                  const colors: Record<string, string> = {
                    Critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/20",
                    High: "bg-severity-high/15 text-severity-high border-severity-high/20",
                    Medium: "bg-severity-medium/15 text-severity-medium border-severity-medium/20",
                    Low: "bg-severity-low/15 text-severity-low border-severity-low/20",
                  };
                  return (
                    <span
                      key={badge}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${colors[badge]}`}
                    >
                      {badge}
                    </span>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
