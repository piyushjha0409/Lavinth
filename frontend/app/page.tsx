"use client"

import { ErrorBoundary } from "react-error-boundary"
import HeroSection from "@/components/hero-section"
import Navbar from "@/components/navbar"
import FeaturesSection from "@/components/features-section"
import HowItWorksSection from "@/components/how-it-works-section"
import SecurityMetricsSection from "@/components/security-metrics-section"
import CTASection from "@/components/cta-section"
import Footer from "@/components/footer"

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center bg-black/40 p-6 text-center">
      <h2 className="mb-2 text-xl font-bold text-red-400">Something went wrong:</h2>
      <p className="mb-4 text-gray-300">{error.message}</p>
      <button onClick={resetErrorBoundary} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Try again
      </button>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <Navbar />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HeroSection />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <FeaturesSection />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <HowItWorksSection />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <SecurityMetricsSection />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <CTASection />
      </ErrorBoundary>
      <Footer />
    </main>
  )
}
