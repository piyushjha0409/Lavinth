import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB before importing service
vi.mock('../db/config', () => ({
  default: { executeQuery: vi.fn() },
}));

vi.mock('../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Disable auto-sync timer
vi.stubEnv('THREAT_INTEL_AUTO_SYNC', 'false');
vi.stubEnv('HELIUS_API_KEYS', 'test-helius-key');

import { ThreatIntelligenceService } from '../services/threat-intelligence';

describe('GoPlus cache in ThreatIntelligenceService', () => {
  let service: ThreatIntelligenceService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    service = new ThreatIntelligenceService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mockGoPlusResponse(isRisky: boolean, flags: string[] = []) {
    const result: Record<string, string> = {};
    for (const flag of flags) {
      result[flag] = '1';
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result }),
    });
  }

  it('calls GoPlus API on first lookup', async () => {
    mockGoPlusResponse(false);

    const result = await service.checkAddressGoPlus('SomeAddress111111111111111111111111');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.isRisky).toBe(false);
    expect(result.dataSource).toBe('goplus');
  });

  it('returns cached result on second lookup within TTL', async () => {
    mockGoPlusResponse(true, ['phishing_activities']);

    // First call hits API
    const result1 = await service.checkAddressGoPlus('SomeAddress111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result1.isRisky).toBe(true);

    // Second call should use cache
    const result2 = await service.checkAddressGoPlus('SomeAddress111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1 — no new fetch
    expect(result2.isRisky).toBe(true);
    expect(result2.riskFlags).toContain('phishing_activities');
  });

  it('re-fetches after TTL expires', async () => {
    mockGoPlusResponse(true, ['cybercrime']);

    await service.checkAddressGoPlus('SomeAddress111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past 5-minute TTL
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    mockGoPlusResponse(false);
    const result = await service.checkAddressGoPlus('SomeAddress111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(2); // New fetch after TTL
    expect(result.isRisky).toBe(false);
  });

  it('does not cache failed API calls', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result1 = await service.checkAddressGoPlus('SomeAddress111111111111111111111111');
    expect(result1.isRisky).toBe(false);

    // Second call should try the API again since failure wasn't cached
    mockGoPlusResponse(true, ['money_laundering']);
    const result2 = await service.checkAddressGoPlus('SomeAddress111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result2.isRisky).toBe(true);
  });

  it('skips API call when circuit breaker is open', async () => {
    // Trigger 5 failures to open circuit
    for (let i = 0; i < 5; i++) {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await service.checkAddressGoPlus(`Address${i}11111111111111111111111111`);
    }

    expect(mockFetch).toHaveBeenCalledTimes(5);

    // 6th call should be skipped (circuit open)
    const result = await service.checkAddressGoPlus('Address511111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(5); // No new fetch
    expect(result.isRisky).toBe(false);
  });

  it('resumes API calls after circuit breaker reset period', async () => {
    // Open circuit
    for (let i = 0; i < 5; i++) {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await service.checkAddressGoPlus(`Address${i}11111111111111111111111111`);
    }

    // Advance past 60s reset
    vi.advanceTimersByTime(61_000);

    mockGoPlusResponse(false);
    const result = await service.checkAddressGoPlus('Address611111111111111111111111111');
    expect(mockFetch).toHaveBeenCalledTimes(6); // New fetch after reset
    expect(result.isRisky).toBe(false);
  });
});
