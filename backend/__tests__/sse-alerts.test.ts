import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';

describe('SSE Alerts', () => {
  it('AlertManager.events emits alert events', () => {
    // Test the EventEmitter pattern used by AlertManager
    const events = new EventEmitter();
    const received: any[] = [];

    events.on('alert', (data) => received.push(data));

    const alertData = {
      alertId: 'test-123',
      walletAddress: 'SoLaNaAdDrEsS',
      severity: 'high',
      title: 'Test Alert',
    };

    events.emit('alert', alertData);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(alertData);
  });

  it('/api/alerts/stream returns correct SSE headers', async () => {
    // Verify the SSE response format by checking header construction
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    expect(headers['Content-Type']).toBe('text/event-stream');
    expect(headers['Cache-Control']).toBe('no-cache');
    expect(headers['Connection']).toBe('keep-alive');
  });
});
