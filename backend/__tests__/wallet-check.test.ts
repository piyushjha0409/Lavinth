import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecuteQuery, mockCheckAddressGoPlus } = vi.hoisted(() => ({
  mockExecuteQuery: vi.fn(),
  mockCheckAddressGoPlus: vi.fn(),
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
  exchangeCoordinator: {
    setThreatIntel: vi.fn(),
    listPendingRequests: vi.fn().mockResolvedValue([{ id: 'pending-1' }]),
    getRequestsNeedingFollowUp: vi.fn().mockResolvedValue([{ id: 'followup-1' }]),
    getStatistics: vi.fn().mockResolvedValue({ total: 5 }),
  },
}));

vi.mock('../services/transaction-simulator', () => ({
  transactionSimulator: {},
}));

vi.mock('../services/threat-intelligence', () => ({
  threatIntelligenceService: {
    checkAddressGoPlus: mockCheckAddressGoPlus,
  },
  default: {},
}));

import request from 'supertest';
import { app } from '../fetchEndpoint';

describe('GET /api/check-wallet/:address', () => {
  beforeEach(() => {
    mockExecuteQuery.mockReset();
    mockCheckAddressGoPlus.mockReset();
  });

  it('returns 400 for invalid address format', async () => {
    const res = await request(app).get('/api/check-wallet/not-a-valid-address!!!');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('Invalid wallet address');
  });

  it('returns safe result for clean address', async () => {
    // DB: address not in known_malicious_delegates
    mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // GoPlus: not risky
    mockCheckAddressGoPlus.mockResolvedValueOnce({
      address: 'So11111111111111111111111111111111',
      isRisky: false,
      riskFlags: [],
      dataSource: 'goplus',
    });

    const res = await request(app).get('/api/check-wallet/So11111111111111111111111111111111');

    expect(res.status).toBe(200);
    expect(res.body.isFlagged).toBe(false);
    expect(res.body.riskScore).toBe(0);
    expect(res.body.message).toContain('safe');
  });

  it('returns flagged result when GoPlus detects risk', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockCheckAddressGoPlus.mockResolvedValueOnce({
      address: 'So11111111111111111111111111111111',
      isRisky: true,
      riskFlags: ['phishing_activities'],
      dataSource: 'goplus',
    });

    const res = await request(app).get('/api/check-wallet/So11111111111111111111111111111111');

    expect(res.status).toBe(200);
    expect(res.body.isFlagged).toBe(true);
    expect(res.body.riskScore).toBe(0.7);
    expect(res.body.goPlusRisk.riskFlags).toContain('phishing_activities');
  });

  it('returns flagged result when address is in local blocklist', async () => {
    mockExecuteQuery.mockResolvedValueOnce({
      rows: [{
        address: 'So11111111111111111111111111111111',
        label: 'Known Scammer',
        category: 'phishing',
        external_sources: ['phantom-blocklist'],
        confidence_score: '0.95',
      }],
      rowCount: 1,
    });
    mockCheckAddressGoPlus.mockResolvedValueOnce({
      address: 'So11111111111111111111111111111111',
      isRisky: false,
      riskFlags: [],
      dataSource: 'goplus',
    });

    const res = await request(app).get('/api/check-wallet/So11111111111111111111111111111111');

    expect(res.status).toBe(200);
    expect(res.body.isFlagged).toBe(true);
    expect(res.body.riskScore).toBe(0.95);
    expect(res.body.details.label).toBe('Known Scammer');
  });
});

describe('Freeze request route ordering', () => {
  beforeEach(() => {
    mockExecuteQuery.mockReset();
  });

  it('GET /api/freeze-requests/pending routes to pending handler, not :requestId', async () => {
    const res = await request(app).get('/api/freeze-requests/pending');

    expect(res.status).toBe(200);
    // Should return the list from exchangeCoordinator.listPendingRequests
    expect(res.body.requests).toBeDefined();
    expect(res.body.requests).toEqual([{ id: 'pending-1' }]);
  });

  it('GET /api/freeze-requests/follow-up routes to follow-up handler, not :requestId', async () => {
    const res = await request(app).get('/api/freeze-requests/follow-up');

    expect(res.status).toBe(200);
    expect(res.body.requests).toBeDefined();
    expect(res.body.requests).toEqual([{ id: 'followup-1' }]);
  });

  it('GET /api/freeze-requests/statistics routes to statistics handler, not :requestId', async () => {
    const res = await request(app).get('/api/freeze-requests/statistics');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
  });
});
