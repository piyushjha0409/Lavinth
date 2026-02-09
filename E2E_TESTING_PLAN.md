# Lavinth E2E Testing Plan

Comprehensive end-to-end testing plan covering every user-facing feature, edge case, error path, security vulnerability, and boundary condition across the platform. Tests are ordered by the natural user journey through the product, with deep edge-case coverage appended to each section.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Backend | Running at `http://localhost:3001` (`npm run dev` in `/backend`) |
| Frontend | Running at `http://localhost:3000` (`npm run dev` in `/frontend`) |
| Database | Neon PostgreSQL with all migrations applied (`schema.sql`, `migrate-phase3.ts`, `migrate-phase5.ts`, `migrate-phase6.ts`, `migrate-wallet-auth.ts`) |
| Wallet | Phantom or Solflare browser extension installed with a Solana mainnet wallet |
| Test Data | At least one Solana wallet address with known token approvals (for scanning tests) |
| Env Vars | `DATABASE_URL`, `HELIUS_API_KEYS`, `API_KEY` set in `backend/.env`; `API_BASE_URL=http://localhost:3001/api`, `API_KEY` set in `frontend/.env` |

### Useful Test Addresses

| Purpose | Address | Notes |
|---------|---------|-------|
| Active wallet with approvals | Use your own wallet or a known DeFi-active address | Needed for approval scanning |
| Known malicious address | Look up from AllenHark list or Phantom Blocklist after threat intel sync | Needed for wallet-check flagging |
| Exchange address | Any Binance/Coinbase hot wallet seeded in `known_exchanges` table | Needed for fund trace classification |

---

## Test 1: Backend Health & Infrastructure

**Goal**: Verify the backend boots, connects to the database, and responds to requests.

### 1.1 Health Endpoint
```
GET http://localhost:3001/api/health
```
- **Expected**: 200 OK with `{ status: "healthy", database: "connected", uptime: <number> }`
- **No auth required**

### 1.2 Rate Limiter Active
- Send 101 requests to `/api/health` within 15 minutes
- **Expected**: 101st request returns 429 Too Many Requests

### 1.3 Auth Rejection
```
GET http://localhost:3001/api/compromise/analyze/SomeAddress
```
- Send with no headers
- **Expected**: 401 Unauthorized
- Send with `x-access-token: wrong_value`
- **Expected**: 401 Unauthorized
- Send with `x-access-token: <correct API_KEY from .env>`
- **Expected**: 200 OK (or relevant response)

### 1.4 Health Under Database Stress
- Exhaust the database connection pool (20 max) with long-running queries, then call `/api/health`
- **Expected**: 503 with `{ status: "degraded" }` or timeout error

### 1.5 Rate Limiter Boundary Conditions
- Send exactly 100 requests to `/api/health` within 15 minutes
- **Expected**: All pass (100 is the limit, not 100+1)
- Send request 101
- **Expected**: 429
- Send 20 requests to a strict-rate-limited endpoint (e.g., `/api/approvals/scan/<address>`)
- **Expected**: All pass
- Send 21st request
- **Expected**: 429
- Verify rate limiter resets after 15-minute window

### 1.6 Auth Edge Cases
- Send `x-access-token` header with empty string
- **Expected**: 401
- Send `x-access-token` header with whitespace-only value
- **Expected**: 401
- Send `x-api-key` header with empty string
- **Expected**: 401
- Send `x-api-key` header with `lav_live_invalidbase64`
- **Expected**: 401
- Send both `x-api-key` (invalid) and `x-access-token` (valid) headers
- **Expected**: 200 (fallback to token)
- Send both `x-api-key` (valid) and `x-access-token` (invalid) headers
- **Expected**: 200 (API key takes precedence)

### 1.7 Environment Validation
- Start backend without `DATABASE_URL` → **Expected**: Startup crash with clear error
- Start backend without `HELIUS_API_KEYS` → **Expected**: Startup crash with clear error
- Start backend without `API_KEY` → **Expected**: Startup crash with clear error
- Start backend with `DATABASE_URL=""` (empty string) → **Expected**: Should fail (currently passes validation — known gap)

---

## Test 2: Landing Page

**Goal**: Verify the public-facing marketing page loads and renders correctly.

### 2.1 Page Load
- Navigate to `http://localhost:3000`
- **Expected**:
  - Navbar renders with "Launch Dashboard" or "Sign In" button
  - Hero section loads with 3D Three.js animation (rotating shield/cubes)
  - Terminal-like animation types out security initialization lines
  - "Launch Dashboard" and "Check Wallet" CTA buttons visible

### 2.2 Feature Sections
- Scroll down the page
- **Expected**:
  - Features section shows 3 cards (Compromise Detection, Risk Scoring, Preventive Measures) with hover animations
  - "How It Works" section renders
  - Security Metrics section renders
  - Footer renders with links

### 2.3 Navigation
- Click "Launch Dashboard"
  - **Expected**: Redirects to `/sign-in` (if not connected) or `/dashboard` (if wallet connected)
- Click "Check Wallet"
  - **Expected**: Navigates to `/wallet-check`

---

## Test 3: Wallet Authentication Flow

**Goal**: Verify the Solana wallet-based auth works end-to-end.

### 3.1 Unauthenticated Redirect
- Clear all cookies
- Navigate to `http://localhost:3000/dashboard`
- **Expected**: Redirected to `/sign-in`

### 3.2 Sign-In Page
- Navigate to `http://localhost:3000/sign-in`
- **Expected**:
  - Page shows a card with "Sign In" heading
  - Solana `WalletMultiButton` rendered (shows "Select Wallet" or similar)

### 3.3 Wallet Connection
- Click the wallet button and connect Phantom/Solflare
- **Expected**:
  - Wallet popup appears, user approves connection
  - `wallet_address` cookie is set (30-day expiry)
  - Automatically redirected to `/dashboard`

### 3.4 Authenticated Redirect
- While wallet is connected, navigate to `/sign-in`
- **Expected**: Redirected to `/dashboard`

### 3.5 Wallet Disconnect
- On the dashboard, disconnect wallet via the wallet button/sidebar
- **Expected**:
  - `wallet_address` cookie is cleared
  - Redirected to `/sign-in`

### 3.6 Cookie Manipulation Attacks
- Set `wallet_address` cookie to invalid base58 string (e.g., `"0x123abc"`)
  - **Expected**: Middleware rejects, redirects to `/sign-in`
- Set `wallet_address` cookie to valid base58 but wrong length (30 chars)
  - **Expected**: Middleware rejects
- Set `wallet_address` cookie to `' OR 1=1 --` (SQL injection)
  - **Expected**: Middleware regex rejects
- Set `wallet_address` cookie to `<script>alert(1)</script>` (XSS)
  - **Expected**: Middleware regex rejects
- Set `wallet_address` cookie to Unicode/emoji characters
  - **Expected**: Middleware regex rejects
- Set cookie with `max-age=0` then access `/dashboard`
  - **Expected**: Cookie expired, redirect to `/sign-in`

### 3.7 Wallet Adapter Edge Cases
- Connect wallet, then disconnect mid-connection before redirect completes
  - **Expected**: Cookie may be stale, verify cleanup
- Wallet adapter `connected=true` but `publicKey=null`
  - **Expected**: Cookie NOT set
- Connect Phantom, then switch to Solflare
  - **Expected**: Cookie updates to new address
- Deny wallet connection request
  - **Expected**: Stay on sign-in page, no cookie set
- `autoConnect=true` with wallet extension not installed
  - **Expected**: Connection fails silently, no crash

### 3.8 Multi-Tab Session Conflicts
- Disconnect wallet in tab A, then make API call in tab B
  - **Expected**: Tab B gets 401
- Connect different wallet in tab A, tab B still has old cookie
  - **Expected**: Tab B's next navigation triggers middleware, cookie mismatch detected
- Log out in tab A, immediately navigate in tab B
  - **Expected**: Middleware redirects tab B to `/sign-in`

