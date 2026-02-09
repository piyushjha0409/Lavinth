# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

- **Dev:** `npm run dev` (runs `ts-node fetchEndpoint.ts`)
- **Build:** `npm run build` (runs `tsc`, outputs to `dist/`)
- **Start (production):** `npm start` (runs `node dist/fetchEndpoint.js`)
- **Tests:** `npx vitest run`
- **Single test:** `npx vitest run __tests__/health.test.ts`
- **Watch mode:** `npm run test:watch`
- **DB migration:** `npx ts-node db/migrate.ts` (runs `schema.sql` against Neon PostgreSQL)
- **Phase-specific migrations:** `npx ts-node db/migrate-phase3.ts`, `db/migrate-phase5.ts`, `db/migrate-phase6.ts`
- **Wallet auth migration:** `npx ts-node db/migrate-wallet-auth.ts` (creates `users` and `user_api_keys` tables)
- **DB init (destructive - drops tables):** `npx ts-node db/init-db.ts`

## Architecture

**Lavinth** is a Solana post-compromise wallet recovery platform. It provides wallet approval scanning, emergency revocation, compromise detection, fund tracing, exchange freeze requests, transaction simulation, and threat intelligence.

### API Server (`fetchEndpoint.ts`)

A monolithic Express 5 server (~1800 lines) that defines all REST endpoints in a single file. The app is exported as both named and default export for testing with supertest.

**Auth** is via two mechanisms:
- `x-access-token` header (static token from `API_KEY` env var) — for internal dashboard routes
- `x-api-key` header (SHA-256 hashed API keys stored in `user_api_keys` table) — for public API routes
- The `validateApiKey` middleware also accepts `x-access-token` as a fallback, so public routes can be accessed with either auth method.

**Route ordering matters:** Specific named routes (e.g., `/freeze-requests/pending`, `/freeze-requests/follow-up`, `/freeze-requests/statistics`) must be defined before parameterized routes (e.g., `/freeze-requests/:requestId`) to avoid incorrect matching.

### Key Directories

- **`db/`** — Database layer. `config.ts` exports a `CustomPool` singleton (extends pg `Pool`) with `executeQuery(text, params, maxRetries)` that has built-in retry with exponential backoff. `db-utils.ts` exports a `DatabaseUtils` default instance `db` with `db.pool` to access the pool.
- **`middlewares/`** — `validateToken.ts` (simple static token check), `validateApiKey.ts` (full API key validation with permissions, rate limits, IP restrictions), `rateLimiter.ts` (global: 100 req/15min, strict: 20 req/15min).
- **`services/`** — Domain services organized by implementation phase:
  - **Phase 1:** `approval-scanner.ts`, `revocation-engine.ts`
  - **Phase 2:** `compromise-detector.ts`, `fund-tracker.ts`, `alert-manager.ts`
  - **Phase 3:** `exchange-coordinator.ts`
  - **Phase 5:** `transaction-simulator.ts`
  - **Phase 6:** `threat-intelligence.ts`
- **Root-level utilities:** `logger.ts` (pino), `validateEnv.ts` (startup env validation), `processHandlers.ts` (uncaught exception/rejection handlers, imported via side-effect `import "./processHandlers"`)

### Service Wiring

Some services depend on the threat intelligence service. This wiring happens in `fetchEndpoint.ts` after imports via `setThreatIntel()` calls:
```
compromiseDetector.setThreatIntel(threatIntelligenceService);
fundTracker.setThreatIntel(threatIntelligenceService);
exchangeCoordinator.setThreatIntel(threatIntelligenceService);
```

### Database Access Pattern

All queries use `db.pool.executeQuery(sql, params)` with parameterized `$1, $2...` placeholders. No ORM — raw SQL throughout. The pool has built-in retry logic (3 attempts with exponential backoff). Pagination helpers `sanitizeLimit()` and `sanitizeOffset()` are defined in `fetchEndpoint.ts`.

### Logging

Uses pino structured logging. In route handlers, use `req.log.info(...)` / `req.log.error({ err: error }, 'message')` (pino-http binds a child logger per request). In services and utilities, import and use the shared `logger` from `./logger.ts`.

### Blockchain Integration

All Solana RPC calls go through Helius endpoints. `HELIUS_API_KEYS` env var accepts comma-separated keys for round-robin load distribution. Services construct `RPC_ENDPOINTS` arrays from these keys.

## Testing Patterns

Tests live in `__tests__/` and use vitest + supertest. The test pattern requires extensive mocking because `fetchEndpoint.ts` eagerly imports all services at module level. Every test file must mock:

1. `../db/config` and `../db/db-utils` — mock `executeQuery`
2. `../middlewares/validateToken`, `../middlewares/validateApiKey`, `../middlewares/rateLimiter` — stub as passthrough (`next()`)
3. `../validateEnv` and `../processHandlers` — stub out
4. All service modules (`../services/*`) — stub with minimal shape

Use `vi.hoisted()` to create mock functions that can be referenced in `vi.mock()` factories. See `__tests__/health.test.ts` for the canonical example. Import `app` from `../fetchEndpoint` *after* all mocks are set up.

## Environment Setup

Copy `env-sample.txt` to `.env`. Required: `DATABASE_URL`, `HELIUS_API_KEYS`, `API_KEY`. See `env-sample.txt` for all optional variables (alerts, thresholds, fund tracker settings).

## API Route Groups

All routes are in `fetchEndpoint.ts`. Auth middleware determines access:
- `validateToken`: Internal dashboard routes (`/api/users/ensure`, `/api/user-api-keys/*`)
- `validateApiKey`: Public API routes (`/api/check-wallet/*`, `/api/approvals/*`, `/api/revocation/*`, `/api/recovery/*`, `/api/security-profile/*`, `/api/compromise/*`, `/api/funds/*`, `/api/alerts/*`, `/api/exchanges/*`, `/api/freeze-requests/*`, `/api/evidence/*`, `/api/simulation/*`, `/api/programs/*`, `/api/threat-intel/*`)
- No auth: `/api/health`

## TypeScript Config

Target: ES2015, module: CommonJS, strict mode enabled, output to `dist/`. Tests (`__tests__/`) are excluded from compilation.
