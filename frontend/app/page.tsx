"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Lock, Shield, Terminal, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { DotPattern } from "@/components/ui/dot-pattern";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { RetroCard } from "@/components/ui/retro-card";
import { RetroText } from "@/components/ui/retro-text";
import { SparklesCore } from "@/components/ui/sparkles";
import { Spotlight } from "@/components/ui/spotlight";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TracingBeam } from "@/components/ui/tracing-beam";
import bannerImage from "@/public/image.png";

const features = [
  {
    title: "Dusting Detection",
    description:
      "Identifies and filters unsolicited token transfers promoting scam services.",
    icon: Shield,
    link: "#",
  },
  {
    title: "Address Poisoning Prevention",
    description:
      "Alerts users to sophisticated phishing tactics manipulating transaction histories.",
    icon: Lock,
    link: "#",
  },
  {
    title: "Transaction Filtering",
    description:
      "Provides real-time API to filter malicious activity before it reaches end users.",
    icon: Zap,
    link: "#",
  },
  {
    title: "Security Dashboard",
    description:
      "Visualizes prevalence, patterns, and trends of attack vectors across the Solana ecosystem.",
    icon: Terminal,
    link: "#",
  },
];

const testimonials = [
  {
    quote:
      "SolanaShield has been a game-changer for our DeFi platform. We've seen a 95% reduction in user-reported scams.",
    name: "Alex Rivera",
    title: "CTO at SolFinance",
  },
  {
    quote:
      "Implementing SolanaShield was straightforward and the results were immediate. Our users feel much safer.",
    name: "Sarah Chen",
    title: "Lead Developer at TokenSwap",
  },
  {
    quote:
      "The dashboard gives us incredible insights into attack patterns. We can now be proactive instead of reactive.",
    name: "Michael Johnson",
    title: "Security Officer at SolWallet",
  },
  {
    quote:
      "Address poisoning was a major issue for our users. SolanaShield's prevention system has eliminated the problem.",
    name: "Priya Sharma",
    title: "Product Manager at BlockTrade",
  },
];

