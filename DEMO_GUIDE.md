# Lavinth — Product Demo & Presentation Guide

## Table of Contents

1. [The Problem](#1-the-problem)
2. [What Lavinth Does](#2-what-lavinth-does)
3. [Architecture at a Glance](#3-architecture-at-a-glance)
4. [Demo Wallet Addresses](#4-demo-wallet-addresses)
5. [Live Demo Walkthroughs](#5-live-demo-walkthroughs)
6. [Key Metrics to Mention](#6-key-metrics-to-mention)
7. [Starting the Demo Environment](#7-starting-the-demo-environment)

---

## 1. The Problem

**Solana users who get compromised have no unified way to recover.**

- Drainer scripts, malicious token approvals, and phishing attacks drain wallets in seconds — with no recourse for the victim.
- The Rublevka Team alone has been linked to **$10.9M+ stolen** across **240,000+ victims** using automated drainer scripts deployed at scale.
- Existing tools are fragmented: you can scan approvals *or* trace stolen funds *or* look up threat intel — but never in one place with a coordinated recovery workflow.
- There is no Solana-native platform that takes a victim from *"I think I got hacked"* through detection, evidence gathering, exchange coordination, and asset recovery — until now.

**Lavinth is the first post-compromise wallet recovery platform built specifically for Solana.**

---

## 2. What Lavinth Does

### Phase 1: Approval Management & Emergency Revocation
Scans all token approvals (delegates) on a connected wallet via Helius RPC. Users can selectively revoke suspicious approvals with checkbox selection, or trigger bulk emergency revocation of all risky delegates in one signing flow.

### Phase 2: Compromise Detection & Fund Tracking
Behavioral analysis engine that detects rapid token drains, known drainer interactions, and anomalous outflows. Multi-hop fund tracing follows stolen assets through intermediate wallets, identifying when they land at exchanges or cross bridges.

### Phase 3: Transaction Simulation
Pre-signing protection that simulates transactions before the user signs. Shows predicted balance changes, approval modifications, program verification, and risk scoring — catching drainer transactions before they execute.

### Phase 4: Developer SDK
`@lavinth/sdk` (core TypeScript) and `@lavinth/react` (hooks + components) let wallet providers and dApps embed Lavinth's security checks directly. Includes `scanWallet()`, `checkTransaction()`, `quickRiskCheck()`, `analyzeCompromise()`, and more.

### Phase 5: Exchange Coordination
Manages freeze request lifecycle with 16 tracked exchanges (Binance, Coinbase, Kraken, Jupiter, Raydium, etc.) and 7 known bridges. Generates evidence packages with SHA-256 integrity hashes and email templates with exchange-specific SLA deadlines.

### Phase 6: Threat Intelligence
Aggregates 8 threat intel sources — AllenHark community reports, Phantom NFT blocklist, GoPlus real-time API, Solana Safety 101 domains, PhishDestroy destroylist, Arkham Intelligence, Helius enhanced data, and Recorded Future (Rublevka attribution). Over 7,000 known malicious addresses in the database.

### Phase 7: Forensic Analysis
Full attack reconstruction: timeline generation, attack vector identification (drainer interaction, approval exploit, phishing), threat actor attribution with confidence scoring, affected asset inventory, and actionable recovery recommendations.

---

## 3. Architecture at a Glance

```
┌─────────────────────────────────┐
│     Frontend (Next.js 15)       │  Port 3000
│  Wallet-based auth (Phantom/    │
│  Solflare) · 9 dashboard tabs   │
│  · React Query · SSE alerts     │
└───────────────┬─────────────────┘
                │ API proxy (CSRF-protected)
┌───────────────▼─────────────────┐
│   Backend (Express + TypeScript)│  Port 3001
│  56+ API endpoints · 8 services │
│  Rate limiting · Circuit breakers│
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│  PostgreSQL (Neon) + Helius RPC │
│  7K+ malicious addresses        │
│  16 exchanges · 8 intel sources │
└─────────────────────────────────┘
```

**8 Backend Services:**
`approval-scanner` · `revocation-engine` · `compromise-detector` · `fund-tracker` · `alert-manager` · `exchange-coordinator` · `transaction-simulator` · `forensic-analyzer`

---

## 4. Demo Wallet Addresses

### Known Malicious — Rublevka Team Drainer Scripts

Use these addresses for threat intel lookups, forensic analysis, and compromise detection demos. All are flagged in the database as `category: drainer`, `source: recorded-future`, `confidence: 0.75`.

| Address | Use For |
|---------|---------|
| `9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo` | Wallet Security scan — shows "Known Drainer" label |
| `FsTbGbdeomvCh7pJsd37Ay7moqGK7wvaiiHUPDWF3qyg` | Forensics tab — attack vector identification |
| `FeeZVQ5GGCMgM5z4nNVK9YB5s2aaAYoPwMWtAaGQeYhT` | Fund tracing — shows drainer classification |
| `CuTbjiKn9pCJdbH46oVuuQmgdgFDd33TG4x7zK52uEnU` | Alternate drainer script for variety |
| `Bj4p6uY4WJRCLH3Zk4Dp27UP2MgJ9JBpTH9ZJR1unCsD` | Alternate drainer script for variety |

> **Note:** There are 169 Rublevka drainer script addresses in the database total (from `backend/scripts/insert-rublevka.ts`). Any of them work for demos.

### For Token Approvals & Revocation

Use your own connected wallet (Phantom or Solflare). The Token Approvals tab auto-scans the connected wallet and shows all active token delegates. You need a wallet with at least one token approval to demonstrate selective revocation.

### For Transaction Simulation

Any pending Solana transaction can be used. The simulation tab accepts raw transaction data for pre-signing analysis.

---

## 5. Live Demo Walkthroughs

### Demo 1: Landing Page & Value Prop (~2 min)

**Goal:** Establish what Lavinth is and why it matters.

1. Open `http://localhost:3000` in the browser
2. **Hero section** — read the headline and subtext. Highlight the "Get Started" CTA
3. **Features section** — scroll to show the 6 feature cards (approval scanning, compromise detection, simulation, exchange coordination, threat intel, forensics)
4. **How It Works section** — walk through the 3-step flow (Connect → Scan → Recover)
5. **Platform Capabilities section** — point out the live stats:
   - 16 Exchanges Tracked
   - 7 Threat Intel Sources
   - 55+ API Endpoints
   - 24/7 Real-time Monitoring
6. **CTA section** — shows the final call-to-action
7. Click **"Get Started"** to navigate to the dashboard

**Talking point:** *"This is the first unified post-compromise recovery platform on Solana. Everything from detection to exchange coordination in one place."*

---

### Demo 2: Wallet Security Scan (~3 min)

**Goal:** Show threat intelligence lookup on a known malicious address.

1. Connect your wallet (Phantom/Solflare) from the dashboard connect prompt
2. Click **"Wallet Security"** in the sidebar (ShieldCheck icon)
3. In the address input field, paste a Rublevka drainer address:
   ```
   9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo
   ```
4. Click **Scan** — the system queries:
   - Local DB (7,000+ known malicious delegates)
   - GoPlus real-time API (per-address risk lookup)
   - Helius RPC (transaction history + approvals)
5. **Expected results:**
   - "Known Drainer" badge or threat label
   - Security score breakdown with risk factors
   - Source attribution showing `recorded-future` as the data source
   - Any token approvals associated with the address (read-only view)

**Talking point:** *"We aggregate 8 threat intel sources. This address is part of the Rublevka Team — a group linked to $10.9M in stolen funds across 240K+ victims."*

---

### Demo 3: Forensic Analysis (~3 min)

**Goal:** Show the full attack reconstruction capability.

1. Click **"Forensic Analysis"** in the sidebar (FileSearch icon)
2. In the wallet input field, paste a Rublevka address:
   ```
   FsTbGbdeomvCh7pJsd37Ay7moqGK7wvaiiHUPDWF3qyg
   ```
3. Click **Analyze** — the backend runs:
   - Attack vector identification
   - Timeline event generation
   - Threat actor attribution
   - Affected asset inventory
4. **Expected results:**
   - **Attack overview** — vector type (e.g., "Known Drainer"), confidence score, severity
   - **Timeline table** — chronological events with Solscan links to each transaction
   - **Affected assets** — tokens and SOL that were impacted
   - **Threat actors** — attribution to known groups with confidence scores
   - **Recommendations** — actionable next steps for recovery

**Talking point:** *"This isn't just a scanner — it reconstructs the entire attack. Victims can use this evidence in exchange freeze requests and law enforcement reports."*

---

### Demo 4: Token Approvals & Emergency Revocation (~3 min)

**Goal:** Show approval management and selective revocation.

> **Prerequisite:** Your connected wallet needs at least one active token approval/delegate.

1. Click **"Token Approvals"** in the sidebar (KeyRound icon)
2. The tab auto-scans your connected wallet on load
3. **Show the approvals table:**
   - Each row shows: token, delegate address, risk level badge
   - Checkbox on each row for selective revocation
   - "Select All" checkbox with indeterminate state for partial selection
4. **Selective revocation flow:**
   - Check one or more risky approvals
   - Click **"Revoke Selected"**
   - The system builds revocation transactions on the backend
   - Wallet popup appears — sign the transaction(s)
   - After confirmation, the tab auto-rescans to show the approval is gone
5. **Emergency mode** (if available): bulk revoke all risky approvals at once

**Talking point:** *"Token approvals are the #1 attack vector on Solana. Drainer scripts trick you into approving a delegate, then drain your tokens later. This tab lets you see and revoke them instantly."*

---

### Demo 5: Transaction Simulation (~2 min)

**Goal:** Show pre-signing protection.

1. Click **"Transaction Simulation"** in the sidebar (PlayCircle icon)
2. Use **Quick Check** — enter a transaction to simulate
3. **Expected results:**
   - Risk score (0-100)
   - Predicted balance changes (SOL and tokens)
   - Approval changes (new delegates being added)
   - Program verification (known safe vs. unknown programs)
   - Warning flags for suspicious patterns (e.g., approval to known drainer)
4. Show **simulation history** — previous simulations are saved for reference
5. Point out the **Verified Programs** reference list (12 known safe programs)

**Talking point:** *"This catches drainer transactions before you sign. If a dApp asks you to approve a known malicious delegate, the simulation flags it with a clear warning."*

---

### Demo 6: Exchange Freeze Requests (~2 min)

**Goal:** Show the exchange coordination workflow.

1. Click **"Freeze Requests"** in the sidebar (Snowflake icon)
2. **Statistics panel** — shows:
   - 16 tracked exchanges (Binance, Coinbase, Kraken, Jupiter, Raydium, etc.)
   - 9 exchanges with freeze request capability
   - 7 known bridges (Wormhole, Allbridge, Portal, deBridge, Mayan, etc.)
3. **Sub-tabs:**
   - **Pending** — freeze requests awaiting exchange response
   - **Follow-up** — requests that need follow-up actions
   - **Exchanges** — full list of tracked exchanges with compliance contacts
4. **Evidence package generation:**
   - Each freeze request generates a structured evidence package
   - SHA-256 integrity hash for tamper-proof verification
   - Email template with exchange-specific SLA deadlines

**Talking point:** *"When stolen funds land at an exchange, time is critical. Lavinth generates the evidence package and email template automatically — victims just send it to the exchange's compliance team."*

---

### Demo 7: Recovery Dashboard (~2 min)

**Goal:** Show the unified recovery view.

1. Click **"Recovery"** in the sidebar (Radar icon)
2. **Sections available:**
   - Compromise analysis results
   - Active alerts (SSE-powered real-time stream)
   - Transaction history with suspicious flags
   - Fund traces showing the path of stolen assets
   - Recovery report generation

**Talking point:** *"This is the command center. Everything from detection to fund tracing to exchange coordination flows into one unified recovery dashboard."*

---

### Demo 8: Settings & API Keys (~1 min)

**Goal:** Show the developer/programmatic access.

1. Click **"Settings & API"** in the sidebar (Settings icon)
2. Show API key creation:
   - Keys are prefixed `lav_live_`
   - Support permissions, usage limits, IP restrictions, and expiration
   - Stored as SHA-256 hashes (never in plaintext)
3. Mention the SDK:
   - `npm install @lavinth/sdk` for Node.js/TypeScript
   - `npm install @lavinth/react` for React hooks and components

**Talking point:** *"Wallet providers like Phantom or Solflare can embed Lavinth directly. The SDK gives them scanWallet(), checkTransaction(), and quickRiskCheck() out of the box."*

---

## 6. Key Metrics to Mention

| Metric | Value |
|--------|-------|
| Known malicious delegates in DB | 7,000+ |
| Rublevka Team addresses tracked | 175 (6 attributed + 169 drainer scripts) |
| AllenHark community addresses | ~4,047 |
| Phantom Blocklist NFT mints | ~3,055 |
| Tracked exchanges | 16 (9 with freeze capability) |
| Known bridges | 7 (Wormhole, Allbridge, Portal, deBridge, Mayan, etc.) |
| Verified safe programs | 12 |
| Threat intel sources | 8 |
| API endpoints | 56+ |
| Dashboard tabs | 8 + overview = 9 total |
| Backend services | 8 |
| SDK test pass rate | 9/9 (100%) |
| API test pass rate | 87/91 (96%) |

---

## 7. Starting the Demo Environment

### Prerequisites

- Node.js 18+
- Phantom or Solflare browser extension installed
- `.env` files configured in both `backend/` and `frontend/`

**Backend `.env` (required variables):**
```
DATABASE_URL=postgresql://...     # Neon PostgreSQL connection string
HELIUS_API_KEYS=key1,key2         # Comma-separated Helius RPC keys
API_KEY=your-static-api-key       # Static access token for internal auth
```

**Frontend `.env` (required variables):**
```
API_BASE_URL=http://localhost:3001/api
API_KEY=your-static-api-key       # Must match backend API_KEY
```

### Start the servers

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

### Open the demo

1. Navigate to `http://localhost:3000`
2. The landing page loads immediately (no auth required)
3. Click "Get Started" or navigate to `/dashboard`
4. Connect your wallet via the Phantom/Solflare popup
5. You're in — all 8 dashboard tabs are now accessible

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend won't start | Check `DATABASE_URL` is valid and Neon DB is accessible |
| "Unauthorized" errors | Ensure `API_KEY` matches in both `.env` files |
| Wallet won't connect | Make sure Phantom/Solflare extension is installed and on Solana mainnet |
| Empty threat intel results | Run `npx ts-node scripts/insert-rublevka.ts` from `backend/` to seed Rublevka addresses |
| No token approvals showing | Your connected wallet needs active token delegates — use a wallet that has interacted with DeFi protocols |