---

## Test 4: Dashboard - Overview Tab

**Goal**: Verify the default dashboard view loads and displays data.

### 4.1 Initial Load
- Navigate to `/dashboard` (or `/dashboard?tab=overview`)
- **Expected**:
  - Loading progress bar appears briefly
  - 4 KPI cards render: Total Transactions, Total Volume, Unique Addresses, Success Rate
  - Security Overview and Network Activity summary cards render
  - Quick Actions card shows 4 shortcuts (Wallet Security, Recovery, Simulation, API Keys)

### 4.2 Refresh
- Click the refresh button in the header
- **Expected**: Data reloads, "Last updated" timestamp refreshes

### 4.3 Quick Actions
- Click each quick action card
- **Expected**: Tab switches to the corresponding tab (URL updates `?tab=` param)

### 4.4 Tab Switching Race Conditions
- Switch tabs rapidly (5+ clicks/second)
  - **Expected**: Final tab renders correctly, no stale data from intermediate tabs
- Switch tab while data is loading
  - **Expected**: Loading state clears, new tab renders correctly
- Switch away from tab and back
  - **Expected**: Data refetches if stale (>60s), otherwise uses cache

### 4.5 Error Boundary Behavior
- If a tab component throws an error
  - **Expected**: `DashboardErrorFallback` renders with error message, other tabs still work
- Click "Try again" in error fallback
  - **Expected**: Component re-mounts, data refetches
- Switch tabs after an error
  - **Expected**: Error boundary resets (resetKeys includes activeTab)

### 4.6 Query Cache Behavior
- Load data, wait 61 seconds, then interact
  - **Expected**: Data becomes stale, next query triggers refetch
- API returns 500 error
  - **Expected**: Retries once (React Query `retry: 1`), then shows error
- `refetchOnWindowFocus` is disabled
  - **Expected**: Switching browser tabs does NOT trigger refetch

---

## Test 5: Public Wallet Check (No Auth Required)

**Goal**: Verify the standalone wallet risk check tool works.

### 5.1 Page Load
- Navigate to `http://localhost:3000/wallet-check`
- **Expected**: Input field for wallet address and "Check Wallet" button visible

### 5.2 Check a Safe Wallet
- Enter a known clean wallet address and click "Check Wallet"
- **Expected**:
  - Loading state while checking
  - Result: Green "Safe" badge, no threat details
  - GoPlus risk check result displayed (if available)

### 5.3 Check a Malicious Address
- Enter a known malicious address (from `known_malicious_delegates` table)
- **Expected**:
  - Result: Red flagged badge
  - Risk score displayed with progress bar
  - Threat details shown: label, category, external sources
  - GoPlus risk flags displayed (if any)

### 5.4 Invalid Address
- Enter an invalid string (e.g., "not_a_wallet")
- **Expected**: Validation error shown (not a valid Solana address)

### 5.5 URL Parameter
- Navigate to `/wallet-check?address=<some_address>`
- **Expected**: Auto-populates the input and auto-triggers the check

### 5.6 Address Validation Edge Cases
- Empty string → **Expected**: Client-side validation error
- 10-character string → **Expected**: Invalid address error
- 100-character string → **Expected**: Invalid address error
- Valid Ethereum address (0x...) → **Expected**: Invalid Solana address error
- Address with leading/trailing whitespace → **Expected**: Trimmed and accepted, or rejected
- Address with newlines (paste artifact) → **Expected**: Trimmed and accepted
- Address with invalid base58 characters (0, O, I, l) → **Expected**: Invalid address
- Address with special characters (`@#$%^&*()`) → **Expected**: Invalid address

### 5.7 XSS via URL Parameter
- Navigate to `/wallet-check?address=<script>alert(1)</script>`
  - **Expected**: Script NOT executed, rendered as text (React escapes by default)
- Navigate to `/wallet-check?address=javascript:alert(1)`
  - **Expected**: Treated as string, not executed
- Navigate to `/wallet-check?address=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E` (URL-encoded)
  - **Expected**: Decoded and escaped, not executed

### 5.8 Backend Edge Cases (Wallet Check API)
```
GET http://localhost:3001/api/check-wallet/<address>
```
- Address with SQL injection attempt (`' OR 1=1--`)
  - **Expected**: Parameterized queries prevent injection, returns 400 or clean result
- GoPlus API timeout → **Expected**: Graceful degradation, local-only result
- GoPlus API returns 429 (rate limited) → **Expected**: Graceful degradation
- GoPlus API returns malformed JSON → **Expected**: Caught, local-only result
- `known_malicious_delegates` table is empty → **Expected**: Clean result from local, GoPlus still queried
- Address found in local DB AND GoPlus → **Expected**: Combined/merged result

---

## Test 6: Wallet Security Tab (Approval Scanning & Revocation)

**Goal**: Verify approval scanning, risk scoring, and revocation flows.

### 6.1 Tab Navigation
- Click "Wallet Security" in the sidebar or go to `/dashboard?tab=wallet-security`
- **Expected**: Tab loads with wallet address input and "Scan" button

### 6.2 Scan a DeFi-Active Wallet
- Enter a wallet address known to have token approvals
- Click "Scan"
- **Expected**:
  - Loading state during scan
  - Security score card (0-100) with risk level badge (low/medium/high/critical)
  - Summary cards: Total Approvals, High Risk, Unlimited
  - Approvals table populated with rows showing:
    - Token mint (truncated, copyable)
    - Delegate address with optional label
    - Amount (numeric or "Unlimited" badge)
    - Risk score with colored badge
    - Flags: `isKnownMalicious`, `isUnlimited`, `isNewDelegate`
    - Solscan link

### 6.3 Scan a Clean Wallet
- Enter a wallet with no delegate approvals
- **Expected**: Security score near 100, 0 approvals, "Your wallet is secure" type message

### 6.4 Emergency Revocation Flow
- After scanning a wallet with risky approvals, click "Emergency Revoke All"
- **Expected**:
  - Emergency Recovery Modal opens
  - Lists high-risk and critical approvals to revoke
  - Shows estimated fee
  - "Confirm" generates unsigned transactions
  - Wallet popup asks user to sign each transaction
  - After signing, transactions are submitted to Solana
  - Recovery session is created and tracked
  - Success/failure status displayed per approval

### 6.5 Backend Verification (Approval Scan)
```
GET http://localhost:3001/api/approvals/scan/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns `{ walletAddress, totalApprovals, approvals: [...], securityProfile: {...} }`
- Each approval has: `tokenMint`, `tokenAccount`, `delegateAddress`, `delegatedAmount`, `isUnlimited`, `riskScore`, `riskFactors`

### 6.6 Backend Verification (Security Profile)
```
GET http://localhost:3001/api/security-profile/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns cached or freshly computed profile with `riskLevel`, `securityScore`, `totalApprovals`, `highRiskApprovals`

### 6.7 Approval Scan Boundary Conditions
- Wallet with exactly 0 approvals → **Expected**: Score near 100, empty table
- Wallet with exactly 1 approval → **Expected**: Single row in table
- Wallet with exactly 20 approvals → **Expected**: Fits in one revocation transaction batch
- Wallet with 21 approvals → **Expected**: Requires 2 revocation transaction batches
- Wallet with 1000+ token accounts → **Expected**: Completes without timeout or OOM
- Token account has delegate but `delegatedAmount` is undefined → **Expected**: Handled gracefully
- Mix of Token Program and Token-2022 accounts → **Expected**: Both types scanned

### 6.8 Risk Calculation Edge Cases
- All risk factors false → **Expected**: Risk score = 0, riskLevel = "low"
- All risk factors true → **Expected**: Risk score capped at 100, riskLevel = "critical"
- Risk score exactly at 50 boundary → **Expected**: Correct risk level assignment
- `victimCount` is 0 in malicious delegates table → **Expected**: Lower risk contribution
- `reportedLosses` is null vs 0 → **Expected**: Handled without NaN

