# @lavinth/sdk

Core SDK for Lavinth - Post-Compromise Wallet Recovery Platform for Solana.

## Installation

```bash
npm install @lavinth/sdk
# or
yarn add @lavinth/sdk
# or
pnpm add @lavinth/sdk
```

## Quick Start

```typescript
import { Lavinth } from '@lavinth/sdk';

const lavinth = new Lavinth({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.lavinth.io',
});

// Get security profile
const profile = await lavinth.getSecurityProfile('WALLET_ADDRESS');
console.log('Risk Level:', profile.riskLevel);

// Check for compromise
const analysis = await lavinth.analyzeCompromise('WALLET_ADDRESS');
if (analysis.isCompromised) {
  console.log('Wallet may be compromised!');
}

// Get token approvals
const approvals = await lavinth.getApprovals('WALLET_ADDRESS');
const highRisk = approvals.filter(a => a.riskLevel === 'critical');

// Emergency revocation
if (highRisk.length > 0) {
  const result = await lavinth.emergencyRevoke('WALLET_ADDRESS');
  // Sign and submit result.transactions
}
```

## Features

### Security Profile
Monitor wallet security status and threat metrics.

```typescript
const profile = await lavinth.getSecurityProfile(walletAddress);
// Returns: { riskLevel, riskScore, threatMetrics, lastAnalysis }
```

### Compromise Detection
Analyze wallet for signs of compromise.

```typescript
const analysis = await lavinth.analyzeCompromise(walletAddress);
// Returns: { isCompromised, riskScore, indicators, alerts }
```

### Token Approvals
Scan and manage token approvals.

```typescript
// Get all approvals
const approvals = await lavinth.getApprovals(walletAddress);

// Create revocation plan
const plan = await lavinth.createRevocationPlan(walletAddress);

// Build transactions
const { sessionId, transactions } = await lavinth.buildRevocationTransactions(walletAddress);

// Emergency revoke all high-risk
const result = await lavinth.emergencyRevoke(walletAddress);
```

### Fund Tracing
Track stolen funds through the blockchain.

```typescript
// Start trace
const trace = await lavinth.startFundTrace(sourceWallet, amount, tokenMint);

// Get trace status
const status = await lavinth.getTrace(traceId);

// Generate recovery report
const report = await lavinth.generateRecoveryReport(traceId);
```

### Exchange Freeze Requests
Coordinate with exchanges to freeze stolen funds.

```typescript
// Get exchange contacts
const exchanges = await lavinth.getExchangeContacts();

// Create freeze request
const request = await lavinth.createFreezeRequest({
  traceId,
  exchangeName: 'Binance',
  depositAddress,
  depositSignature,
  amount,
  victimWallet,
});

// Generate evidence package
const evidence = await lavinth.generateEvidencePackage(
  requestId, traceId, victimWallet, victimStatement
);

// Generate email template
const email = await lavinth.generateFreezeRequestEmail(requestId);
```

## Configuration

```typescript
interface LavinthConfig {
  apiKey: string;           // Your API key
  baseUrl?: string;         // API base URL (default: https://api.lavinth.io)
  timeout?: number;         // Request timeout in ms (default: 30000)
  retries?: number;         // Number of retries (default: 3)
}
```

## Error Handling

```typescript
import { Lavinth, LavinthError } from '@lavinth/sdk';

try {
  const profile = await lavinth.getSecurityProfile(walletAddress);
} catch (error) {
  if (error instanceof LavinthError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    // Handle specific error codes
  }
}
```

### Error Codes
- `UNAUTHORIZED` - Invalid or missing API key
- `RATE_LIMITED` - Too many requests
- `NOT_FOUND` - Resource not found
- `NETWORK_ERROR` - Network connectivity issue
- `VALIDATION_ERROR` - Invalid input parameters

## Types

All types are exported from the package:

```typescript
import type {
  SecurityProfile,
  ThreatMetrics,
  TokenApproval,
  CompromiseAnalysis,
  FundTrace,
  FreezeRequest,
  // ... and more
} from '@lavinth/sdk';
```

## React Integration

For React applications, use `@lavinth/react` which provides hooks and components:

```bash
npm install @lavinth/react
```

See [@lavinth/react](../lavinth-react) for React-specific documentation.

## License

MIT
