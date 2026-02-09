import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "react-error-boundary";
import { DashboardErrorFallback } from "@/components/dashboard/error-fallback";

describe("DashboardErrorFallback", () => {
  it("renders error message", () => {
    const error = new Error("Test error message");
    render(
      <DashboardErrorFallback
        error={error}
        resetErrorBoundary={() => {}}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test error message")).toBeDefined();
  });

  it("renders try again button", () => {
    const resetFn = vi.fn();
    render(
      <DashboardErrorFallback
        error={new Error("fail")}
        resetErrorBoundary={resetFn}
      />
    );
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(resetFn).toHaveBeenCalledTimes(1);
  });
});

describe("ErrorBoundary with DashboardErrorFallback", () => {
  it("catches tab render errors and shows fallback", () => {
    // Suppress console.error for the expected error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BrokenComponent(): JSX.Element {
      throw new Error("Component crashed");
    }

    render(
      <ErrorBoundary FallbackComponent={DashboardErrorFallback}>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Component crashed")).toBeDefined();

    consoleSpy.mockRestore();
  });
});
