"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Database, Shield, AlertTriangle, CheckCircle, Server } from "lucide-react"

const steps = [
  {
    icon: <Database className="h-6 w-6" />,
    title: "Data Collection",
    description: "We continuously monitor the Solana blockchain, collecting transaction data in real-time.",
  },
  {
    icon: <Server className="h-6 w-6" />,
    title: "Analysis",
    description:
      "Our custom algorithms analyze transactions to identify patterns consistent with address poisoning and dusting attacks.",
  },
  {
    icon: <AlertTriangle className="h-6 w-6" />,
    title: "Threat Detection",
    description: "Suspicious activities are flagged and categorized based on their risk level and attack type.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Protection",
    description: "Real-time alerts and preventive measures are deployed to protect users' assets.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Verification",
    description: "Users can verify wallet addresses and transactions through our dashboard or API.",
  },
]

export default function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="how-it-works" className="py-20 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(76,201,240,0.1),transparent_50%)] z-0" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              How Lavinth
            </span>{" "}
            Works
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Our advanced security layer uses sophisticated algorithms to detect and prevent attacks on the Solana
            blockchain.
          </p>
        </div>

        <div ref={ref} className="relative">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/30 transform -translate-x-1/2 z-0 md:block hidden" />

          <div className="space-y-12 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className={`flex flex-col ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-8 items-center`}
              >
                <div
                  className={`md:w-1/2 ${index % 2 === 0 ? "md:text-right" : "md:text-left"} text-center md:text-left`}
                >
                  <div
                    className={`inline-flex items-center gap-3 mb-3 ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}
                  >
                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">{step.icon}</div>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                  </div>
                  <p className="text-gray-300">{step.description}</p>
                </div>

                <div className="md:w-0 relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 border-4 border-black flex items-center justify-center text-white font-bold z-10">
                    {index + 1}
                  </div>
                </div>

                <div className="md:w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Terminal-like code example */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="bg-black/80 border border-blue-500/30 rounded-lg overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-blue-500/30">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400 text-sm ml-2">Lavinth API Example</span>
            </div>
            <div className="p-4 font-mono text-sm">
              <div className="text-blue-400">// Check if a wallet address is poisoned</div>
              <div className="text-gray-300 mt-2">const response = await fetch(</div>
              <div className="text-green-400 ml-4">'https://api.lavinth.com/api/check-wallet',</div>
              <div className="text-gray-300 ml-4">{"{"}</div>
              <div className="text-gray-300 ml-8">method: 'POST',</div>
              <div className="text-gray-300 ml-8">
                headers: {"{"} 'Content-Type': 'application/json' {"}"},
              </div>
              <div className="text-gray-300 ml-8">body: JSON.stringify({"{"}</div>
              <div className="text-gray-300 ml-12">
                address: <span className="text-yellow-400">'8xrt67qLVBw4MFN6a9WnQgcj2fZvCQXMQMg9YQ9Yif3J'</span>
              </div>
              <div className="text-gray-300 ml-8">{"}"})</div>
              <div className="text-gray-300 ml-4">{"}"});</div>
              <div className="text-gray-300 mt-2">const data = await response.json();</div>
              <div className="text-gray-300 mt-2">console.log(data);</div>
                <div className="text-gray-400 mt-4">// Output:</div>
                <div className="text-gray-300 mt-1">{"{"}</div>
                <div className="text-gray-300 ml-4">
                status: <span className="text-green-400">'success'</span>,
                </div>
                <div className="text-gray-300 ml-4">
                isDusted: <span className="text-red-400">true</span>,
                </div>
                <div className="text-gray-300 ml-4">
                riskScore: <span className="text-yellow-400">0.39</span>,
                </div>
                <div className="text-gray-300 ml-4">
                attackerDetails: <span className="text-gray-300">{"{"}</span>
                </div>
                <div className="text-gray-300 ml-8">
                smallTransfersCount: <span className="text-yellow-400">3</span>,
                </div>
                <div className="text-gray-300 ml-8">
                uniqueVictimsCount: <span className="text-yellow-400">3</span>,
                </div>
                <div className="text-gray-300 ml-8">
                lastUpdated: <span className="text-yellow-400">'2025-05-16T14:32:08.327Z'</span>,
                </div>
                <div className="text-gray-300 ml-4">
                <span className="text-gray-300">{"}"}</span>,
                </div>
                <div className="text-gray-300 ml-4">
                message: <span className="text-yellow-400">'This wallet address is flagged as a confirmed dusting attacker with a risk score of 0.3900.'</span>
                </div>
                <div className="text-gray-300">{"}"}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
