/**
 * Validates that all required environment variables are set.
 * Call at startup before the server begins listening.
 */
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'HELIUS_API_KEYS', 'API_KEY'] as const;

export function validateEnv(env: Record<string, string | undefined> = process.env): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
