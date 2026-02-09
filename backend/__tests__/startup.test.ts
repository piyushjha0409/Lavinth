import { describe, it, expect } from 'vitest';
import { validateEnv } from '../validateEnv';

describe('validateEnv', () => {
  it('throws if DATABASE_URL is missing', () => {
    expect(() =>
      validateEnv({ HELIUS_API_KEYS: 'key1', API_KEY: 'secret' })
    ).toThrow('DATABASE_URL');
  });

  it('throws if HELIUS_API_KEYS is missing', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgres://...', API_KEY: 'secret' })
    ).toThrow('HELIUS_API_KEYS');
  });

  it('throws if API_KEY is missing', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgres://...', HELIUS_API_KEYS: 'key1' })
    ).toThrow('API_KEY');
  });

  it('does not throw when all required env vars are set', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgres://...',
        HELIUS_API_KEYS: 'key1',
        API_KEY: 'secret',
      })
    ).not.toThrow();
  });
});
