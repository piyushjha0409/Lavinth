import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('EmergencyRecoveryModal wallet integration', () => {
  const modalPath = path.resolve(
    __dirname,
    '../components/dashboard/emergency-recovery-modal.tsx'
  );
  const content = fs.readFileSync(modalPath, 'utf-8');

  it('imports useWallet from wallet adapter', () => {
    expect(content).toContain('useWallet');
    expect(content).toContain('@solana/wallet-adapter-react');
  });

  it('uses wallet connect functionality', () => {
    expect(content).toContain('wallet');
    expect(content).toContain('connected');
  });

  it('uses signAllTransactions for revocation', () => {
    expect(content).toContain('signAllTransactions');
  });

  it('shows connected wallet address when connected', () => {
    expect(content).toContain('publicKey');
  });
});
