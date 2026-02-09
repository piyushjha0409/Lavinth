import { useQuery } from "@tanstack/react-query";

const FETCH_TIMEOUT_MS = 30_000; // 30s timeout for API calls

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const wait = retryAfter ? ` Please try again in ${retryAfter} seconds.` : " Please try again shortly.";
      throw new Error(`Too many requests.${wait}`);
    }
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json();
}

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const result = await fetchJson<{ data: any }>("/api/dashboard");
      return result.data;
    },
  });
}
