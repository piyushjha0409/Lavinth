# Lavinth - Solana Post-Compromise Wallet Recovery Platform

## The Problem

Every day, Solana users lose funds to wallet compromises. The attack surface is wide:

- **Token approval exploits** - Users unknowingly grant unlimited spending authority to malicious programs. Drainers exploit these approvals to siphon tokens hours or days later.
- **Phishing and social engineering** - Fake airdrops, poisoned transaction histories, and scam dApps trick users into signing malicious transactions.
- **Dusting attacks** - Attackers send tiny amounts of SOL or tokens to wallets, embedding scam addresses in transaction history. Users who interact with these addresses lose funds.
- **Slow drains** - Unlike dramatic rug pulls, many compromises happen gradually. Small unauthorized transfers go unnoticed until the wallet is emptied.

Once a compromise happens, victims face an uphill battle:

1. **No visibility** - They don't know which approvals are dangerous or which addresses are malicious.
2. **No tooling** - Revoking approvals requires manual SPL token instructions. Most users don't know how.
3. **No tracing** - Stolen funds move through intermediary wallets, bridges, and mixers. Tracking them manually is impossible.
4. **No recovery path** - Even when funds land on exchanges, there's no streamlined way to contact compliance teams with proper blockchain evidence.
5. **No prevention** - Users sign transactions blindly with no way to preview what a transaction will actually do before it executes.

---

## How Lavinth Solves It

Lavinth is an end-to-end platform that covers the full lifecycle of wallet security: **detect, respond, trace, recover, and prevent**.

### Detection Layer

Lavinth continuously monitors registered wallets for compromise indicators. The Compromise Detector watches for:

- Large outflows (>10 SOL or >50% of wallet balance)
- Rapid drain patterns (3+ transactions in 5 minutes)
- Interactions with known drainer addresses
- Deposits to exchanges (indicating attacker cash-out)
- Bridge transfers (funds leaving Solana)

When thresholds are crossed, alerts fire through configured channels (webhooks, Discord, email) with severity classification from low to critical.

### Response Layer

The moment a compromise is detected, the Approval Scanner identifies every active token delegate approval on the wallet and classifies each by risk:

- Known malicious delegate (50 risk points)
- Unlimited approval amount (25 risk points)
- Recently created delegate (10 risk points)
- High transaction volume (10 risk points)

The Revocation Engine then batches revocation instructions (up to 20 per transaction), builds unsigned transactions, and returns them to the user for signing. This preserves user custody while automating the technical complexity of SPL token revocations.

### Intelligence Layer

Lavinth aggregates threat data from 7 external sources:

| Source | Type | Data |
|--------|------|------|
| AllenHark | Community list | ~4,047 scammer addresses |
| Phantom NFT Blocklist | Community list | ~3,055 malicious NFT mint addresses |
| GoPlus Security | Real-time lookup | Per-address risk scoring (free API) |
| Solana Safety 101 | Domain list | Known scam domains |
| PhishDestroy | Domain list | Web3 phishing domains |
| Arkham Intelligence | Entity resolver | Address-to-entity mapping |
| Helius | Transaction parser | Enhanced transaction classification |

This intelligence feeds into every service. When the Fund Tracker encounters an unknown address, it checks the malicious delegate database, queries Arkham for entity resolution, and falls back to GoPlus for real-time risk assessment.

### Tracing Layer

The Fund Tracker performs breadth-first search through the Solana blockchain, following stolen funds across up to 10 hops and 50 transactions per hop. Each address is classified:

- **Exchange** - 70% recovery probability. Funds can be frozen.
- **Bridge** - 10% recovery probability. Funds are leaving Solana.
- **Mixer** - Critical risk. Funds are being laundered.
- **Drainer** - Critical risk. Known malicious actor.
- **Intermediate** - Hop in the laundering chain.

The result is a full transaction graph with nodes, edges, amounts, signatures, and timestamps. A recovery report calculates the weighted probability of fund recovery based on where the money ended up.

### Recovery Layer

When stolen funds are identified at an exchange, the Exchange Coordinator takes over:

