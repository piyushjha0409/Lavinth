import { describe, it, expect } from 'vitest';
import { validateEnv } from '../validateEnv';

describe('validateEnv – whitespace handling', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://...',
    HELIUS_API_KEYS: 'key1',
    API_KEY: 'secret',
  };

  it('throws if a required var is whitespace-only', () => {
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: '   ' })
    ).toThrow('DATABASE_URL');
  });

  it('throws if a required var is a single space', () => {
    expect(() =>
      validateEnv({ ...validEnv, API_KEY: ' ' })
    ).toThrow('API_KEY');
  });

  it('throws if a required var is tabs/newlines', () => {
    expect(() =>
      validateEnv({ ...validEnv, HELIUS_API_KEYS: '\t\n' })
    ).toThrow('HELIUS_API_KEYS');
  });

  it('accepts values with leading/trailing whitespace around real content', () => {
    expect(() =>
      validateEnv({ ...validEnv, API_KEY: '  secret  ' })
    ).not.toThrow();
  });

  it('throws if a required var is empty string', () => {
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: '' })
    ).toThrow('DATABASE_URL');
  });

  it('lists all missing vars in the error message', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: '  ', HELIUS_API_KEYS: '', API_KEY: undefined })
    ).toThrow(/DATABASE_URL.*HELIUS_API_KEYS.*API_KEY/);
  });
});
