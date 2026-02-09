import { describe, it, expect } from 'vitest';
import { validateOrigin } from '../lib/csrf';

function makeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers,
  });
}

describe('validateOrigin', () => {
  it('accepts requests from allowed origins', () => {
    const req = makeRequest({ origin: 'https://www.lavinth.com' });
    expect(validateOrigin(req)).toBe(true);

    const req2 = makeRequest({ origin: 'http://localhost:3000' });
    expect(validateOrigin(req2)).toBe(true);
  });

  it('rejects requests from unknown origins', () => {
    const req = makeRequest({ origin: 'https://evil.com' });
    expect(validateOrigin(req)).toBe(false);
  });

  it('falls back to referer header', () => {
    const req = makeRequest({ referer: 'https://www.lavinth.com/dashboard' });
    expect(validateOrigin(req)).toBe(true);

    const reqBad = makeRequest({ referer: 'https://evil.com/page' });
    expect(validateOrigin(reqBad)).toBe(false);
  });

  it('rejects requests with no origin or referer', () => {
    const req = makeRequest({});
    expect(validateOrigin(req)).toBe(false);
  });
});