### 6.9 Revocation Edge Cases
- Emergency revoke with 0 high-risk approvals → **Expected**: Nothing to revoke, modal shows "All clear"
- `getLatestBlockhash` times out → **Expected**: Error shown to user
- Transaction size exceeds limit (too many instructions per batch) → **Expected**: Split into more batches
- User denies wallet signature → **Expected**: Error caught, remaining revocations cancelled
- User signs some but disconnects mid-batch → **Expected**: Partial success reported
- Some transactions succeed, others fail on-chain → **Expected**: Per-transaction status shown
- Blockhash expires before all transactions submitted → **Expected**: Rebuild needed

### 6.10 Helius RPC Failure Modes
- All Helius API keys rate-limited simultaneously → **Expected**: Error returned, not hung
- Helius returns invalid JSON → **Expected**: Caught, error shown
- `getParsedTokenAccountsByOwner` returns empty for existing wallet → **Expected**: 0 approvals shown
- Round-robin key selection exhausted → **Expected**: Cycle restarts or error

---

## Test 7: Transaction Simulation Tab

**Goal**: Verify pre-signing transaction analysis works.

### 7.1 Tab Load
- Navigate to `/dashboard?tab=simulation`
- **Expected**: Input fields for wallet address and serialized transaction (base64), two buttons: "Quick Check" and "Full Simulation"

### 7.2 Quick Risk Check
- Enter a wallet address and a base64-serialized Solana transaction
- Click "Quick Check"
- **Expected**:
  - Risk level displayed (safe/low/medium/high/critical)
  - Risk score (0-100)
  - Recommendation: "Safe to proceed" / "Run full simulation first" / "Review carefully" / "DO NOT SIGN"
  - Warnings list (if any)

### 7.3 Full Simulation
- Click "Full Simulation" with the same inputs
- **Expected**:
  - Tabbed results appear:
    - **Overview**: Risk score, success/fail, estimated fee, compute units
    - **Warnings**: Categorized warnings with severity (critical/high/medium/low/info)
    - **Balances**: Before/after balance changes per token
    - **Approvals**: Approval changes (new spenders, amount changes)
    - **Programs**: Invoked programs with verified/unverified status

### 7.4 Simulation History
- After running simulations, check the history section
- **Expected**: Table of past simulations with clickable rows to view details

### 7.5 Verified Programs Reference
- Expand the "Verified Programs" accordion
- **Expected**: Table of known-safe programs (Token Program, System Program, Metaplex, etc.)

### 7.6 Backend Verification
```
POST http://localhost:3001/api/simulation/simulate
Headers: x-access-token: <API_KEY>
Body: { "serializedTransaction": "<base64>", "walletAddress": "<address>" }
```
- **Expected**: Returns `{ simulationId, success, riskLevel, riskScore, warnings[], effects[], balanceChanges[], approvalChanges[], programsInvoked[], estimatedFee, computeUnits }`

```
POST http://localhost:3001/api/simulation/quick-check
Headers: x-access-token: <API_KEY>
Body: { "serializedTransaction": "<base64>" }
```
- **Expected**: Returns `{ riskLevel, riskScore, warnings[], recommendation }`

### 7.7 Simulation Input Validation
- Missing `serializedTransaction` → **Expected**: 400
- Missing `walletAddress` (for full simulation) → **Expected**: 400
- Invalid base64 string → **Expected**: 400 or descriptive error
- Valid base64 but not a valid serialized Solana transaction → **Expected**: Deserialization error
- Empty string for transaction → **Expected**: 400
- Extremely long base64 string (1MB+) → **Expected**: Handled gracefully (rejected or processed)

### 7.8 Simulation Risk Detection Edge Cases
- Transaction with 0 instructions → **Expected**: Low risk, no warnings
- Transaction with 100+ instructions → **Expected**: Completes or warns about complexity
- Transaction invoking unknown program → **Expected**: "Unverified program" warning
- Transaction invoking known malicious program → **Expected**: Critical warning
- Transaction with unlimited token approval → **Expected**: "Unlimited approval" warning
- Transaction with approval to known drainer → **Expected**: Critical "known drainer" warning
- Hidden approval in batch transaction → **Expected**: Detected and flagged
- Transaction that drains all SOL → **Expected**: "Balance will be zero" warning
- Legacy transaction vs versioned transaction → **Expected**: Both supported

### 7.9 Simulation Database Edge Cases
- `GET /api/simulation/history/:walletAddress` with no history → **Expected**: Empty array
- `GET /api/simulation/:simulationId` with invalid ID → **Expected**: 404
- Stored simulation has corrupted JSON fields → **Expected**: Graceful error
- `GET /api/simulation/alerts/:walletAddress?acknowledged=true` → **Expected**: Filters correctly
- `POST /api/simulation/alerts/:alertId/acknowledge` on already-acknowledged alert → **Expected**: Idempotent

---

## Test 8: Recovery Tab (Compromise Detection & Fund Tracing)

**Goal**: Verify compromise analysis, alert system, and fund tracing.

### 8.1 Tab Load
- Navigate to `/dashboard?tab=recovery`
- **Expected**: Wallet address input and "Analyze" button

### 8.2 Compromise Analysis
- Enter a wallet address and click "Analyze"
- **Expected**:
  - Loading state while analyzing
  - Results appear in tabbed view:
    - **Overview**: Compromised/Secure status, risk score with progress bar, alert count, recent transactions count
    - **Alerts Tab**: List of detected alerts (if any) with severity badges, "Acknowledge" buttons
    - **Transactions Tab**: Table of recent transactions with type, amount, counterparty, risk score, suspicious flag
    - **Fund Traces Tab**: Existing traces for this wallet (if any)

### 8.3 Backend Verification (Compromise Analysis)
```
GET http://localhost:3001/api/compromise/analyze/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns `{ isCompromised, riskScore, alerts[], recentTransactions[] }`
- Alerts have: `alertId`, `alertType`, `severity`, `title`, `description`
- Transactions have: `signature`, `transactionType`, `amount`, `counterparty`, `isSuspicious`, `riskScore`

### 8.4 Alert Acknowledgement
- If alerts exist, click "Acknowledge" on an alert
- **Expected**: Alert marked as acknowledged, UI updates

### 8.5 Start Fund Trace
- If the wallet shows compromise indicators, click "Start Fund Trace"
- **Expected**:
  - Dialog opens to specify initial stolen amount
  - After confirming, trace is initiated
  - New trace appears in Fund Traces tab with status "pending" or "in_progress"

### 8.6 Fund Trace Progress
- Click on an active trace or refresh
- **Expected**: Trace shows `status`, `currentDepth`, `totalNodes`, `totalEdges`, `recoveryProbability`

### 8.7 Recovery Report
- For a completed trace, click "Report"
- **Expected**:
  - Recovery Report Dialog opens with:
    - **Summary**: Total Stolen, Recovery Probability, Addresses Traced, Transactions
    - **Fund Distribution**: In Exchanges (%), In Bridges (%), Unknown (%)
    - **Exchange Deposits**: Table of identified exchange deposits (exchange name, deposit address, amount, signature)
    - **Bridge Transfers**: If applicable
    - **Recommended Actions**: Step-by-step recovery instructions

### 8.8 Backend Verification (Fund Trace)
```
POST http://localhost:3001/api/funds/trace
Headers: x-access-token: <API_KEY>
Body: { "sourceWallet": "<address>", "initialAmount": 10, "tokenMint": "So11111111111111111111111111111111" }
```
- **Expected**: Returns `{ traceId, status: "pending" }`

```
GET http://localhost:3001/api/funds/trace/<traceId>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns full trace with nodes and edges

