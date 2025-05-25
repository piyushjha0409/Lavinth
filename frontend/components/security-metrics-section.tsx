"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Shield, AlertTriangle, CheckCircle, Clock, Search, Code } from "lucide-react"

const securityMetrics = [
  {
    icon: <Shield className="h-8 w-8" />,
    value: "100K+",
    label: "Transactions Analyzed",
    description: "Daily analysis of Solana transactions",
    color: "from-blue-500 to-blue-700",
  },
  {
    icon: <AlertTriangle className="h-8 w-8" />,
    value: "1000+",
    label: "Attacks Prevented",
    description: "Poisoning and dusting attacks stopped",
    color: "from-purple-500 to-purple-700",
  },
  {
    icon: <CheckCircle className="h-8 w-8" />,
    value: "30.5%",
    label: "Detection Accuracy",
    description: "Precision in identifying threats",
    color: "from-green-500 to-green-700",
  },
  {
    icon: <Clock className="h-8 w-8" />,
    value: "<500ms",
    label: "Response Time",
    description: "Real-time protection for your assets",
    color: "from-yellow-500 to-yellow-700",
  },
]

const securityFeatures = [
  {
    id: "address-poisoning",
    icon: <Shield className="h-10 w-10" />,
    title: "Address Poisoning Detection",
    description: "Identifies malicious addresses designed to trick users into sending funds to the wrong destination.",
    details: [
      "Pattern recognition algorithms",
      "Historical transaction analysis",
      "Similarity scoring with legitimate addresses",
      "Real-time alerts for suspicious activity",
    ],
  },
  {
    id: "dusting-attacks",
    icon: <AlertTriangle className="h-10 w-10" />,
    title: "Dusting Attack Prevention",
    description: "Detects and flags small amounts of crypto sent to break privacy or prepare for phishing attacks.",
    details: [
      "Dust transaction identification",
      "Source address reputation checking",
      "Behavioral analysis of sending patterns",
      "Risk scoring of incoming transactions",
    ],
  },
  {
    id: "risk-assessment",
    icon: <Search className="h-10 w-10" />,
    title: "Advanced Risk Assessment",
    description: "Comprehensive scoring system to evaluate the security risk of any Solana address or transaction.",
    details: [
      "Multi-factor risk evaluation",
      "Machine learning classification",
      "Continuous model improvement",
      "Customizable risk thresholds",
    ],
  },
  {
    id: "api-integration",
    icon: <Code className="h-10 w-10" />,
    title: "Seamless API Integration",
    description: "Easy-to-implement APIs that allow wallets and dApps to leverage our security infrastructure.",
    details: [
      "RESTful API endpoints",
      "WebSocket real-time notifications",
      "SDK for major programming languages",
      "Comprehensive documentation",
    ],
  },
]

// Code snippets for API integration feature
const codeSnippets = [
  { className: "text-green-400 mb-2", content: "// Check wallet security" },
  { className: "text-blue-400", content: "async function checkWallet(address) {" },
  { className: "text-gray-300 ml-4", content: "const response = await fetch(" },
  { className: "text-green-400 ml-8", content: "'https://api.lavinth.com/check'," },
  { className: "text-gray-300 ml-8", content: "{" },
  { className: "text-gray-300 ml-12", content: "method: 'POST'," },
  { className: "text-gray-300 ml-12", content: "headers: { 'Content-Type': 'application/json' }," },
  { className: "text-gray-300 ml-12", content: "body: JSON.stringify({" },
  { className: "text-gray-300 ml-16", content: "address: ", spanContent: "address", spanClass: "text-yellow-400" },
  { className: "text-gray-300 ml-12", content: "})" },
  { className: "text-gray-300 ml-8", content: "})" },
  { className: "text-gray-300 ml-4", content: "return await response.json()" },
  { className: "text-blue-400", content: "}" },
  { className: "text-green-400 mt-4", content: "// Real-time monitoring" },
  { className: "text-blue-400", content: "function connectWebSocket() {" },
  {
    className: "text-gray-300 ml-4",
    content: "const ws = new WebSocket(",
    spanContent: "'wss://api.lavinth.com/live'",
    spanClass: "text-green-400",
    endContent: ");",
  },
  { className: "text-gray-300 ml-4", content: "ws.onmessage = (event) => {" },
  {
    className: "text-gray-300 ml-8",
    content: "const data = ",
    spanContent: "JSON.parse",
    spanClass: "text-yellow-400",
    endContent: "(event.data);",
  },
  {
    className: "text-gray-300 ml-8",
    content: "if (data.alertType === ",
    spanContent: "'poisoning'",
    spanClass: "text-green-400",
    endContent: ") {",
  },
  {
    className: "text-gray-300 ml-12",
    content: "",
    spanContent: "showAlert",
    spanClass: "text-yellow-400",
    endContent: "(data)",
  },
  { className: "text-gray-300 ml-8", content: "}" },
  { className: "text-gray-300 ml-4", content: "}" },
  { className: "text-blue-400", content: "}" },
]

