import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
const { mockExecuteQuery } = vi.hoisted(() => ({
  mockExecuteQuery: vi.fn(),
}));

vi.mock('../db/config', () => ({
  default: { executeQuery: mockExecuteQuery },
}));

vi.mock('../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { validateApiKey } from '../middlewares/validateApiKey';

const VALID_TOKEN = 'test-server-token';

function makeMockReqRes(headers: Record<string, string> = {}) {
  const req = {
    headers,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

function makeValidApiKeyRow(overrides: Record<string, any> = {}) {
  return {
    id: 'key-1',
    key: 'hashed',
    is_active: true,
    expires_at: null,
    permissions: ['wallet-check:read'],
    usage_limit: 100,
    current_usage: 50,
    ip_restrictions: [],
    created_at: new Date(),
    ...overrides,
  };
}

describe('validateApiKey – dual auth flow', () => {
  beforeEach(() => {
    mockExecuteQuery.mockReset();
    process.env.API_KEY = VALID_TOKEN;
  });

  it('returns 401 when no api key or token provided', async () => {
    const { req, res, next } = makeMockReqRes({});
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No API key or token provided' })
    );
  });

  it('accepts valid x-access-token and sets authMethod to token', async () => {
    const { req, res, next } = makeMockReqRes({ 'x-access-token': VALID_TOKEN });
    await validateApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.authMethod).toBe('token');
    // Should NOT hit the database at all
    expect(mockExecuteQuery).not.toHaveBeenCalled();
  });

  it('rejects invalid x-access-token with 401', async () => {
    const { req, res, next } = makeMockReqRes({ 'x-access-token': 'wrong-token' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid token' })
    );
  });

  it('token takes priority over api key when both provided', async () => {
    const { req, res, next } = makeMockReqRes({
      'x-access-token': VALID_TOKEN,
      'x-api-key': 'some-api-key',
    });
    await validateApiKey(req, res, next);

    // Token wins — no DB lookup
    expect(next).toHaveBeenCalled();
    expect(req.authMethod).toBe('token');
    expect(mockExecuteQuery).not.toHaveBeenCalled();
  });

  it('invalid token rejects even if valid api key is also present', async () => {
    const { req, res, next } = makeMockReqRes({
      'x-access-token': 'wrong-token',
      'x-api-key': 'valid-api-key',
    });
    await validateApiKey(req, res, next);

    // Token is checked first and fails — no fallback to api key
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockExecuteQuery).not.toHaveBeenCalled();
  });

  it('rejects API key not found in DB with 401', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'unknown-key' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects inactive API key with 403', async () => {
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [makeValidApiKeyRow({ is_active: false })],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'inactive-key' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects expired API key with 403', async () => {
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [makeValidApiKeyRow({ expires_at: new Date('2020-01-01') })],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'expired-key' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects API key without required permission with 403', async () => {
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [makeValidApiKeyRow({ permissions: ['other:read'] })],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'wrong-perms' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects API key from non-allowed IP with 403', async () => {
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [makeValidApiKeyRow({ ip_restrictions: ['10.0.0.1'] })],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'ip-restricted' });
    await validateApiKey(req, res, next);

    // req.ip is 127.0.0.1 but restriction requires 10.0.0.1
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 on database error', async () => {
    mockExecuteQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'any-key' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('validateApiKey – atomic usage increment', () => {
  beforeEach(() => {
    mockExecuteQuery.mockReset();
  });

  it('rejects when atomic UPDATE returns 0 rows (limit exceeded)', async () => {
    // First query: find the API key
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'key-1',
        key: 'hashed',
        is_active: true,
        expires_at: null,
        permissions: ['wallet-check:read'],
        usage_limit: 100,
        current_usage: 100,
        ip_restrictions: [],
        created_at: new Date(),
      }],
    });

    // Second query: atomic UPDATE returns 0 rows (usage_limit reached)
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 0,
      rows: [],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'test-key' });
    await validateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Usage limit exceeded' })
    );
  });

  it('succeeds when atomic UPDATE returns a row', async () => {
    // First query: find the API key
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'key-1',
        key: 'hashed',
        is_active: true,
        expires_at: null,
        permissions: ['wallet-check:read'],
        usage_limit: 100,
        current_usage: 50,
        ip_restrictions: [],
        created_at: new Date(),
      }],
    });

    // Second query: atomic UPDATE succeeds
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ current_usage: 51 }],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'test-key' });
    await validateApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.apiKeyDoc.current_usage).toBe(51);
  });

  it('succeeds when usage_limit is null (unlimited)', async () => {
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'key-1',
        key: 'hashed',
        is_active: true,
        expires_at: null,
        permissions: ['wallet-check:read'],
        usage_limit: null,
        current_usage: 9999,
        ip_restrictions: [],
        created_at: new Date(),
      }],
    });

    // Atomic UPDATE with NULL usage_limit always succeeds
    mockExecuteQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ current_usage: 10000 }],
    });

    const { req, res, next } = makeMockReqRes({ 'x-api-key': 'test-key' });
    await validateApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