```
GET http://localhost:3001/api/funds/report/<traceId>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns recovery report with `fundDistribution`, `exchangeDeposits`, `recoveryProbability`, `recommendations`

### 8.9 Compromise Analysis Edge Cases
- `getSignaturesForAddress` returns 0 signatures → **Expected**: No alerts, not compromised
- `getSignaturesForAddress` times out → **Expected**: Error returned gracefully
- `getBalance` fails → **Expected**: Analysis uses last known balance or errors
- Rapid drain detection: Exactly 3 outflows in 5-minute window → **Expected**: Triggers alert
- Rapid drain detection: 2 outflows in window → **Expected**: Does NOT trigger
- Transaction at exact 5-minute boundary → **Expected**: Correct inclusion/exclusion
- All transactions are suspicious → **Expected**: High risk score, multiple alerts
- Known drainer interaction with exchange deposit in same analysis → **Expected**: Multiple alert types

### 8.10 Fund Trace Edge Cases
- `sourceWallet` missing → **Expected**: 400
- `initialAmount` is 0 → **Expected**: Handled (or rejected)
- `initialAmount` is negative → **Expected**: Rejected
- `tokenMint` is invalid → **Expected**: Rejected or defaults to SOL
- Trace ID not found → **Expected**: 404
- Trace still in progress → **Expected**: Status "in_progress" with partial data
- Trace with 0 nodes (empty graph) → **Expected**: Report shows no fund flow
- Trace with 0 edges → **Expected**: Report shows no transfers
- Circular fund paths (A→B→C→A) → **Expected**: Loop detection, doesn't hang
- Fund distribution doesn't sum to initial amount → **Expected**: "Unknown" category absorbs remainder
- Division by zero in recovery probability (resolved=0) → **Expected**: Returns 0% not NaN
- Multiple concurrent traces for same wallet → **Expected**: Each gets unique traceId

### 8.11 Alert Acknowledgement Edge Cases
- Acknowledge non-existent alert ID → **Expected**: Error or no-op
- Acknowledge already-acknowledged alert → **Expected**: Idempotent
- Concurrent acknowledge requests for same alert → **Expected**: One succeeds

---

## Test 9: Freeze Requests Tab (Exchange Coordination)

**Goal**: Verify the full exchange freeze request lifecycle.

### 9.1 Tab Load
- Navigate to `/dashboard?tab=freeze-requests`
- **Expected**:
  - Statistics cards: Total Requests, Pending, Success Rate, Avg Response Time
  - Three sub-tabs: Pending Requests, Follow-up, Exchanges

### 9.2 View Exchange Contacts
- Click the "Exchanges" sub-tab
- **Expected**:
  - Table of 12+ exchange compliance contacts
  - Columns: Exchange Name, Type (CEX/DEX), Compliance Email, SLA (hours), Freeze Capable, Success Rate, Verified
  - Seeded exchanges visible: Binance, Coinbase, Kraken, OKX, Bybit, KuCoin, Jupiter, Raydium, Orca, etc.

### 9.3 Create Freeze Request
- This is typically done from the Recovery tab after a fund trace identifies exchange deposits
- Alternatively, test via backend API:
```
POST http://localhost:3001/api/freeze-requests
Headers: x-access-token: <API_KEY>
Body: {
  "traceId": "<trace_id>",
  "exchangeName": "<exchange_name>",
  "victimWallet": "<address>",
  "depositAddress": "<exchange_deposit_address>",
  "depositSignature": "<tx_signature>",
  "amount": 200,
  "tokenMint": "So11111111111111111111111111111111",
  "tokenSymbol": "SOL",
  "priority": "high"
}
```
- **Expected**: Returns `{ requestId, status: "draft" }`

### 9.4 View Pending Requests
- Click "Pending Requests" sub-tab
- **Expected**: Table of requests with columns: Request ID, Exchange, Amount, Priority (badge), Status (icon), Created, Actions

### 9.5 Generate Evidence Package
```
POST http://localhost:3001/api/freeze-requests/<requestId>/evidence
Headers: x-access-token: <API_KEY>
Body: { "traceId": "<trace_id>", "victimWallet": "<address>", "victimStatement": "My wallet was compromised on..." }
```
- **Expected**: Returns evidence package with:
  - `packageId`, `transactionSignatures`, `fundFlowSummary`, `blockchainEvidence`
  - `hashSignature` (SHA-256 integrity hash)
  - Solscan verification links

### 9.6 Generate Email Template
- Click the "Generate Email" button for a freeze request (or via API)
```
POST http://localhost:3001/api/freeze-requests/<requestId>/email-template
Headers: x-access-token: <API_KEY>
```
- **Expected**:
  - Email template dialog shows:
    - **Recipient**: Exchange compliance email
    - **Subject**: Formal freeze request subject line
    - **Body**: Professional template with incident summary, fund flow, requested actions, response deadline
    - Copy buttons for each field
  - Template references the evidence package

### 9.7 Update Request Status
- Click a status update button (e.g., "Submitted")
- **Expected**: Status updates in the table, timestamp recorded

### 9.8 Record Follow-Up
- Click "Record Follow-up" on a submitted request
- **Expected**: Follow-up count increments, next follow-up date is set

### 9.9 Follow-Up Tab
- Click "Follow-up" sub-tab
- **Expected**: Shows requests where `next_follow_up_at < now`, prompting the user to take action

### 9.10 Statistics
- Click refresh on the statistics cards
- **Expected**: Aggregated stats update: total requests, status breakdown, success rate, avg response time

### 9.11 Freeze Request Input Validation
- Missing any of 6 required fields → **Expected**: 400 Bad Request
- `amount` is 0 → **Expected**: Handled (may be rejected)
- `amount` is negative → **Expected**: Rejected
- `amount` is extremely large (BigInt overflow) → **Expected**: Handled
- Priority boundary: exactly 100 SOL → **Expected**: "critical" priority
- Priority boundary: exactly 10 SOL → **Expected**: "high" priority
- Priority boundary: exactly 1 SOL → **Expected**: "medium" priority

### 9.12 Freeze Request Lifecycle Edge Cases
- Status transition: draft → frozen (skipping submitted) → **Expected**: Allowed or rejected
- Concurrent status updates for same request → **Expected**: Last write wins
- Request not found → **Expected**: 404
- Evidence package for request with no trace → **Expected**: Error
- Email template for request with no evidence → **Expected**: Error
- Follow-up with `nextFollowUpHours: 0` → **Expected**: Immediate follow-up or rejected
- Follow-up with negative hours → **Expected**: Rejected

### 9.13 Statistics Edge Cases
- No freeze requests in database → **Expected**: All counts 0, success rate 0%
- Division by zero in success rate (0 resolved requests) → **Expected**: 0% not NaN
- Average response time with NULL values → **Expected**: Handled without NaN

### 9.14 Route Order Verification
- `GET /api/freeze-requests/pending` → **Expected**: Returns pending list (not treated as `:requestId=pending`)
- `GET /api/freeze-requests/follow-up` → **Expected**: Returns follow-up list
- `GET /api/freeze-requests/statistics` → **Expected**: Returns stats

---

## Test 10: Wallet Monitoring & Alert System

**Goal**: Verify real-time monitoring registration and alert delivery.

### 10.1 Register Wallet for Monitoring
```
POST http://localhost:3001/api/compromise/monitor
Headers: x-access-token: <API_KEY>
Body: { "walletAddress": "<address>", "monitoringLevel": "high" }
```
- **Expected**: Returns monitored wallet record with `walletAddress`, `monitoringLevel`, `baselineBalance`

### 10.2 Check Monitoring Status
```
GET http://localhost:3001/api/compromise/monitor/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns wallet monitoring config with `lastKnownBalance`, `isCompromised`, `lastActivityAt`

### 10.3 Create Alert Subscription
```
POST http://localhost:3001/api/alerts/subscribe
Headers: x-access-token: <API_KEY>
Body: {
  "walletAddress": "<address>",
  "channels": { "webhook": "https://your-webhook-url.com", "discord": "https://discord.com/api/webhooks/..." },
  "severityFilter": ["medium", "high", "critical"],
  "alertTypes": ["large_outflow", "rapid_drain", "known_drainer"]
}
```
- **Expected**: Returns subscription with `subscriptionId`, configured channels and filters

