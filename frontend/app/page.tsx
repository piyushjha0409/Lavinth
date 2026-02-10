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
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center bg-card/40 p-6 text-center rounded-xl">
      <h2 className="mb-2 text-xl font-heading font-bold text-destructive">Something went wrong</h2>
      <p className="mb-4 text-muted-foreground">{error.message}</p>
      <button onClick={resetErrorBoundary} className="rounded-lg btn-gradient px-4 py-2 text-white text-sm">
        Try again
      </button>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
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