const team = [
  {
    name: "Boston",
    designation: "Founding member",
    image: "/Boston.jpeg",
    twitter: "https://x.com/piyushJha__",
    github: "https://github.com/piyushjha0409",
  },
  {
    name: "WhyParabola",
    designation: "Founding member",
    image: "/whyparabola.webp",
    twitter: "https://x.com/WhyParabola",
    github: "https://github.com/eman-07",
  },
  {
    name: "KshitijHash",
    designation: "Founding member",
    image: "/kshitijhash.webp",
    twitter: "https://x.com/kshitijHash",
    github: "https://github.com/kshitij-hash",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black via-purple-950 to-black text-white font-retro crt relative overflow-hidden">
      {/* <div className="scan-line" /> */}

      {/* Header removed since it's now in the global layout */}

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-black via-indigo-950 to-black opacity-90" />
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="#00ffff"
          />
          <BackgroundBeams className="absolute inset-0" />
          <DotPattern
            className="z-10 opacity-30"
            dotColor="#00ffff"
            dotSpacing={30}
            dotSize={1}
            gridStyle={true}
          />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <RetroText
                    as="h1"
                    glitch={true}
                    className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-300 to-cyan-400"
                  >
                    Secure Your Solana Ecosystem
                  </RetroText>
                  <p className="max-w-[600px] text-gradient-animated md:text-xl font-medium">
                    Advanced protection against account dusting and address
                    poisoning attacks for Solana blockchain users, developers,
                    and applications.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  {/* <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white border-none shadow-[0_0_15px_rgba(0,255,255,0.7)] group transition-all duration-300"
                  >
                    <Link href="/register">
                      Access the API
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button> */}
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-cyan-500 text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-cyan-500/20 hover:border-fuchsia-400 transition-all duration-300"
                  >
                    <Link href="/dashboard">Get Started</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white border-none shadow-[0_0_15px_rgba(0,255,255,0.7)] group transition-all duration-300"
                  >
                    <Link href="/wallet-check">
                      Wallet Safety Detection
                      <Shield className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex items-center space-x-4 text-sm text-cyan-200 font-medium">
                  <div className="flex items-center space-x-1">
                    <Check className="h-4 w-4 text-fuchsia-400" />
                    <span>Real-time Protection</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Check className="h-4 w-4 text-cyan-400" />
                    <span>Easy Integration</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Check className="h-4 w-4 text-purple-400" />
                    <span>Comprehensive Dashboard</span>
                  </div>
                </div>
              </div>
              {/* <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative w-full max-w-[500px] aspect-square mx-auto flex items-center justify-center"
              > */}
                <div className="retro-border p-2 bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 rounded-sm">
                  <Image
                    src={bannerImage}
                    alt="SolanaShield Dashboard Preview"
                    width={700}
                    height={500}
                    className="rounded-md"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-cyan-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-fuchsia-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                {/* <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-2 border-cyan-400/30 rounded-md"></div>              </motion.div> */}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-black relative"
        >
          <DotPattern
            className="opacity-10"
            dotColor="#0CFF0C"
            dotSpacing={30}
            dotSize={1}
            gridStyle={true}
          />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-none border border-neon-500 px-3 py-1 text-sm text-neon-500 shadow-[0_0_10px_#0CFF0C]">
                  Key Features
                </div>
                <RetroText
                  as="h2"
                  className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-neon-500"
                >
                  Comprehensive Security for Solana
                </RetroText>
                <p className="max-w-[900px] text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  SolanaShield provides advanced protection against the most
                  common attack vectors in the Solana ecosystem.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-5xl py-12">
              <HoverEffect items={features} />
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="w-full py-12 md:py-24 lg:py-32 relative"
        >
          <div className="absolute inset-0 w-full h-full bg-black" />
          <SparklesCore
            id="tsparticlesfullpage"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full absolute inset-0"
            particleColor="#0CFF0C"
          />
          <DotPattern
            className="z-10 opacity-10"
            dotColor="#0CFF0C"
            dotSpacing={30}
            dotSize={1}
            gridStyle={true}
          />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-none border border-neon-500 px-3 py-1 text-sm text-neon-500 shadow-[0_0_10px_#0CFF0C]">
                  How It Works
                </div>
                <RetroText
                  as="h2"
                  className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-neon-500"
                >
                  See SolanaShield in Action
                </RetroText>
                <p className="max-w-[900px] text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Experience how SolanaShield protects your Solana applications
                  and users from common attack vectors.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-4xl py-12">
              <Tabs defaultValue="dusting" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black border border-neon-800">
                  <TabsTrigger
                    value="dusting"
                    className="data-[state=active]:bg-neon-950 data-[state=active]:text-neon-500"
                  >
                    Dusting Attack
                  </TabsTrigger>
                  <TabsTrigger
                    value="poisoning"
                    className="data-[state=active]:bg-neon-950 data-[state=active]:text-neon-500"
                  >
                    Address Poisoning
                  </TabsTrigger>
                  <TabsTrigger
                    value="filtering"
                    className="data-[state=active]:bg-neon-950 data-[state=active]:text-neon-500"
                  >
                    Transaction Filtering
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="dusting"
                  className="mt-6 rounded-none border border-neon-800 bg-black p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-2">
                    <RetroCard>
                      <h3 className="text-xl font-bold mb-4 text-neon-500">
                        Without SolanaShield
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Malicious dust tokens appear in user wallets
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Users interact with scam tokens, risking funds
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            No way to filter or identify suspicious tokens
                          </p>
                        </div>
                      </div>
                    </RetroCard>
                    <RetroCard>
                      <h3 className="text-xl font-bold mb-4 text-neon-500">
                        With SolanaShield
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Automatic detection of dust attack patterns
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Suspicious tokens are flagged and filtered
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Users protected from interacting with malicious
                            tokens
                          </p>
                        </div>
                      </div>
                    </RetroCard>
                  </div>
                </TabsContent>
                <TabsContent
                  value="poisoning"
                  className="mt-6 rounded-none border border-neon-800 bg-black p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-2">
                    <RetroCard>
                      <h3 className="text-xl font-bold mb-4 text-neon-500">
                        Without SolanaShield
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Look-alike addresses appear in transaction history
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Users copy poisoned addresses for future
                            transactions
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Funds sent to attacker-controlled addresses
                          </p>
                        </div>
                      </div>
                    </RetroCard>
                    <RetroCard>
                      <h3 className="text-xl font-bold mb-4 text-neon-500">
                        With SolanaShield
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Visual warnings for similar-looking addresses
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Address verification before transaction submission
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Transactions to suspicious addresses blocked
                          </p>
                        </div>
                      </div>
                    </RetroCard>
                  </div>
                </TabsContent>
                <TabsContent
                  value="filtering"
                  className="mt-6 rounded-none border border-neon-800 bg-black p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-2">
                    <RetroCard>
                      <h3 className="text-xl font-bold mb-4 text-neon-500">
                        Without SolanaShield
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            All transactions displayed to users without
                            filtering
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            No way to identify potentially harmful transactions
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-red-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Users exposed to scams and phishing attempts
                          </p>
                        </div>
                      </div>
                    </RetroCard>
                    <RetroCard>
                      <h3 className="text-xl font-bold mb-4 text-neon-500">
                        With SolanaShield
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Real-time transaction filtering via API
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Suspicious transactions flagged or blocked
                          </p>
                        </div>
                        <div className="rounded-none bg-black border border-neon-500 p-4">
                          <p className="text-sm font-medium text-white">
                            Clean, safe transaction history for users
                          </p>
                        </div>
                      </div>
                    </RetroCard>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        <section
          id="team"
          className="w-full py-12 md:py-24 lg:py-32 bg-black relative"
        >
          <DotPattern
            className="opacity-10"
            dotColor="#00ffff"
            dotSpacing={30}
            dotSize={1}
            gridStyle={true}
          />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-none border border-cyan-500 px-3 py-1 text-sm text-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.7)]">
                  Our Team
                </div>
                <RetroText
                  as="h2"
                  className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-300 to-cyan-400"
                >
                  Meet The Founders
                </RetroText>
                <p className="max-w-[900px] text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  The brilliant minds behind SolanaShield.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-5xl py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {team.map((member, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group"
                  >
                    <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-black via-indigo-950 to-black p-1 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.7)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative aspect-square overflow-hidden rounded-full flex items-center justify-center bg-black">
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={500}
                          height={500}
                          className="object-cover w-full h-full rounded-full"
                          style={{ objectPosition: 'center top' }}
                        />
                      </div>
                      <div className="p-4 relative z-10">
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                          {member.name}
                        </h3>
                        <p className="text-sm text-gray-300 mt-1">{member.designation}</p>
                        <div className="mt-3 flex space-x-3 justify-center">
                          {member.name === "Boston" && (
                            <>
                              <a
                                href="https://x.com/piyushJha__"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                                </svg>
                              </a>
                              <a
                                href="https://github.com/piyushjha0409"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                </svg>
                              </a>
                            </>
                          )}
                          {member.name === "WhyParabola" && (
                            <>
                              <a
                                href="https://x.com/WhyParabola"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                                </svg>
                              </a>
                              <a
                                href="https://github.com/eman-07"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                </svg>
                              </a>
                            </>
                          )}
                          {member.name === "KshitijHash" && (
                            <>
                              <a
                                href="https://x.com/kshitijHash"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                                </svg>
                              </a>
                              <a
                                href="https://github.com/kshitij-hash"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-fuchsia-400 transition-colors duration-300"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                </svg>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* <section
          id="pricing"
          className="w-full py-12 md:py-24 lg:py-32 bg-black relative"
        >
          <DotPattern
            className="opacity-5"
            dotColor="#0CFF0C"
            dotSpacing={30}
            dotSize={1}
            gridStyle={true}
          />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-none border border-neon-500 px-3 py-1 text-sm text-neon-500 shadow-[0_0_10px_#0CFF0C]">
                  Pricing
                </div>
                <RetroText
                  as="h2"
                  className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-neon-500"
                >
                  Simple, Transparent Pricing
                </RetroText>
                <p className="max-w-[900px] text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Choose the plan that fits your needs, from individual
                  developers to enterprise applications.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl gap-6 py-12 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <RetroCard className="h-full">
                  <CardHeader>
                    <CardTitle className="text-neon-500">Developer</CardTitle>
                    <div className="text-3xl font-bold text-neon-500">
                      $49
                      <span className="text-sm font-normal text-gray-400">
                        /month
                      </span>
                    </div>
                    <CardDescription className="text-gray-400">
                      Perfect for individual developers and small projects.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Up to 100,000 API calls per month
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Basic dashboard access
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">Email support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Standard security rules
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full bg-black text-neon-500 hover:bg-neon-950 border border-neon-500 shadow-[0_0_10px_#0CFF0C]"
                    >
                      <Link href="/register?plan=developer">Get Started</Link>
                    </Button>
                  </CardFooter>
                </RetroCard>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <RetroCard className="h-full shadow-[0_0_20px_#0CFF0C] relative">
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-none bg-black px-3 py-1 text-xs font-medium text-neon-500 border border-neon-500">
                    Most Popular
                  </div>
                  <CardHeader>
                    <CardTitle className="text-neon-500">Business</CardTitle>
                    <div className="text-3xl font-bold text-neon-500">
                      $199
                      <span className="text-sm font-normal text-gray-400">
                        /month
                      </span>
                    </div>
                    <CardDescription className="text-gray-400">
                      Ideal for growing applications and businesses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Up to 1 million API calls per month
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Advanced dashboard with analytics
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Priority email support
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Custom security rules
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Webhook notifications
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full bg-black text-neon-500 hover:bg-neon-950 border border-neon-500 shadow-[0_0_10px_#0CFF0C]"
                    >
                      <Link href="/register?plan=business">Get Started</Link>
                    </Button>
                  </CardFooter>
                </RetroCard>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <RetroCard className="h-full">
                  <CardHeader>
                    <CardTitle className="text-neon-500">Enterprise</CardTitle>
                    <div className="text-3xl font-bold text-neon-500">
                      Custom
                      <span className="text-sm font-normal text-gray-400">
                        {" "}
                        pricing
                      </span>
                    </div>
                    <CardDescription className="text-gray-400">
                      For large-scale applications and organizations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Unlimited API calls
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Enterprise dashboard with full analytics
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          24/7 dedicated support
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Advanced custom security rules
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">SLA guarantees</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-neon-500 mt-0.5" />
                        <span className="text-gray-300">
                          Dedicated account manager
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-neon-800 text-neon-500 hover:bg-neon-950 hover:border-neon-500"
                    >
                      <Link href="/contact-sales">Contact Sales</Link>
                    </Button>
                  </CardFooter>
                </RetroCard>
              </motion.div>
            </div>
          </div>
        </section> */}

        <section className="w-full py-12 md:py-24 lg:py-32 relative">
          <div className="absolute inset-0 w-full h-full bg-black" />
          <BackgroundBeams className="absolute inset-0" />
          <DotPattern
            className="z-10 opacity-20"
            dotColor="#0CFF0C"
            dotSpacing={30}
            dotSize={1}
            gridStyle={true}
          />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <RetroText
                  as="h2"
                  glitch={false}
                  className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-neon-500"
                >
                  Ready to Secure Your Solana Applications?
                </RetroText>
                <p className="max-w-[900px] text-gray-200 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join thousands of developers and businesses protecting their
                  users from blockchain attacks.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-black text-neon-500 hover:bg-neon-950 border border-neon-500 shadow-[0_0_10px_#0CFF0C] group"
                >
                  <Link href="/dashboard">
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-neon-800 text-neon-500 hover:bg-neon-950 hover:border-neon-500"
                >
                  <Link href="/contact-sales">Schedule a Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-neon-800 bg-black py-6 relative">
        <DotPattern
          className="opacity-5"
          dotColor="#0CFF0C"
          dotSpacing={30}
          dotSize={1}
          gridStyle={true}
        />
        <div className="container px-4 md:px-6 relative z-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-neon-500" />
                <RetroText
                  as="span"
                  className="text-lg font-bold text-neon-500"
                >
                  SolanaShield
                </RetroText>
              </div>
              <p className="text-sm text-gray-400">
                Advanced security for the Solana blockchain ecosystem. Protect
                your users and applications from common attack vectors.
              </p>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-neon-500">
                  Twitter
                </Link>
                <Link href="#" className="text-gray-400 hover:text-neon-500">
                  GitHub
                </Link>
                <Link href="#" className="text-gray-400 hover:text-neon-500">
                  Discord
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neon-500">Product</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="#features"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      Features
                    </Link>
                  </li>
                  {/* <li>
                    <Link
                      href="#pricing"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      Pricing
                    </Link>
                  </li> */}
                  <li>
                    <Link
                      href="/docs"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/api"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      API Reference
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neon-500">Company</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/about"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/blog"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/careers"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-gray-400 hover:text-neon-500"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-neon-800 pt-8 text-center text-sm text-gray-400">
            <p>
              {new Date().getFullYear()} SolanaShield. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