### 10.4 Get Subscription
```
GET http://localhost:3001/api/alerts/subscription/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns active subscription config

### 10.5 SSE Alert Stream
```
GET http://localhost:3001/api/alerts/stream
Headers: x-access-token: <API_KEY>
```
- **Expected**:
  - Connection stays open (Server-Sent Events)
  - Receives heartbeat comments every 30 seconds (`: heartbeat`)
  - When an alert fires, receives `event: alert\ndata: { alertId, walletAddress, severity, title }\n\n`

### 10.6 Notification History
```
GET http://localhost:3001/api/alerts/history/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns array of past notifications with `channel`, `status` (delivered/failed/retrying), `attempts`

### 10.7 Deactivate Subscription
```
DELETE http://localhost:3001/api/alerts/subscription/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: 200 OK, subscription deactivated

### 10.8 Monitoring Registration Edge Cases
- `walletAddress` missing → **Expected**: 400
- `getBalance` fails (wallet doesn't exist on-chain) → **Expected**: Error or baseline=0
- `alertChannels` is undefined vs empty object → **Expected**: Both accepted
- `monitoringLevel` is invalid string → **Expected**: Rejected or defaults
- Duplicate wallet registration → **Expected**: ON CONFLICT updates existing record
- `userId` is very long string (1000+ chars) → **Expected**: Truncated or rejected

### 10.9 Alert Subscription Edge Cases
- `walletAddress` or `channels` missing → **Expected**: 400
- `channels` object is empty `{}` → **Expected**: Accepted (no channels)
- `channels.webhook` URL is invalid → **Expected**: Accepted at subscription time, fails at delivery time
- `channels.discord` URL is invalid → **Expected**: Same
- `severityFilter` is empty array → **Expected**: No alerts delivered
- `alertTypes` is empty array → **Expected**: No alerts delivered
- Duplicate subscription → **Expected**: ON CONFLICT updates
- Delete non-existent subscription → **Expected**: 200 (idempotent)
- Delete already-deactivated subscription → **Expected**: 200 (idempotent)

### 10.10 SSE Stream Edge Cases
- Client disconnects immediately → **Expected**: Cleanup runs, no memory leak
- Client disconnects after 30s (heartbeat boundary) → **Expected**: Cleanup runs
- Client disconnects during alert emission → **Expected**: Write error caught
- 100+ concurrent SSE connections → **Expected**: No EventEmitter max listener warnings
- Heartbeat continues during periods of no alerts → **Expected**: Connection stays alive
- Backend restarts while SSE connected → **Expected**: Client reconnects
- Alert emitted but client already closed → **Expected**: Error caught, no crash
- SSE connection stays open indefinitely (hours) → **Expected**: No memory leak

### 10.11 SSE Frontend Edge Cases (use-alert-stream hook)
- API key passed in URL query string → **Known security concern**: Visible in browser history/logs
- API key changes while connected → **Expected**: Old connection stays open (no reactivity)
- Component unmounts while connected → **Expected**: useEffect cleanup disconnects
- Reconnect timer pending when disconnect called → **Expected**: clearTimeout prevents reconnect
- Alerts array capped at 100 items → **Expected**: Oldest dropped when limit reached
- Backend sends malformed SSE event → **Expected**: JSON parse fails, caught silently
- Browser backgrounds tab → **Expected**: Connection may be throttled, should recover

---

## Test 11: Threat Intelligence

**Goal**: Verify threat data sources sync and lookups work.

### 11.1 Trigger Sync
```
POST http://localhost:3001/api/threat-intel/sync
Headers: x-access-token: <API_KEY>
Body: {}
```
- **Expected**: Returns sync status, sources begin syncing (Phantom Blocklist, GoPlus, etc.)

### 11.2 Check Sync Status
```
GET http://localhost:3001/api/threat-intel/status
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns `{ totalMaliciousAddresses, totalScamDomains, sources[], lastSyncAt }`

### 11.3 List Sources
```
GET http://localhost:3001/api/threat-intel/sources
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns array of sources with `sourceId`, `type`, `lastSync`, `totalAddresses`, `status`

### 11.4 Address Lookup
```
GET http://localhost:3001/api/threat-intel/address/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Combined result from local DB + GoPlus API with risk flags

### 11.5 Domain Reputation
```
GET http://localhost:3001/api/threat-intel/domain/<domain>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns `{ domain, isKnownScam, sources[] }` or similar risk assessment

### 11.6 Entity Resolution (Arkham)
```
GET http://localhost:3001/api/threat-intel/entity/<address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns Arkham entity data (or "not configured" if ARKHAM_API_KEY is missing). Results cached for 24 hours.

### 11.7 Sync Edge Cases
- `sourceId` is provided but invalid → **Expected**: Skipped with status message
- Sync already in progress → **Expected**: Rejected with "sync in progress" message
- All source syncs fail → **Expected**: Error reported, previous data preserved
- Phantom Blocklist URL returns 404 → **Expected**: Source marked as failed
- Community list returns malformed data → **Expected**: Parse error caught
- Sync completes with 0 new addresses → **Expected**: Success with count=0

### 11.8 Domain Lookup Edge Cases
- Domain is empty string → **Expected**: 400
- Domain is 2 characters → **Expected**: 400 (too short)
- Domain with `www.` prefix → **Expected**: Handled (stripped or searched as-is)
- Domain without `www.` prefix → **Expected**: Handled
- Domain case sensitivity → **Expected**: Case-insensitive lookup

### 11.9 Entity Resolution Edge Cases
- Arkham API key not configured → **Expected**: Returns null or "not configured"
- Arkham API times out → **Expected**: Graceful timeout error
- Arkham returns 404 → **Expected**: Address not found
- Arkham returns 500 → **Expected**: Error caught, fallback response
- Cache hit → **Expected**: Cached data returned (24h TTL)
- Cache miss → **Expected**: Live API call, result cached

### 11.10 External API Timeout Concerns
- No timeout configured on GoPlus API calls → **Expected**: Should have timeout (currently can hang)
- No timeout configured on Arkham API calls → **Expected**: Should have timeout
- No timeout configured on community list fetches → **Expected**: Should have timeout
- No circuit breaker pattern → **Expected**: Repeated failures to same source don't cascade

---

## Test 12: API Key Management

**Goal**: Verify programmatic API key creation, usage, and revocation.

### 12.1 Tab Load
- Navigate to `/dashboard?tab=settings-api`
- **Expected**: API Keys management interface loads

### 12.2 Create API Key
- Click "Create API Key"
- Fill in: Name, Description, Permissions, Usage Limit, Expiration
- Submit
- **Expected**:
  - New key displayed (format: `lav_live_<base64>`) — **shown only once**
  - Prompt to copy and save the key
  - Key appears in the list with masked value

### 12.3 Use API Key
- Copy the key and use it in a request:
```
GET http://localhost:3001/api/check-wallet/<some_address>
Headers: x-api-key: lav_live_<your_key>
```
- **Expected**: 200 OK with wallet check result
- **Expected**: `current_usage` incremented in database, `last_used` updated

### 12.4 Key Permissions
- Create a key with limited permissions (e.g., only `wallet-check:read`)
- Try accessing an endpoint that requires different permissions
- **Expected**: 403 Forbidden

### 12.5 Usage Limits
- Create a key with `usageLimit: 5`
- Make 5 successful requests
- Make a 6th request
- **Expected**: 429 rate limit exceeded

### 12.6 IP Restrictions
- Create a key with `ipRestrictions: ["192.168.1.1"]`
- Make a request from a different IP
- **Expected**: 403 Forbidden (IP not allowed)

### 12.7 Key Expiration
- Create a key with a past expiration date
- Make a request with the expired key
- **Expected**: 403 Forbidden (key expired)

### 12.8 Revoke Key
- Click "Revoke" on an active key
- **Expected**:
  - Key status changes to "Revoked"
  - Subsequent API requests with this key return 401

