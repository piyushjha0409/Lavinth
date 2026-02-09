const ALLOWED_ORIGINS = [
  'https://www.lavinth.com',
  'https://lavinth.com',
  'http://localhost:3000',
];

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Origin header is the primary check
  if (origin) return ALLOWED_ORIGINS.includes(origin);

  // Fall back to Referer
  if (referer) {
    return ALLOWED_ORIGINS.some((o) => referer.startsWith(o));
  }

  // No origin or referer — reject
  return false;
}
