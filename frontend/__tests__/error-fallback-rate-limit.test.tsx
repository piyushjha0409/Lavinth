import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardErrorFallback } from "@/components/dashboard/error-fallback";

describe("DashboardErrorFallback – rate limit detection", () => {
  it('shows rate limit UI for "Too many requests" error', () => {
    const error = new Error("Too many requests. Please try again in 30 seconds.");
    render(
      <DashboardErrorFallback error={error} resetErrorBoundary={() => {}} />
    );

    expect(screen.getByText("Rate limit reached")).toBeTruthy();
    expect(
      screen.getByText(
        "You're making too many requests. Please wait a moment before trying again."
      )
    ).toBeTruthy();
  });

  it('shows rate limit UI for errors containing "429"', () => {
    const error = new Error("Failed to fetch /api/dashboard: 429");
    render(
      <DashboardErrorFallback error={error} resetErrorBoundary={() => {}} />
    );

    expect(screen.getByText("Rate limit reached")).toBeTruthy();
  });

  it("shows generic error UI for non-rate-limit errors", () => {
    const error = new Error("Network connection failed");
    render(
      <DashboardErrorFallback error={error} resetErrorBoundary={() => {}} />
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Network connection failed")).toBeTruthy();
  });

  it("renders Try again button in all cases", () => {
    const error = new Error("Too many requests.");
    render(
      <DashboardErrorFallback error={error} resetErrorBoundary={() => {}} />
    );

    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