### 12.9 View Key Details
- Click on a key in the list
- **Expected**: Shows full details: name, permissions, usage stats, creation date, last used

### 12.10 API Key Validation Edge Cases
- API key at exactly `usage_limit` → **Expected**: Next request fails with 429
- API key that expires exactly NOW (timestamp boundary) → **Expected**: Rejected
- Race condition: Concurrent requests incrementing `current_usage` → **Expected**: No double-count
- Key revoked while request is in-flight → **Expected**: Request may succeed or fail depending on timing
- `req.ip` is undefined (behind proxy) → **Expected**: IP check skipped or uses fallback
- Permissions array is empty → **Expected**: No endpoints accessible
- IP restrictions array is empty vs null → **Expected**: No restriction vs no restriction

### 12.11 API Key Creation Edge Cases
- `name` is empty string → **Expected**: 400 (client-side validation)
- `name` is 1000 characters long → **Expected**: Handled (truncated or rejected)
- `name` contains SQL injection payload → **Expected**: Parameterized query prevents injection
- `name` contains XSS payload → **Expected**: React escapes when rendering
- `expiresAt` is in the past → **Expected**: Rejected
- `usageLimit` is 0 → **Expected**: Immediately exhausted or rejected
- `usageLimit` is negative → **Expected**: Rejected

### 12.12 CSRF on API Key Routes (Security Concern)
- POST to `/api/api-keys` from different origin (no `validateOrigin`) → **Expected vulnerability**: Currently no CSRF protection on this route
- DELETE to `/api/api-keys/[id]` from different origin → **Expected vulnerability**: Same concern
- Verify backend `x-access-token` check provides some protection

---

## Test 13: Reference Data Endpoints

**Goal**: Verify exchange, bridge, and program reference data.

### 13.1 Known Exchanges
```
GET http://localhost:3001/api/data/exchanges
Headers: x-access-token: <API_KEY>
```
- **Expected**: Array of exchanges (Binance, Coinbase, Jupiter, Raydium, etc.) with `address`, `exchangeName`, `exchangeType`

### 13.2 Known Bridges
```
GET http://localhost:3001/api/data/bridges
Headers: x-access-token: <API_KEY>
```
- **Expected**: Array of bridges (Wormhole, Allbridge, Portal, deBridge, Mayan, LiFi) with `address`, `bridgeName`, `destinationChains`

### 13.3 Verified Programs
```
GET http://localhost:3001/api/programs/verified
Headers: x-access-token: <API_KEY>
```
- **Expected**: Array of verified programs (Token Program, System Program, Metaplex, etc.) with `programId`, `programName`, `isVerified`, `isAudited`

### 13.4 Check Specific Program
```
GET http://localhost:3001/api/programs/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Headers: x-access-token: <API_KEY>
```
- **Expected**: Returns program details for SPL Token Program

### 13.5 Reference Data Edge Cases
- No exchanges in database → **Expected**: Empty array
- No bridges in database → **Expected**: Empty array
- No verified programs in database → **Expected**: Empty array
- Unknown program ID → **Expected**: Returns `{ isVerified: false }` not 404
- Exchange contact with null email fields → **Expected**: Handled without crash
- Exchange lookup by address not found → **Expected**: 404

---

## Test 14: Report Malicious Address

**Goal**: Verify community-driven threat intelligence submission.

### 14.1 Submit Report
```
POST http://localhost:3001/api/report/malicious-delegate
Headers: x-access-token: <API_KEY>
Body: {
  "address": "<suspected_drainer_address>",
  "label": "Suspected Drainer",
  "category": "drainer",
  "reportedLosses": 50
}
```
- **Expected**: Address added to `known_malicious_delegates` table, returns confirmation

### 14.2 Verify Report
```
GET http://localhost:3001/api/threat-intel/address/<reported_address>
Headers: x-access-token: <API_KEY>
```
- **Expected**: Address now shows as flagged in local database

### 14.3 Report Input Validation
- Missing `address` → **Expected**: 400
- Missing `label` → **Expected**: 400
- `label` is empty string → **Expected**: 400
- `label` contains SQL injection → **Expected**: Parameterized query prevents injection
- `label` contains XSS payload → **Expected**: Stored but escaped on render
- `label` is 10,000 characters → **Expected**: Truncated or rejected
- `category` is invalid string → **Expected**: Accepted (no enum validation) or rejected
- `reportedLosses` is 0 → **Expected**: Accepted
- `reportedLosses` is negative → **Expected**: Rejected
- `reportedLosses` is extremely large → **Expected**: Handled

### 14.4 Duplicate Reports
- Report same address twice → **Expected**: `victim_count` incremented, not duplicate row
- Concurrent reports for same address → **Expected**: Race handled by ON CONFLICT

---

## Test 15: SDK Integration

**Goal**: Verify the TypeScript SDK works against the running backend.

### 15.1 SDK Initialization
```typescript
import { Lavinth } from '@lavinth/sdk';

const lavinth = new Lavinth({
  apiKey: '<your_api_key>',
  apiUrl: 'http://localhost:3001/api',
});
```

### 15.2 Wallet Scan
```typescript
const profile = await lavinth.scanWallet('<address>');
console.log(profile.overallRiskScore, profile.totalApprovals);
```
- **Expected**: Returns SecurityProfile matching backend response

### 15.3 Transaction Simulation
```typescript
const result = await lavinth.checkTransaction('<base64_tx>', '<wallet>');
console.log(result.riskLevel, result.riskScore, result.warnings);
```
- **Expected**: Returns SimulationResult

### 15.4 Quick Risk Check
```typescript
const check = await lavinth.quickRiskCheck('<base64_tx>');
console.log(check.recommendation); // 'proceed' | 'simulate_first' | 'review_carefully' | 'do_not_sign'
```

### 15.5 Compromise Detection
```typescript
const analysis = await lavinth.analyzeCompromise('<address>');
console.log(analysis.isCompromised, analysis.riskScore);
```

### 15.6 Fund Tracing
```typescript
const { traceId } = await lavinth.startFundTrace('<source_wallet>', 10);
const trace = await lavinth.getTrace(traceId);
const report = await lavinth.generateRecoveryReport(traceId);
```

### 15.7 Freeze Request Workflow
```typescript
const exchanges = await lavinth.getExchangeContacts();
const request = await lavinth.createFreezeRequest({ ... });
const email = await lavinth.generateFreezeRequestEmail(request.requestId);
```

### 15.8 Event System
```typescript
const unsubscribe = lavinth.on((event) => {
  if (event.type === 'alert') console.log('Alert:', event.data);
  if (event.type === 'error') console.log('Error:', event.data);
});
```

### 15.9 Error Handling
```typescript
try {
  await lavinth.scanWallet('invalid');
} catch (err) {
  // err instanceof LavinthError
  console.log(err.code, err.statusCode, err.message);
}
```

---

## Test 16: Cross-Cutting Concerns

### 16.1 CSRF Protection
- From a different origin (e.g., `curl` without Origin header), attempt a mutating frontend API route:
```
POST http://localhost:3000/api/funds/trace
```
- **Expected**: Blocked by CSRF validation (`validateOrigin()`)

### 16.2 Rate Limiting (Strict Endpoints)
- Send 21 requests to `/api/approvals/scan/<address>` within 15 minutes
- **Expected**: 21st request returns 429

### 16.3 Input Validation
- Send requests with:
  - Missing required fields → **Expected**: 400 Bad Request
  - Invalid wallet address format → **Expected**: 400 with descriptive error
  - SQL injection attempt in address param → **Expected**: Parameterized queries prevent injection
  - Extremely long strings → **Expected**: Handled gracefully

### 16.4 Pagination
- For endpoints supporting `limit` and `offset`:
```
GET /api/compromise/alerts/<address>?limit=5&offset=0
GET /api/compromise/alerts/<address>?limit=5&offset=5
```
- **Expected**: Paginated results, consistent ordering, no duplicates

