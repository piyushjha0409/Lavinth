import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('WalletProvider', () => {
  const providerPath = path.resolve(__dirname, '../context/WalletProvider.tsx');

  it('WalletProvider file exists', () => {
    expect(fs.existsSync(providerPath)).toBe(true);
  });

  it('WalletProvider includes Phantom and Solflare adapters', () => {
    const content = fs.readFileSync(providerPath, 'utf-8');
    expect(content).toContain('PhantomWalletAdapter');
    expect(content).toContain('SolflareWalletAdapter');
  });

  it('WalletProvider exports a component', () => {
    const content = fs.readFileSync(providerPath, 'utf-8');
    expect(content).toContain('export');
    expect(content).toContain('WalletProvider');
  });
});
