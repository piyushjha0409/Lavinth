/**
 * Lavinth SDK
 *
 * A comprehensive SDK for Solana wallet security:
 * - Token approval scanning and management
 * - Compromise detection and alerting
 * - Fund tracing and recovery
 * - Exchange coordination for fund freezing
 *
 * @example
 * ```typescript
 * import { Lavinth } from '@lavinth/sdk';
 *
 * const lavinth = new Lavinth({
 *   apiKey: 'your-api-key',
 *   environment: 'production',
 *   onAlert: (alert) => console.log('Security alert:', alert),
 * });
 *
 * // Scan wallet for approvals
 * const profile = await lavinth.scanWallet('your-wallet-address');
 *
 * // Check for compromise
 * const analysis = await lavinth.analyzeCompromise('your-wallet-address');
 *
 * // Start fund trace
 * const trace = await lavinth.startFundTrace('victim-wallet', 10.5);
 * ```
 */

// Main SDK class
export { Lavinth } from './lavinth';

// API Client (for advanced usage)
export { ApiClient } from './client';

// All types
export * from './types';

// Version
export const VERSION = '1.0.0';

// Convenience function to create SDK instance
import { Lavinth } from './lavinth';
import { LavinthConfig } from './types';

export function createLavinth(config: LavinthConfig): Lavinth {
  return new Lavinth(config);
}

// Default export
export default Lavinth;