1. Looks up the exchange's compliance contact information (16 exchanges configured)
2. Creates a formal freeze request with all required fields
3. Compiles a blockchain evidence package including transaction signatures, flow steps, block hashes, Solscan links, and a SHA-256 integrity hash
4. Generates a professional email template addressed to the exchange's compliance team
5. Tracks the request through its lifecycle: draft, submitted, acknowledged, under review, frozen, released, or closed
6. Schedules follow-ups and records exchange responses

### Prevention Layer

The Transaction Simulator analyzes transactions before they're signed. It decodes every instruction and checks for:

- Unlimited token approvals
- Transfers to known drainer addresses
- Authority changes on token accounts
- Hidden approvals buried in batch transactions
- Interactions with unverified programs
- Account closures to unknown addresses

Each transaction gets a risk score (0-100) with transparent factor breakdowns. Users see exactly what a transaction will do to their balances, approvals, and account authorities before they sign.

---

## Features

### Core Security Services

- **Wallet Security Scanning** - Full SPL token approval audit across Token Program and Token-2022
- **Risk Scoring** - Multi-factor risk assessment with weighted scoring for threat types
- **Batch Revocation** - Automated revocation plan generation with batched transactions
- **Emergency Revocation** - Fast-track mode prioritizing critical and high-risk approvals
- **Real-time Monitoring** - Configurable monitoring levels (standard, high, critical)
- **Compromise Analysis** - Per-transaction analysis with pre/post balance comparison
- **Fund Tracing** - Async BFS graph traversal with node classification
- **Recovery Reports** - Weighted recovery probability with actionable breakdown
- **Exchange Freeze Requests** - End-to-end freeze workflow with evidence packages
- **Transaction Simulation** - Pre-execution analysis with pattern matching

### Threat Intelligence

- **7 Data Sources** - Community lists, domain lists, entity resolution, real-time lookups
- **Auto-Sync** - Configurable sync interval (default 6 hours)
- **Address Lookup** - Combined local database + GoPlus real-time check
- **Domain Reputation** - Scam/phishing domain verification
- **Entity Resolution** - Arkham-powered address identification with 24-hour caching

### Alert System

- **Multi-Channel** - Webhooks (HMAC-signed), Discord (rich embeds), email
- **Severity Levels** - Low, medium, high, critical with color-coded notifications
- **Rate Limiting** - 60 notifications/minute with exponential backoff retry
- **Subscription Management** - Per-wallet alert preferences with type and severity filters

### Dashboard (10 Tabs)

1. **Overview** - Key metrics, threat summary, top threats at a glance
2. **Wallet Security** - Approval scanning and risk profile visualization
3. **Simulation** - Transaction risk analysis before signing
4. **Recovery** - Fund tracing status and recovery session management
5. **Freeze Requests** - Exchange communication tracking and evidence generation
6. **Threat Intelligence** - Data source management, sync triggers, status monitoring
7. **Network Analysis** - Transaction graph visualization
8. **ML Analytics** - Attack pattern analysis and behavioral insights
9. **Transactions** - Suspicious transaction listing with filters
10. **Settings/API** - API key management and configuration

### SDK

- **@lavinth/sdk** - TypeScript client with full API coverage, error handling, retry logic
- **@lavinth/react** - React hooks for wallet security, compromise detection, fund tracing, simulation, and freeze requests
- **Dual Format** - CJS + ESM builds via tsup

### API

- **55+ Endpoints** - Covering approvals, revocation, compromise detection, fund tracing, exchange coordination, simulation, threat intelligence, and system management
- **Paginated Responses** - Consistent limit/offset with total counts
- **Dual Auth** - Static access token for dashboards, per-user API keys for programmatic access
- **Input Validation** - Sanitized pagination, base58 format validation, required field checks

---

## User Flow

### Flow 1: Proactive Wallet Security Check

A user wants to check if their wallet has any dangerous approvals.

**Step 1 - Connect and Scan**

