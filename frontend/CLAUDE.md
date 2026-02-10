# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Lavinth

Lavinth is a Solana post-compromise wallet recovery platform. It provides wallet approval scanning, selective token revocation, compromise detection, fund tracing, exchange freeze requests, transaction simulation, and threat intelligence.

## Commands

- `npm run dev` — Start dev server (Next.js on port 3000)
- `npm run build` — Build the Next.js app (`next build`)
- `npm run lint` — Run ESLint via `next lint`
- `npm run test` — Run tests via `vitest run`
- `npm run test:watch` — Run tests in watch mode
- `npx vitest run __tests__/some-file.test.ts` — Run a single test file

ESLint and TypeScript errors are **not** ignored during builds (`next.config.mjs` sets `ignoreDuringBuilds: false` and `ignoreBuildErrors: false`). Builds will fail on type errors and lint issues.

## Environment Variables

Required in `.env`:
- `API_BASE_URL` — Backend API base URL (e.g. `http://localhost:3001/api`)
- `API_KEY` — Shared secret for authenticating to the backend API via `x-access-token` header

## Architecture

### Frontend framework
Next.js 15 App Router with React 19. All pages are client-rendered (`"use client"`). The app is dark-mode only (hardcoded `className="dark"` on `<html>`).

### Provider hierarchy
Root layout (`app/layout.tsx`) nests providers in this order:
`QueryProvider` → `WalletProvider` → `WalletAuthSync` → children

- `QueryProvider` — TanStack React Query with 60s stale time, 5min GC, single retry, no refetch-on-focus
- `WalletProvider` — Solana wallet adapter (Phantom, Solflare) with auto-connect
- `WalletAuthSync` — Syncs wallet connection state to the `wallet_address` cookie

### Authentication
Wallet-based auth using Solana wallet adapters. No NextAuth, no Google OAuth, no Prisma.

Auth flow:
- `lib/wallet-auth.ts` — Server-side `getWalletAddress()` reads the `wallet_address` cookie and validates it as a Solana base58 address
- `hooks/use-wallet-auth.ts` — Client-side hook that syncs wallet connection state to a `wallet_address` cookie (30-day expiry)
- `middleware.ts` — Protects all routes except `/` and `/dashboard`; redirects unauthenticated users to `/dashboard`
- No dedicated sign-in page — the dashboard page itself shows a `WalletMultiButton` connect prompt when no wallet is connected

### Backend proxy pattern
The Next.js API routes (`app/api/`) act as an **authenticated proxy** to an external backend service. Each route:
1. Validates the wallet cookie via `getWalletAddress()`
2. Forwards the request to `API_BASE_URL` with the `x-access-token` header
3. Transforms/normalizes the response before returning to the client

Mutating API routes also validate request origin via `lib/csrf.ts` (`validateOrigin()`), which checks the `Origin`/`Referer` header against an allowlist.

### Data fetching
Client-side data fetching uses TanStack React Query via custom hooks in `hooks/use-api.ts`. The `useDashboardData()` hook fetches from `/api/dashboard`. SSE-based real-time alerts are handled by `hooks/use-alert-stream.ts` using `EventSource` with auto-reconnect.

### Dashboard
Single-page dashboard at `/dashboard` with tab-based navigation via `?tab=` query param. Tabs: overview, wallet-security, token-approvals, simulation, recovery, freeze-requests, settings-api. Each tab is a separate component in `components/dashboard/`. Tabs are wrapped in `react-error-boundary` `ErrorBoundary` with `DashboardErrorFallback`, keyed by `activeTab` so boundaries reset on tab switch.

**Tab separation:**
- `wallet-security` — Address scanner for any Solana address (threat intel lookup, security score, read-only approvals table)
- `token-approvals` — Dedicated tab for the **connected wallet's** token approval management with checkbox selection and batch revocation via `signAllTransactions`

### Token Approvals & Selective Revocation
- `components/dashboard/my-token-approvals.tsx` — Self-contained component using `useWallet()`. Auto-scans connected wallet on mount/connect. Checkbox selection with `Set<string>` keyed by `tokenAccount`. Inline revocation flow: build → sign → submit → auto-rescan.
- `app/api/approvals/revoke-selected/route.ts` — Proxy route to backend's `POST /api/revocation/build-selective`
- Uses shadcn Checkbox (`components/ui/checkbox.tsx`) with Radix `"indeterminate"` state for partial selection
- `WalletMultiButton` is dynamically imported (`{ ssr: false }`) for SSR compatibility

### Sidebar
- Navigation items defined in `components/dashboard/sidebar.tsx`
- `SidebarUser` component at bottom shows connected wallet address + disconnect dropdown
- No duplicate `WalletMultiButton` — `SidebarUser` handles wallet display and disconnect

### API key system
Users can create API keys for programmatic access via the Settings & API tab. Keys are managed through backend endpoints (`/api/user-api-keys/:walletAddress`). Keys are prefixed `lav_live_`, stored as SHA-256 hashes, and support permissions, usage limits, IP restrictions, and expiration.

### UI components
shadcn/ui (Radix + Tailwind) configured in `components.json`. Components in `components/ui/` (includes checkbox). Three.js via react-three-fiber for the hero section, and Framer Motion for animations.

### Testing
Tests live in `__tests__/` at the project root (not colocated). Vitest with jsdom environment, `@testing-library/react`, and `@testing-library/jest-dom`. Globals are enabled (`vitest.config.ts`), so `describe`/`it`/`expect` don't need imports.

### Path aliases
`@/*` maps to the project root (tsconfig `paths`).

### Key directories
- `app/api/` — API route handlers (proxy to backend)
- `app/api/approvals/` — Approval scan, submit, and selective revocation proxy routes
- `app/types/` — TypeScript interfaces for dashboard and transaction data
- `app/utils/` — Data processing utilities
- `components/dashboard/` — Dashboard tab components
- `components/ui/` — shadcn/ui and custom UI primitives
- `hooks/` — Custom React hooks (data fetching, wallet auth, alert streaming)
- `context/` — React context providers (QueryProvider, WalletProvider)
- `lib/` — Server-side utilities (wallet auth, CSRF validation)