### 16.5 Error Boundaries (Frontend)
- If a tab component crashes (e.g., malformed API response), the error boundary should catch it
- **Expected**: `DashboardErrorFallback` renders with error message, other tabs still work
- Switching tabs resets the error boundary

### 16.6 CSRF Protection Detailed Tests
- POST with missing `Origin` header → **Expected**: 403
- POST with `Origin: https://evil.com` → **Expected**: 403
- POST with `Referer: https://evil.com/attack` → **Expected**: 403
- POST with `Origin: http://localhost:3001` (wrong port) → **Expected**: 403
- POST with `Origin: https://www.lavinth.com` → **Expected**: Allowed
- POST with `Origin: https://lavinth.com` (no www) → **Known gap**: May be blocked (only www in allowlist)
- POST with both `Origin` and `Referer` → **Expected**: Uses `Origin` (primary)
- POST with only `Referer: http://localhost:3000/dashboard` → **Expected**: Allowed (falls back to Referer)

### 16.7 CSRF Protection Gaps (Routes Without validateOrigin)
- `POST /api/api-keys` → **No CSRF protection** - Attacker could create API keys
- `DELETE /api/api-keys/[id]` → **No CSRF protection** - Attacker could revoke keys
- `POST /api/freeze-requests` (frontend route) → Verify CSRF status
- Mitigation: Backend `x-access-token` requirement provides partial protection

### 16.8 Pagination Edge Cases
- `limit=0` → **Expected**: Returns default (10)
- `limit=-1` → **Expected**: Returns default (10)
- `limit=100000` → **Expected**: Capped to max (10000)
- `limit=NaN` → **Expected**: Returns default (10)
- `limit='abc'` → **Expected**: Returns default (10)
- `offset=-1` → **Expected**: Returns 0
- `offset=NaN` → **Expected**: Returns 0
- `offset` extremely large → **Expected**: Empty results, no error

### 16.9 Frontend Error Boundaries Coverage
- Error in `OverviewTab` → **Expected**: Caught by ErrorBoundary
- Error in `WalletSecurityTab` → **Expected**: Caught
- Error in `SimulationTab` → **Expected**: Caught
- Error in `RecoveryTab` → **Expected**: Caught
- Error in `FreezeRequestsTab` → **Expected**: Caught
- Error in `SettingsApiTab` → **Expected**: Caught
- Error in `DashboardLayout` (NOT wrapped) → **Expected**: Crashes whole page
- Error in `WalletProvider` (NOT wrapped) → **Expected**: Crashes entire app
- Error in `QueryProvider` (NOT wrapped) → **Expected**: Crashes entire app
- Error in `/wallet-check` page (NOT wrapped) → **Expected**: Crashes page
- Error in `/sign-in` page (NOT wrapped) → **Expected**: Crashes page

### 16.10 Backend Proxy Error Handling (Frontend API Routes)
- Backend takes >30s to respond → **Expected**: Frontend shows timeout error
- Backend returns 502 Bad Gateway → **Expected**: Frontend shows generic error
- Backend returns 503 Service Unavailable → **Expected**: Frontend shows generic error
- Backend returns non-JSON (HTML error page) → **Expected**: `response.json()` caught, shows error
- Backend returns empty response body → **Expected**: Caught, shows error
- `API_BASE_URL` env var is undefined → **Expected**: Fetch fails, 500 error
- `API_KEY` env var is undefined → **Expected**: Backend returns 401, forwarded

### 16.11 Frontend Fetch Timeout Concern
- No explicit timeout configured on React Query fetches → **Known gap**: Requests can hang indefinitely
- Backend hangs → Frontend shows loading spinner forever

---

## Test 17: Security & Penetration Testing

**Goal**: Verify the platform is resilient to common web attacks.

### 17.1 XSS Attack Vectors
- Wallet address input: `<script>alert(1)</script>` → **Expected**: React escapes, no execution
- API key name: `<img src=x onerror=alert(1)>` → **Expected**: React escapes on render
- Victim statement in evidence: `<svg onload=alert(1)>` → **Expected**: Stored but escaped on render
- Malicious delegate label: `javascript:alert(1)` → **Expected**: Stored but never used as URL
- Verify NO usage of `dangerouslySetInnerHTML` in codebase

### 17.2 SQL Injection Vectors
- All wallet address params use parameterized queries (`$1`, `$2`) → **Expected**: No injection possible
- API key values hashed before query → **Expected**: No injection
- Trace IDs, session IDs, request IDs use parameterized queries → **Expected**: No injection
- Label and description fields use parameterized queries → **Expected**: No injection

### 17.3 Authentication Bypass Attempts
- Access backend API with no auth headers → **Expected**: 401 on all protected routes
- Access backend API with `x-access-token: null` → **Expected**: 401
- Access backend API with `x-access-token: undefined` → **Expected**: 401
- Access frontend `/dashboard` with manually crafted cookie → **Expected**: Cookie regex validates
- Access frontend API routes with missing cookie → **Expected**: 401