The user navigates to the Wallet Security tab on the dashboard and enters their wallet address. Lavinth calls the Approval Scanner, which queries both the SPL Token Program and Token-2022 for all token accounts associated with the wallet. For each account with a non-zero delegate, it pulls the delegate address, approved amount, and token mint.

**Step 2 - Risk Assessment**

Each approval is scored against the malicious delegate database (7,000+ known addresses from AllenHark and Phantom Blocklist), checked for unlimited amounts (max u64 = 18,446,744,073,709,551,615), and evaluated for delegate age and transaction volume. The wallet receives an overall security profile:

- **Critical** (75-100): Known malicious delegates active
- **High** (50-74): Unlimited approvals to unverified programs
- **Medium** (25-49): Multiple approvals with moderate risk
- **Low** (0-24): Clean wallet

**Step 3 - Revocation**

If risky approvals are found, the user clicks "Revoke". Lavinth generates a revocation plan that batches up to 20 `Revoke` instructions per transaction, estimates fees (~5,000 lamports per instruction), and builds unsigned transactions serialized as base64. The user's wallet adapter signs the transactions, and Lavinth submits them to the network. A recovery session tracks every revocation with its transaction signature.

**Step 4 - Verification**

After submission, the dashboard shows the recovery session status: how many approvals were found, how many were successfully revoked, which signatures confirmed, and the estimated assets saved.

---

### Flow 2: Responding to a Wallet Compromise

A user's wallet has been drained. They need to act fast.

**Step 1 - Emergency Revocation**

The user enters their compromised wallet address. Lavinth immediately scans for active approvals and triggers emergency revocation mode, which prioritizes critical and high-risk delegates. The Revocation Engine builds transactions that revoke dangerous approvals first, cutting off the attacker's access to remaining tokens.

**Step 2 - Compromise Analysis**

While revocation transactions are being signed, the Compromise Detector runs a full analysis. It pulls recent transactions, compares pre/post balances for each, extracts counterparty addresses, and cross-references them against the malicious delegate database and Arkham entities. The analysis produces:

- A timeline of suspicious transactions
- The total amount lost (SOL and tokens)
- Identified attacker addresses with entity labels
- Severity classification (critical if >80% loss)

**Step 3 - Fund Tracing**

The user initiates a fund trace from the Recovery tab. The Fund Tracker starts an async breadth-first search from the attacker's initial receiving address. At each hop, it queries Solana for outgoing transactions, extracts recipient addresses, and classifies them:

- If the address matches a known exchange (16 in database), it's marked as an exchange node with 70% recovery probability.
- If it matches a known bridge (5+ in database), it's marked with 10% recovery probability.
- If it's a known mixer, it's flagged as critical.
- Unknown addresses are checked against Arkham and GoPlus for further classification.

The trace builds a graph that might look like:

```
Victim Wallet
  |-- 450 SOL --> Intermediary A
  |     |-- 200 SOL --> Binance Hot Wallet (exchange)
  |     |-- 250 SOL --> Intermediary B
  |           |-- 250 SOL --> Wormhole Bridge (bridge)
  |-- 50 SOL --> Known Drainer Pool
```

**Step 4 - Recovery Report**

Once tracing completes, a recovery report is generated. It summarizes:

- Total stolen: 500 SOL
- In exchanges: 200 SOL (70% recovery probability)
- In bridges: 250 SOL (10% recovery probability)
- In drainer: 50 SOL (0% recovery probability)
- Weighted recovery probability: 33%
- Recommended actions: file freeze request at Binance

**Step 5 - Exchange Freeze Request**

For the 200 SOL identified at Binance, the user creates a freeze request. The Exchange Coordinator:

1. Pulls Binance's compliance contact information (emergency email, API endpoint, response SLA)
2. Compiles an evidence package containing every transaction signature in the fund flow, block hashes, confirmations, and Solscan verification links, sealed with a SHA-256 integrity hash
3. Generates a professional email template addressed to "Binance Compliance Team" with:
   - Incident summary: wallet address, date, amount, deposit transaction
   - Complete fund flow from victim to exchange
   - Requested actions: freeze account, preserve records, contact law enforcement
   - Response deadline based on exchange SLA (typically 24 hours)

