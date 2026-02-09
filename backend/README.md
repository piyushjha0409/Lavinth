# Lavinth Backend

Express API server for the Lavinth Solana post-compromise wallet recovery platform.

## Setup

```bash
npm install
cp env-sample.txt .env
# Edit .env with your credentials
```

### Database

Lavinth uses a single Neon PostgreSQL database configured via `DATABASE_URL`.

```bash
# Run schema migration
npx ts-node db/migrate.ts

# Run phase-specific migrations (in order)
npx ts-node db/migrate-phase3.ts
npx ts-node db/migrate-phase5.ts
npx ts-node db/migrate-phase6.ts
npx ts-node db/migrate-wallet-auth.ts
```

### Running

```bash
npm run dev          # Development (ts-node)
npm run build        # Compile TypeScript
npm start            # Production (node dist/)
```

### Testing

```bash
npm test             # Run tests
npm run test:watch   # Watch mode
```

## Architecture

The backend has two main components:

### API Server (`fetchEndpoint.ts`)

Express 5 server with 55+ REST endpoints covering:

- **Wallet security** - Approval scanning, risk scoring, batch revocation
- **Compromise detection** - Real-time monitoring, alert management
- **Fund tracing** - BFS graph traversal, recovery reports
- **Exchange coordination** - Freeze requests, evidence packages, email templates
- **Transaction simulation** - Pre-execution risk analysis
- **Threat intelligence** - 7 data sources, auto-sync, address/domain lookups

Auth: `x-access-token` header (static token) for dashboard routes, `x-api-key` header (SHA-256 hashed per-user keys) for public API routes.

### Dust Detector (`solana-dust-detector.ts`)

Standalone cron job that scans Solana blocks via Helius RPC for dusting attacks and address poisoning. Runs independently from the API server.

```bash
bash cron/dust-detector-cron.sh
```

## Services

| Service | File | Purpose |
|---------|------|---------|
| Approval Scanner | `services/approval-scanner.ts` | SPL token delegate approval scanning |
| Revocation Engine | `services/revocation-engine.ts` | Batch revocation transaction building |
| Compromise Detector | `services/compromise-detector.ts` | Wallet monitoring for compromise signs |
| Fund Tracker | `services/fund-tracker.ts` | Stolen fund BFS tracing |
| Alert Manager | `services/alert-manager.ts` | Multi-channel notifications (webhook, Discord, email) |
| Exchange Coordinator | `services/exchange-coordinator.ts` | Exchange communication and freeze workflows |
| Transaction Simulator | `services/transaction-simulator.ts` | Pre-execution transaction analysis |
| Threat Intelligence | `services/threat-intelligence.ts` | External threat data aggregation |

## Environment Variables

See `env-sample.txt` for the full list. Required variables:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `HELIUS_API_KEYS` - Comma-separated Helius RPC API keys
- `API_KEY` - Static token for internal dashboard auth
