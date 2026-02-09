import { describe, it, expect } from 'vitest';
import { createLavinth, Lavinth, LavinthConfig } from '../index';

describe('SDK exports', () => {
  it('createLavinth factory function is exported', () => {
    expect(typeof createLavinth).toBe('function');
  });

  it('Lavinth class is exported', () => {
    expect(typeof Lavinth).toBe('function');
  });

  it('LavinthConfig interface has apiUrl property (not baseUrl)', () => {
    // Verify the config interface accepts apiUrl
    const config: LavinthConfig = {
      apiKey: 'test-key',
      apiUrl: 'https://api.example.com',
    };
    expect(config.apiUrl).toBe('https://api.example.com');
    // Verify baseUrl is not part of the type (compile-time check)
    expect('baseUrl' in config).toBe(false);
  });
});
