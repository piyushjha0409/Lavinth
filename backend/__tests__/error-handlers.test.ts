import { describe, it, expect, vi, afterEach } from 'vitest';

describe('process error handlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('process has unhandledRejection handler registered', async () => {
    // Import the module which registers process handlers
    await import('../processHandlers');
    const listeners = process.listeners('unhandledRejection');
    expect(listeners.length).toBeGreaterThan(0);
  });

  it('process has uncaughtException handler registered', async () => {
    await import('../processHandlers');
    const listeners = process.listeners('uncaughtException');
    expect(listeners.length).toBeGreaterThan(0);
  });
});