### 17.4 Rate Limiting Bypass Attempts
- Send all 100 requests simultaneously (burst) → **Expected**: Correctly counted
- Verify rate limiting is per-IP, not bypassable via different User-Agent
- Verify rate limiter state survives server restart (or doesn't — document behavior)

### 17.5 Data Leakage
- Error messages don't expose stack traces in production → **Expected**: Generic error messages
- API key creation endpoint returns key only once → **Expected**: Subsequent GETs show masked key
- Database connection string not exposed in error responses → **Expected**: Internal errors sanitized

---

## Test 18: Database & Infrastructure Edge Cases

**Goal**: Verify the system handles infrastructure failures gracefully.

### 18.1 Database Connection Pool
- Pool max is 20 connections
- 21 concurrent database queries → **Expected**: 21st waits or fails with timeout
- Connection idle timeout (10s) triggers while query running → **Expected**: Query completes
- Statement timeout (30s) exceeded → **Expected**: Query killed, error returned
- Database server restarts → **Expected**: Pool reconnects automatically

### 18.2 Database Retry Logic
- `CustomPool.executeQuery` retries 3 times with exponential backoff
- First attempt fails, second succeeds → **Expected**: Transparent to caller
- All 3 attempts fail → **Expected**: Last error thrown
- Backoff timing: 200ms, 800ms, 3200ms (exponential) → **Expected**: Delays are correct

### 18.3 Concurrent Write Race Conditions
- Multiple approval scans for same wallet → **Expected**: No duplicate DB inserts (ON CONFLICT)
- Concurrent API key usage increments → **Expected**: Accurate count (may need atomic increment)
- Concurrent freeze request status updates → **Expected**: Last write wins, no corruption
- Concurrent alert subscription updates → **Expected**: ON CONFLICT handles
- Concurrent malicious address reports → **Expected**: Victim count correctly incremented

### 18.4 Memory & Performance Concerns
- Wallet with 10,000 token approvals → **Expected**: Completes without OOM
- Fund trace with 1000+ hops → **Expected**: Max depth enforced, doesn't loop forever
- 100+ concurrent SSE connections → **Expected**: No EventEmitter max listeners warning
- Threat intelligence sync with 100K+ addresses → **Expected**: Batched inserts, no OOM
- Transaction history with 100K+ signatures → **Expected**: Paginated, not all loaded at once

---

## Ideal User Flow: Complete Recovery Scenario

This is the full end-to-end happy path for a user whose wallet has been compromised.

### Phase 1: Discovery (0-2 minutes)

1. **User visits Lavinth** → lands on the marketing homepage
2. **Connects wallet** → clicks "Launch Dashboard", connects Phantom on `/sign-in`
3. **Scans wallet** → goes to Wallet Security tab, enters compromised wallet, clicks "Scan"
4. **Sees danger** → security score is 15/100 (critical), 12 active approvals, 4 are high-risk (known drainer delegates), 2 are unlimited

### Phase 2: Emergency Response (2-5 minutes)

5. **Emergency revoke** → clicks "Emergency Revoke All", modal shows 4 critical + 2 high-risk approvals
6. **Signs transactions** → Phantom prompts for 1-2 transaction signatures (batched), user approves
7. **Revocations confirmed** → dashboard shows "6 of 6 approvals revoked", recovery session created
8. **Attacker access cut off** → no more delegate authority to drain remaining tokens

### Phase 3: Compromise Analysis (5-10 minutes)

9. **Switches to Recovery tab** → enters compromised wallet, clicks "Analyze"
10. **Compromise confirmed** → status shows "COMPROMISED", risk score 85, 5 alerts generated
11. **Reviews alerts** → sees "Large Outflow Detected (450 SOL)", "Rapid Drain Pattern (8 txs in 3 min)", "Known Drainer Interaction"
12. **Reviews transactions** → table shows suspicious outbound transfers with counterparty addresses flagged as drainer/exchange/intermediate

### Phase 4: Fund Tracing (10-20 minutes)

13. **Starts fund trace** → clicks "Start Fund Trace", enters 450 SOL as stolen amount
14. **Trace runs** → status moves from "pending" to "in_progress", depth increases as hops are discovered
15. **Trace completes** → graph shows:
    - 200 SOL → Intermediary A → Binance Hot Wallet (exchange)
    - 200 SOL → Intermediary B → Wormhole Bridge
    - 50 SOL → Known Drainer Pool
16. **Generates recovery report** → clicks "Report":
    - Total stolen: 450 SOL
    - In exchanges: 200 SOL (70% recovery probability)
    - In bridges: 200 SOL (10% recovery probability)
    - In drainer: 50 SOL (0% recovery probability)
    - Overall recovery probability: ~36%
    - **Recommended action: File freeze request at Binance**

### Phase 5: Exchange Coordination (20-30 minutes)

17. **Switches to Freeze Requests tab** → views exchange contacts
18. **Creates freeze request** → for the 200 SOL identified at Binance, creates request with high priority
19. **Generates evidence package** → system compiles all transaction signatures, fund flow, block hashes, Solscan links, and SHA-256 integrity hash
20. **Generates email template** → clicks "Generate Email", gets a professional email pre-addressed to Binance Compliance Team with:
    - Incident summary (wallet address, date, amount)
    - Complete fund flow (victim → intermediary → exchange deposit with signatures)
    - Requested actions (freeze account, preserve records)
    - Evidence package reference
    - Response deadline (24 hours per Binance SLA)
21. **User copies and sends the email** → Lavinth doesn't send it; the user sends it from their own email
22. **Marks status as "Submitted"** → request status updates in the dashboard

### Phase 6: Ongoing Monitoring (Continuous)

23. **Sets up monitoring** → registers wallet for "high" monitoring level
24. **Configures alerts** → subscribes to Discord + webhook notifications for medium/high/critical severity
25. **Tracks freeze request** → updates status as exchange responds (acknowledged → under review → frozen)
26. **Records follow-ups** → if no response in 24 hours, follow-up tab prompts the user to send a reminder
27. **Resolution** → when exchange freezes the funds, user updates status to "frozen" and works with law enforcement for recovery

### Phase 7: Prevention (Ongoing)

28. **Transaction simulation** → before signing any future transaction, user pastes the base64 in the Simulation tab
29. **Quick check first** → gets instant risk assessment
30. **Full simulation if needed** → sees exactly what the transaction will do to their balances, approvals, and authorities
31. **SDK integration** → if user is a developer, integrates `@lavinth/sdk` into their dApp to auto-scan wallets and simulate transactions for all users

---

## Regression Checklist

After any code change, verify these critical paths still work:

- [ ] Backend starts without errors (`npm run dev`)
- [ ] `/api/health` returns 200
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Wallet connection → cookie → dashboard redirect works
- [ ] Wallet disconnect → cookie cleared → sign-in redirect works
- [ ] Approval scan returns results for active wallets
- [ ] Emergency revocation generates valid unsigned transactions
- [ ] Compromise analysis returns alerts and transactions
- [ ] Fund trace initiates and completes
- [ ] Recovery report calculates probabilities
- [ ] Freeze request can be created
- [ ] Evidence package generates with integrity hash
- [ ] Email template generates with exchange-specific content
- [ ] Transaction simulation returns risk assessment
- [ ] API key creation returns key and key works in subsequent requests
- [ ] Threat intel sync pulls from at least one source
- [ ] SSE alert stream connects and receives heartbeats
- [ ] Rate limiters trigger at configured thresholds
- [ ] Auth rejects invalid tokens and keys
- [ ] Frontend error boundaries catch component crashes without killing the app
- [ ] CSRF protection blocks cross-origin mutating requests
- [ ] Pagination returns correct subsets with no duplicates
- [ ] No XSS execution from user-controlled input

---

## Known Gaps & Security Concerns

Issues identified during the audit that should be tracked separately:

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 1 | ~~**P0**~~ | CSRF | ~~`/api/api-keys` POST route lacked `validateOrigin` check~~ — **FIXED**: Added `validateOrigin` to POST handler |
| 2 | ~~**P0**~~ | Security | ~~API key exposed in SSE URL query string~~ — **FIXED**: SSE now proxied through `/api/alerts/stream` server-side route |
| 3 | ~~**P1**~~ | CSRF | ~~`https://lavinth.com` (no www) not in CSRF allowlist~~ — **FIXED**: Added to `ALLOWED_ORIGINS` |
| 4 | ~~**P1**~~ | Reliability | ~~No timeout on external API calls~~ — **FIXED**: Added `fetchWithTimeout` (15s API, 30s sync) to `threat-intelligence.ts` and `alert-manager.ts` (10s webhooks) |
| 5 | ~~**P1**~~ | Reliability | ~~No explicit fetch timeout in React Query~~ — **FIXED**: Added 30s `AbortSignal.timeout` in `use-api.ts` `fetchJson` |
| 6 | ~~**P1**~~ | Frontend | ~~No ErrorBoundary wrapping root layout providers~~ — **FIXED**: Added `RootErrorBoundary` wrapping all providers in `layout.tsx` |
| 7 | ~~**P1**~~ | Frontend | ~~`/wallet-check` and `/sign-in` pages have no ErrorBoundary~~ — **FIXED**: Added `ErrorBoundary` to both pages |
| 8 | ~~**P2**~~ | Validation | ~~Empty string passes env validation for required vars~~ — **FIXED**: Added `.trim()` check in `validateEnv.ts` |
| 9 | ~~**P2**~~ | Performance | ~~No pagination on several list endpoints (can return unbounded rows)~~ — **FIXED**: Added `sanitizeLimit` caps to 11 unbounded endpoints in `fetchEndpoint.ts` |
| 10 | ~~**P2**~~ | Memory | ~~No max connection limit on SSE streams~~ — **FIXED**: Added connection counter with max 100 limit on `/api/alerts/stream` |
| 11 | ~~**P2**~~ | Performance | ~~No circuit breaker pattern for external API dependencies~~ — **FIXED**: Added `CircuitBreaker` class (5 failures → 60s open) for GoPlus, Arkham, and Helius APIs |
| 12 | ~~**P2**~~ | Performance | ~~No caching for expensive external API lookups (GoPlus, Arkham)~~ — **FIXED**: Added in-memory TTL cache (5min, max 500 entries) for GoPlus; Arkham already had DB cache |
| 13 | ~~**P2**~~ | Concurrency | ~~Race condition in concurrent API key usage increment~~ — **FIXED**: Combined usage check + increment into single atomic SQL UPDATE with `WHERE current_usage < usage_limit` |
| 14 | ~~**P3**~~ | UX | ~~No rate-limit feedback on frontend (user sees loading forever)~~ — **FIXED**: Added 429 detection with user-friendly "Rate limit reached" messages in `use-api.ts`, `wallet-check/page.tsx`, `wallet-check-modal.tsx`, `dashboard/page.tsx`, and `error-fallback.tsx` |