The user sends the email. The platform tracks the request status as it progresses: submitted, acknowledged, under review, frozen. Follow-up reminders are scheduled automatically.

**Step 6 - Ongoing Monitoring**

The user registers their wallet for continuous monitoring. The Compromise Detector watches for any further suspicious activity. Alert subscriptions are configured for Discord and webhook delivery. If the attacker attempts further transactions, alerts fire immediately.

---

### Flow 3: Pre-Transaction Safety Check

A user is about to sign a transaction from a dApp and wants to verify it's safe.

**Step 1 - Submit Transaction**

The user pastes the base64-serialized transaction into the Simulation tab (or uses the SDK's `checkTransaction` method in their application). The Transaction Simulator deserializes the transaction and decodes every instruction.

**Step 2 - Instruction Analysis**

Each instruction is analyzed:

- **Token Program instructions** are decoded by type (Transfer, Approve, Revoke, SetAuthority, Burn, CloseAccount). For Approve instructions, the amount is checked against max u64 to detect unlimited approvals. The delegate address is checked against the malicious database.
- **System Program instructions** are checked for unexpected CreateAccount or Assign operations that could transfer account ownership.
- **Unknown programs** are flagged and checked against the verified programs database (12 known-safe programs).

**Step 3 - Risk Scoring**

The transaction receives a composite risk score:

| Pattern | Points |
|---------|--------|
| Known malicious program | +50 |
| Critical warning (drainer transfer) | +40 |
| High warning (unlimited approval) | +25 |
| Unlimited approval detected | +20 |
| Unverified program | +15 |
| Medium warning (authority change) | +10 |
| Low warning (unusual pattern) | +5 |

**Step 4 - Result**

The user sees:

- **Risk level**: safe / low / medium / high / critical
- **Risk score**: 0-100
- **Warnings**: Plain-language descriptions of each detected pattern
- **Balance changes**: Projected SOL and token balance changes
- **Approval changes**: Any new or modified delegate approvals
- **Programs invoked**: Each program with verified/unverified status
- **Estimated fee and compute units**

If the risk level is high or critical, the user knows not to sign. If it's safe, they proceed with confidence.

---

### Flow 4: Developer Integration via SDK

A wallet application wants to integrate Lavinth's security features.

**Step 1 - Install**

```bash
npm install @lavinth/sdk @lavinth/react
```

**Step 2 - Initialize**

```typescript
import { createLavinth } from '@lavinth/sdk';

const lavinth = createLavinth({
  apiKey: 'your-api-key',
  apiUrl: 'https://api.lavinth.com',
  onAlert: (alert) => {
    console.log('Security alert:', alert);
  }
});
```

**Step 3 - Scan Before Connecting**

When a user connects their wallet, the dApp automatically scans for approvals:

```typescript
const profile = await lavinth.scanWallet(walletAddress);

if (profile.riskLevel === 'critical') {
  showWarning('This wallet has dangerous approvals. Revoke them immediately.');
}
```

**Step 4 - Simulate Before Signing**

Before any transaction is signed, the dApp runs it through the simulator:

```typescript
const result = await lavinth.checkTransaction(serializedTransaction);

if (result.riskLevel === 'critical') {
  blockTransaction('This transaction contains malicious patterns.');
  return;
}
```

**Step 5 - React Hooks**

For React applications, hooks provide built-in state management:

```tsx
function WalletSecurity({ address }) {
  const { profile, loading, error } = useSecurityProfile(address);
  const { approvals, revoke } = useApprovals(address);

  if (loading) return <Spinner />;
  if (profile.riskLevel === 'critical') {
    return <RevokeAllButton onClick={() => revoke(approvals)} />;
  }
  return <SafeBadge />;
}
```

---

## Architecture

```
                    Users / dApps / Wallets
                           |
              +------------+------------+
              |                         |
        Dashboard (Next.js)        SDK (@lavinth/*)
        - Google OAuth             - TypeScript client
        - 10-tab interface         - React hooks
        - Real-time updates        - CJS + ESM
              |                         |
              +------------+------------+
                           |
                    Express API (Port 3001)
                    55+ endpoints, dual auth
                           |
         +-----------------+------------------+
         |                 |                  |
   +-----+------+   +-----+------+   +------+------+
   | Approval   |   | Compromise |   | Transaction |
   | Scanner    |   | Detector   |   | Simulator   |
   +-----+------+   +-----+------+   +------+------+
         |                 |                  |
   +-----+------+   +-----+------+   +------+------+
   | Revocation |   |   Fund     |   |   Alert    |
   | Engine     |   |  Tracker   |   |  Manager   |
   +-----+------+   +-----+------+   +------+------+
         |                 |                  |
         +--------+--------+--------+--------+
                  |                  |
           +------+------+   +------+------+
           |  Exchange   |   |   Threat   |
           | Coordinator |   | Intelligence|
           +------+------+   +------+------+
                  |                  |
    +-------------+--------+--------+-------------+
    |              |        |        |             |
PostgreSQL     Solana    Helius   Arkham       GoPlus
 (Neon)        RPC       API      API          API
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 13+, React, TypeScript, TailwindCSS, Radix UI |
| Auth | NextAuth (Google OAuth), JWT sessions |
| Backend | Express, TypeScript, Node.js |
| Database | PostgreSQL (Neon), connection pooling |
| Blockchain | Solana Web3.js, SPL Token, Helius Enhanced API |
| Intelligence | Arkham, GoPlus, AllenHark, Phantom Blocklist, PhishDestroy |
| SDK | TypeScript, tsup (CJS + ESM), React hooks |
| Alerts | Webhooks (HMAC-SHA256), Discord embeds, email templates |

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `wallet_security_profiles` | Risk profiles per wallet | address, risk_score, risk_level, total_approvals |
| `token_approvals` | Individual delegate approvals | wallet, token_account, delegate, amount, is_malicious |
| `known_malicious_delegates` | 7,000+ drainer addresses | address, label, category, external_sources, confidence_score |
| `recovery_sessions` | Revocation tracking | wallet, status, approvals_found, revoked_count, signatures |
| `monitored_wallets` | Wallet monitoring configs | address, user_id, monitoring_level, alert_channels |

### Compromise & Alerts

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `compromise_alerts` | Detection alerts | wallet, alert_type, severity, details |
| `wallet_transactions` | Suspicious tx log | wallet, signature, counterparties, balance_change |
| `alert_subscriptions` | Notification preferences | wallet, channels, severity_filter, alert_types |
| `notification_queue` | Delivery tracking | subscription_id, channel, status, attempts |

### Fund Tracing & Recovery

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `fund_traces` | Trace sessions | source_wallet, initial_amount, status, total_nodes, total_edges |
| `fund_trace_nodes` | Graph nodes | trace_id, address, node_type, risk_level, amount_received |
| `fund_trace_edges` | Transaction edges | trace_id, from_address, to_address, amount, signature, hop |
| `recovery_reports` | Analysis reports | trace_id, total_stolen, recovery_probability |
| `freeze_requests_v2` | Exchange freeze workflow | trace_id, exchange, status, deposit_address, amount |
| `evidence_packages` | Blockchain evidence | request_id, transaction_signatures, integrity_hash |

### Intelligence

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `threat_intel_sources` | 7 data source configs | source_id, type, url, last_sync, total_addresses |
| `threat_intel_sync_log` | Sync audit trail | source_id, status, addresses_found, duration_ms |
| `address_entity_labels` | Arkham entity cache (24h TTL) | address, entity_name, entity_type |
| `malicious_domains` | 80,000+ scam domains | domain, status, external_sources |
| `known_exchanges` | 16 exchange addresses | name, address, exchange_type |
| `known_bridges` | 5+ bridge addresses | name, address, bridge_type |
| `verified_programs` | 12 safe programs | program_id, name, verified |
| `transaction_simulations` | Simulation results | wallet, risk_score, warnings, balance_changes |

---

## API Reference (55+ Endpoints)

### Wallet Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals/scan/:address` | Scan wallet for token approvals |
| GET | `/api/approvals/:address` | Get stored approvals |
| GET | `/api/security-profile/:address` | Get wallet risk profile |

### Revocation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/revocation/plan` | Create revocation plan |
| POST | `/api/revocation/build` | Build unsigned transactions |
| POST | `/api/revocation/submit` | Submit signed transactions |
| POST | `/api/revocation/emergency` | Emergency fast-track revocation |

### Recovery Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recovery/session/:sessionId` | Get session status |
| GET | `/api/recovery/history/:address` | List recovery sessions |

### Compromise Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compromise/analyze/:address` | Full compromise analysis |
| POST | `/api/compromise/monitor` | Register wallet monitoring |
| GET | `/api/compromise/monitor/:address` | Get monitoring status |
| GET | `/api/compromise/alerts/:address` | List alerts |
| POST | `/api/compromise/alerts/:alertId/acknowledge` | Acknowledge alert |
| GET | `/api/compromise/transactions/:address` | Get suspicious transactions |
| POST | `/api/report/malicious-delegate` | Report drainer address |

### Fund Tracing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/funds/trace` | Start fund trace |
| GET | `/api/funds/trace/:traceId` | Get trace status and graph |
| GET | `/api/funds/traces/:address` | List traces for wallet |
| GET | `/api/funds/report/:traceId` | Generate recovery report |

### Exchange & Freeze Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exchanges/contacts` | List exchange contacts |
| GET | `/api/exchanges/contacts/:exchangeId` | Get exchange details |
| POST | `/api/freeze-requests` | Create freeze request |
| GET | `/api/freeze-requests/pending` | List pending requests |
| GET | `/api/freeze-requests/follow-up` | Requests needing follow-up |
| GET | `/api/freeze-requests/statistics` | Success rate statistics |
| GET | `/api/freeze-requests/trace/:traceId` | Requests for a trace |
| GET | `/api/freeze-requests/:requestId` | Get request details |
| PATCH | `/api/freeze-requests/:requestId/status` | Update status |
| POST | `/api/freeze-requests/:requestId/evidence` | Generate evidence package |
| POST | `/api/freeze-requests/:requestId/email-template` | Get email template |
| POST | `/api/freeze-requests/:requestId/follow-up` | Schedule follow-up |

### Transaction Simulation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/simulate` | Full transaction simulation |
| POST | `/api/simulation/quick-check` | Fast risk assessment |
| GET | `/api/simulation/history/:walletAddress` | Simulation history |
| GET | `/api/simulation/:simulationId` | Get simulation result |

### Threat Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/threat-intel/sync` | Trigger data sync |
| GET | `/api/threat-intel/status` | Sync status and counts |
| GET | `/api/threat-intel/sources` | List all sources |
| GET | `/api/threat-intel/entity/:address` | Arkham entity lookup |
| GET | `/api/threat-intel/domain/:domain` | Domain reputation check |
| GET | `/api/threat-intel/address/:address` | Address risk check (DB + GoPlus) |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/alerts/subscribe` | Create alert subscription |
| GET | `/api/alerts/subscription/:address` | Get subscription |
| DELETE | `/api/alerts/subscription/:address` | Deactivate subscription |
| GET | `/api/alerts/history/:address` | Notification history |

### Data & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/overview` | Dashboard overview |
| GET | `/api/threat-metrics` | Real-time threat counts |
| GET | `/api/attack-patterns` | Attacker behavior analysis |
| GET | `/api/network-graph` | Transaction network data |
| GET | `/api/top-threats` | Highest-risk addresses |
| GET | `/api/dust-transactions` | Dust transaction listing |
| GET | `/api/dust-transactions/potential-dust` | Filtered dust transactions |
| GET | `/api/dust-transactions/potential-poisoning` | Poisoning attempts |
| GET | `/api/dusting-candidates` | Potential dusting targets |
| GET | `/api/data/exchanges` | Known exchanges |
| GET | `/api/data/bridges` | Known bridges |
| GET | `/api/programs/verified` | Verified safe programs |
| GET | `/api/programs/:programId` | Program details |
| GET | `/api/system-status` | System health check |