export default function SecurityMetricsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const [activeFeature, setActiveFeature] = useState(securityFeatures[0].id)

  return (
    <section id="security" className="py-20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(67,97,238,0.1),transparent_50%)] z-0" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">Security</span>{" "}
            Features & Metrics
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Our platform provides industry-leading protection for Solana users and applications.
          </p>
        </div>

        {/* Metrics Hexagon Grid */}
        <div ref={ref} className="mb-24">
          <div className="relative max-w-4xl mx-auto">
            {/* Hexagon background */}
            <div className="absolute inset-0 -z-10 opacity-20">
              <svg width="100%" height="100%" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
                <pattern
                  id="hexagons"
                  width="50"
                  height="43.4"
                  patternUnits="userSpaceOnUse"
                  patternTransform="scale(2)"
                >
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

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {securityMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl -z-10 bg-blue-500/20" />
                  <div className="bg-black/40 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6 text-center hover:border-blue-500/40 transition-all duration-300 h-full flex flex-col items-center justify-center">
                    <div
                      className={`bg-gradient-to-br ${metric.color} p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-white`}
                    >
                      {metric.icon}
                    </div>
                    <div className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
                      {metric.value}
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-white">{metric.label}</h3>
                    <p className="text-gray-400">{metric.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Security Features */}
        <div className="mt-20">
          <div className="bg-black/40 backdrop-blur-sm border border-blue-500/20 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(67,97,238,0.1),transparent_70%)]" />

            {/* Feature selector tabs */}
            <div className="relative z-10 flex flex-wrap justify-center gap-2 p-4 border-b border-blue-500/20">
              {securityFeatures.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`relative px-6 py-3 rounded-lg transition-all duration-300 ${
                    activeFeature === feature.id
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feature.icon}
                    <span className="font-medium">{feature.title}</span>
                  </div>
                  {activeFeature === feature.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-500/10 border border-blue-500/30 rounded-lg -z-10"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Feature content */}
            <div className="p-6 md:p-10 min-h-[400px]">
              <AnimatePresence mode="wait">
                {securityFeatures.map(
                  (feature) =>
                    activeFeature === feature.id && (
                      <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
                      >
                        <div>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                              {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                          </div>
                          <p className="text-gray-300 text-lg mb-8">{feature.description}</p>

                          <div className="space-y-4">
                            {feature.details.map((detail, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.1 }}
                                className="flex items-center gap-3"
                              >
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <p className="text-gray-300">{detail}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          {/* Feature visualization */}
                          <div className="aspect-square max-w-md mx-auto relative">
                            {/* Animated visualization based on feature type */}
                            {feature.id === "address-poisoning" && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="relative w-64 h-64">
                                  {/* Shield animation */}
                                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-pulse" />
                                  <div
                                    className="absolute inset-4 rounded-full border-4 border-purple-500/30 animate-pulse"
                                    style={{ animationDelay: "300ms" }}
                                  />
                                  <div
                                    className="absolute inset-8 rounded-full border-4 border-green-500/30 animate-pulse"
                                    style={{ animationDelay: "600ms" }}
                                  />
                                  <div
                                    className="absolute inset-12 rounded-full border-4 border-yellow-500/30 animate-pulse"
                                    style={{ animationDelay: "900ms" }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Shield className="h-16 w-16 text-blue-500" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {feature.id === "dusting-attacks" && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="relative w-full h-full">
                                  {/* Dust particles animation */}
                                  {Array.from({ length: 20 }).map((_, i) => (
                                    <motion.div
                                      key={i}
                                      className="absolute w-2 h-2 rounded-full bg-red-500"
                                      initial={{
                                        x: Math.random() * 300,
                                        y: Math.random() * 300,
                                        opacity: 0.7,
                                      }}
                                      animate={{
                                        x: Math.random() * 300,
                                        y: Math.random() * 300,
                                        opacity: [0.7, 0.3, 0.7],
                                        scale: [1, 1.5, 1],
                                      }}
                                      transition={{
                                        duration: 3 + Math.random() * 2,
                                        repeat: Number.POSITIVE_INFINITY,
                                        repeatType: "reverse",
                                      }}
                                    />
                                  ))}
                                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                    <AlertTriangle className="h-16 w-16 text-yellow-500" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {feature.id === "risk-assessment" && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="relative w-full h-full">
                                  {/* Risk meter */}
                                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-32">
                                    <div className="w-full h-8 bg-black/60 rounded-full overflow-hidden border border-gray-700">
                                      <motion.div
                                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: ["0%", "100%", "60%"] }}
                                        transition={{
                                          duration: 3,
                                          repeat: Number.POSITIVE_INFINITY,
                                          repeatType: "reverse",
                                        }}
                                      />
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                                      <span>Low Risk</span>
                                      <span>Medium Risk</span>
                                      <span>High Risk</span>
                                    </div>
                                    <div className="mt-8 flex justify-center">
                                      <Search className="h-16 w-16 text-blue-500" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {feature.id === "api-integration" && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="relative w-full h-full font-mono">
                                  {/* Code animation */}
                                  <div className="absolute inset-0 bg-black/80 rounded-lg border border-blue-500/30 p-4 overflow-hidden">
                                    <motion.div
                                      initial={{ y: 0 }}
                                      animate={{ y: -200 }}
                                      transition={{
                                        duration: 15,
                                        repeat: Number.POSITIVE_INFINITY,
                                        repeatType: "loop",
                                      }}
                                    >
                                      {codeSnippets.map((snippet, idx) => (
                                        <div key={idx} className={snippet.className}>
                                          {snippet.content}
                                          {snippet.spanContent && (
                                            <span className={snippet.spanClass}>{snippet.spanContent}</span>
                                          )}
                                          {snippet.endContent && snippet.endContent}
                                        </div>
                                      ))}
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ),
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
