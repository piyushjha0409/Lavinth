import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/context/QueryProvider";

function ChildComponent() {
  return <div>child content</div>;
}

function QueryClientInspector() {
  const client = useQueryClient();
  return (
    <div>
      <span data-testid="has-client">{client ? "yes" : "no"}</span>
      <span data-testid="stale-time">
        {client.getDefaultOptions().queries?.staleTime}
      </span>
    </div>
  );
}

describe("QueryProvider", () => {
  it("renders children", () => {
    render(
      <QueryProvider>
        <ChildComponent />
      </QueryProvider>
    );
    expect(screen.getByText("child content")).toBeDefined();
  });

  it("provides query client context", () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId("has-client").textContent).toBe("yes");
    expect(screen.getByTestId("stale-time").textContent).toBe("60000");
  });
});
