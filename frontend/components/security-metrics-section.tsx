"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Building2, Database, Server, Activity } from "lucide-react";

const stats = [
  {
    icon: Building2,
    value: "16",
    label: "Exchanges Tracked",
    description: "Major CEX compliance contacts for freeze requests",
  },
  {
    icon: Database,
    value: "7",
    label: "Threat Intel Sources",
    description: "Community lists, GoPlus API, and domain blocklists",
  },
  {
    icon: Server,
    value: "55+",
    label: "API Endpoints",
    description: "Full REST API for programmatic security operations",
  },
  {
    icon: Activity,
    value: "24/7",
    label: "Real-time Monitoring",
    description: "SSE-powered alerts with instant compromise detection",
  },
];

function AnimatedCounter({ value, isInView }: { value: string; isInView: boolean }) {
  return (
    <motion.span
      className="text-3xl md:text-4xl font-heading font-bold text-foreground"
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {value}
    </motion.span>
  );
}

export default function SecurityMetricsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section id="security" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Platform Capabilities
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real infrastructure backing every security operation.
          </p>
        </motion.div>

        <div
          ref={ref}
          className="max-w-4xl mx-auto bg-card border border-border/50 rounded-2xl p-8 md:p-10"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex p-2.5 rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <AnimatedCounter value={stat.value} isInView={isInView} />
                  </div>
                  <div className="text-sm font-heading font-medium mt-1 mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {stat.description}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
