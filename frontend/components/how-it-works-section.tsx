"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Wallet, Scan, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    number: "01",
    title: "Connect",
    description:
      "Connect your Solana wallet. Lavinth supports Phantom, Solflare, and all major wallet adapters.",
  },
  {
    icon: Scan,
    number: "02",
    title: "Scan",
    description:
      "The platform scans token approvals, traces fund flows, checks threat intelligence, and detects compromise indicators.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    title: "Recover",
    description:
      "Revoke risky permissions, trace stolen funds across hops, and file freeze requests at exchanges — all from one dashboard.",
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three steps from wallet connection to full recovery.
          </p>
        </motion.div>

        <div ref={ref} className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px">
              <motion.div
                className="h-full bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{ transformOrigin: "left" }}
              />
            </div>

            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Number circle */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full btn-gradient flex items-center justify-center">
                      <span className="text-xs font-heading font-bold text-white">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-heading font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
