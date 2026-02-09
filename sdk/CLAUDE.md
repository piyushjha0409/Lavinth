# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Lavinth SDK — a TypeScript SDK for Solana wallet security (post-compromise recovery). Monorepo with two packages:

- **`lavinth-sdk/`** (`@lavinth/sdk`) — Core SDK. Wraps the Lavinth REST API with typed methods for compromise detection, token approval scanning/revocation, fund tracing, exchange freeze requests, and transaction simulation.
- **`lavinth-react/`** (`@lavinth/react`) — React bindings. Context provider, hooks, and headless components. Depends on `@lavinth/sdk` via `file:../lavinth-sdk`.
- **`examples/`** — Usage examples (`quick-start.ts`, `react-integration.tsx`).

## Build & Dev Commands

Both packages use **tsup** for bundling (CJS + ESM + .d.ts) and **vitest** for testing.

```bash
# Core SDK
cd lavinth-sdk
npm run build        # tsup src/index.ts --format cjs,esm --dts
npm run dev          # same with --watch
npm run test         # vitest (runs all tests in src/__tests__/)
npm run lint         # eslint src/
npm run clean        # rm -rf dist

# React SDK
cd lavinth-react
npm run build        # tsup src/index.ts --format cjs,esm --dts --external react
npm run dev          # same with --watch
npm run test         # vitest
npm run lint         # eslint src/
npm run clean        # rm -rf dist

# Run a single test file
cd lavinth-sdk && npx vitest run src/__tests__/client.test.ts

# Run tests matching a pattern
cd lavinth-sdk && npx vitest run --testNamePattern "ApiClient"
```

**Build order matters:** Always build `lavinth-sdk` before `lavinth-react` — the React package imports from the core SDK via a `file:` dependency and needs its `dist/` to exist.

## Architecture

### Core SDK (`lavinth-sdk/src/`)

- **`types.ts`** — All shared TypeScript interfaces and the `LavinthError` class. Every type used across both packages is defined here. When adding a new API method, define its request/response types in this file.
- **`client.ts`** — `ApiClient` class. Low-level HTTP client using native `fetch` with retry (exponential backoff on 5xx/network errors), timeout via `AbortController`. Auth sends the same key as both `x-api-key` and `x-access-token` headers. Environment-based URL resolution: `development` → `localhost:3001`, `staging` → `staging-api.lavinth.io`, default → `api.lavinth.io`.
- **`lavinth.ts`** — `Lavinth` class. The main public API. Each method follows the same pattern: call `this.client.get/post/patch/delete`, check `response.success`, throw `LavinthError` on failure (or return `null` for 404s). Methods are grouped: Security Profile & Approvals, Revocation, Compromise Detection, Wallet Monitoring, Fund Tracing, Exchange Coordination, Transaction Simulation. Has an event system (`on`/`emit`) for `LavinthEvent` types.
- **`index.ts`** — Re-exports `Lavinth`, `ApiClient`, all types, `VERSION`, and `createLavinth()` factory.

### React SDK (`lavinth-react/src/`)

- **`context.tsx`** — `LavinthProvider` creates a `Lavinth` instance via `useMemo` (keyed on `apiKey`, `apiUrl`, `environment`). Exposes `useLavinth()` (returns SDK instance, throws if not initialized) and `useLavinthContext()` (returns SDK + alerts + `clearAlerts`). Auto-subscribes to SDK events and accumulates `SecurityAlert[]` in state.
- **`hooks/`** — Each hook follows the same pattern: gets SDK via `useLavinth()`, manages `[data, isLoading, error]` state, wraps SDK methods in `useCallback`, supports `autoFetch`/`autoScan` via `useEffect`, and optional `refreshInterval` polling.
- **`components/`** — Headless React components (render props pattern, no built-in styling): `SecurityAlertBanner`, `EmergencyRecoveryModal`, `ApprovalsList`, `FundTraceViewer`, `RecoveryWizard`.

### API Endpoints Pattern

All SDK methods call REST endpoints under `/api/`. The naming follows: `/api/{domain}/{action}/{param}`. Key domains: `approvals`, `security-profile`, `compromise`, `revocation`, `funds`, `freeze-requests`, `exchanges`, `simulation`, `programs`, `alerts`.

### Adding a New SDK Method

1. Add request/response types to `lavinth-sdk/src/types.ts`
2. Add the method to `lavinth-sdk/src/lavinth.ts` following the existing pattern (call `this.client.*`, check `response.success`, throw `LavinthError` on failure)
3. If adding a React hook, create it in `lavinth-react/src/hooks/`, export from `hooks/index.ts` and `src/index.ts`
4. Re-export any new types from `lavinth-react/src/index.ts`

## Key Conventions

- TypeScript strict mode is enabled in both packages (target ES2020, `jsx: react-jsx` for React package).
- All API methods throw `LavinthError` on failure (with `code`, `statusCode`, `details`), except methods that return `null` on 404.
- Both packages output CJS (`dist/index.js`), ESM (`dist/index.mjs`), and types (`dist/index.d.ts`).
- Node >= 18 required (uses native `fetch`).
- React peer dependency: React 18 or 19.
- Tests live in `src/__tests__/` within each package. The core SDK currently has `client.test.ts` and `exports.test.ts`.
