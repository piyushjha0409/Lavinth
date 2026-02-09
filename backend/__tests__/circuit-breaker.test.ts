import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Extract and test CircuitBreaker behavior in isolation
// The class is private to threat-intelligence.ts, so we replicate its logic here for unit testing
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(threshold = 5, resetMs = 60_000) {
    this.threshold = threshold;
    this.resetMs = resetMs;
  }

  isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - this.lastFailure > this.resetMs) {
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }
}

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker(3, 1000); // 3 failures, 1s reset
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts closed', () => {
    expect(cb.isOpen()).toBe(false);
  });

  it('stays closed below threshold', () => {
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
  });

  it('opens after reaching failure threshold', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
  });

  it('auto-resets after resetMs', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(cb.isOpen()).toBe(false);
  });

  it('resets failure count on success', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    // Only 1 failure since last success, below threshold
    expect(cb.isOpen()).toBe(false);
  });

  it('stays open within resetMs window', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();

    vi.advanceTimersByTime(500); // Less than 1s
    expect(cb.isOpen()).toBe(true);
  });
});
