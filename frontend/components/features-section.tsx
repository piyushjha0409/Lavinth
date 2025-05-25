"use client"

import { useState, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Shield, AlertTriangle, Lock, ArrowRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const [activeFeature, setActiveFeature] = useState<number | null>(null)

  const features = [
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: "Attack Detection",
      description:
        "Our algorithms detect sophisticated address poisoning and dusting attacks by analyzing on-chain transaction patterns.",
      color: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/30",
      iconBg: "bg-gradient-to-br from-red-500 to-orange-500",
      hoverBg: "group-hover:from-red-500/30 group-hover:to-orange-500/30",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Risk Scoring",
      description:
        "Each address is assigned a risk score based on multiple security factors, helping users make informed decisions.",
      color: "from-blue-500/20 to-purple-500/20",
      borderColor: "border-blue-500/30",
      iconBg: "bg-gradient-to-br from-blue-500 to-purple-500",
      hoverBg: "group-hover:from-blue-500/30 group-hover:to-purple-500/30",
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Preventive Measures",
      description: "Get actionable recommendations to secure your assets and prevent future attacks on your wallets.",
      color: "from-green-500/20 to-teal-500/20",
      borderColor: "border-green-500/30",
      iconBg: "bg-gradient-to-br from-green-500 to-teal-500",
      hoverBg: "group-hover:from-green-500/30 group-hover:to-teal-500/30",
    },
  ]

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(67,97,238,0.1),transparent_50%)] z-0" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Comprehensive Security
            </span>{" "}
            Features
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Lavinth provides a complete security layer for the Solana ecosystem, protecting users and applications from
            sophisticated attacks.
          </p>
        </div>

        {/* Hexagonal Feature Layout */}
        <div ref={ref} className="relative max-w-6xl mx-auto">
          {/* Hexagon background */}
          <div className="absolute inset-0 -z-10 opacity-20">
            <svg width="100%" height="100%" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
              <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <polygon
                  points="25,0 50,14.4 50,37.4 25,51.8 0,37.4 0,14.4"
                  fill="none"
                  stroke="#4361ee"
                  strokeWidth="1"
                  opacity="0.5"
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#hexagons)" />
            </svg>
          </div>

          {/* Interactive Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className={cn(
                  "group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500",
                  "hover:shadow-2xl hover:-translate-y-2",
                )}
                onMouseEnter={() => setActiveFeature(index)}
                onMouseLeave={() => setActiveFeature(null)}
              >
                {/* Background gradient */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-500",
                    feature.color,
                    feature.hoverBg,
                  )}
                />

                {/* Animated border */}
                <div
                  className={cn(
                    "absolute inset-0 border rounded-2xl transition-all duration-500",
                    feature.borderColor,
                    "group-hover:border-2",
                  )}
                />

                {/* Content */}
                <div className="relative z-10 p-8 h-full flex flex-col">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-white mb-6 transition-all duration-500",
                      feature.iconBg,
                      "group-hover:scale-110",
                    )}
                  >
                    {feature.icon}
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-gray-300 group-hover:text-white/90 transition-colors mb-6 flex-grow">
                    {feature.description}
                  </p>

                  <div
                    className={cn(
                      "flex items-center text-sm font-medium transition-all duration-500 opacity-0 translate-y-4",
                      activeFeature === index && "opacity-100 translate-y-0",
                    )}
                  >
                    <span className="mr-2 text-white">Learn more</span>
                    <ArrowRight size={16} className="text-white" />
                  </div>
                </div>

                {/* Animated particles */}
                {activeFeature === index && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-white/30"
                        initial={{
                          x: Math.random() * 100 + 50,
                          y: Math.random() * 100 + 50,
                          scale: 0,
                        }}
                        animate={{
                          x: Math.random() * 200,
                          y: Math.random() * 200,
                          scale: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "loop",
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Animated connection lines */}
          <svg
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full -z-5 opacity-20 hidden md:block"
            viewBox="0 0 800 400"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M200,200 C300,100 500,300 600,200"
              stroke="#4cc9f0"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            <motion.path
              d="M200,200 C300,300 500,100 600,200"
              stroke="#4361ee"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.5, delay: 0.8 }}
            />
          </svg>

          {/* CTA Button */}
          {/* <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <a
              href="#security"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:gap-3"
            >
              Explore All Security Features <ExternalLink size={16} />
            </a>
          </motion.div> */}
        </div>
      </div>
    </section>
  )
}
