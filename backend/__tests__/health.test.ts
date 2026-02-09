import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mocks that are available in vi.mock factories
const { mockExecuteQuery } = vi.hoisted(() => ({
  mockExecuteQuery: vi.fn(),
}));

vi.mock('../db/config', () => ({
  default: { executeQuery: mockExecuteQuery },
}));

vi.mock('../db/db-utils', () => ({
  default: {
    pool: { executeQuery: mockExecuteQuery },
    getOverviewStatistics: vi.fn(),
  },
}));

vi.mock('../middlewares/validateToken', () => ({
  validateToken: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../middlewares/validateApiKey', () => ({
  validateApiKey: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../middlewares/rateLimiter', () => ({
  globalLimiter: (_req: any, _res: any, next: any) => next(),
  strictLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../validateEnv', () => ({
  validateEnv: vi.fn(),
}));

vi.mock('../processHandlers', () => ({}));

vi.mock('../services/approval-scanner', () => ({
  approvalScanner: {},
}));

vi.mock('../services/revocation-engine', () => ({
  revocationEngine: {},
}));

vi.mock('../services/compromise-detector', () => ({
  compromiseDetector: { setThreatIntel: vi.fn() },
}));

vi.mock('../services/fund-tracker', () => ({
  fundTracker: { setThreatIntel: vi.fn() },
}));

vi.mock('../services/alert-manager', () => ({
  alertManager: {},
  AlertManager: { events: { on: vi.fn(), off: vi.fn() } },
}));

vi.mock('../services/exchange-coordinator', () => ({
  exchangeCoordinator: { setThreatIntel: vi.fn() },
}));

vi.mock('../services/transaction-simulator', () => ({
  transactionSimulator: {},
}));

vi.mock('../services/threat-intelligence', () => ({
  threatIntelligenceService: {},
  default: {},
}));

import request from 'supertest';
import { app } from '../fetchEndpoint';

describe('GET /api/health', () => {
  beforeEach(() => {
    mockExecuteQuery.mockReset();
  });

  it('returns 200 when database is healthy', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.checks.database).toBe('healthy');
  });

  it('returns 503 when database is unreachable', async () => {
    mockExecuteQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database).toBe('unhealthy');
  });

  it('response includes status, timestamp, uptime, checks', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/api/health');

    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('checks');
    expect(res.body).toHaveProperty('version');
  });
});
