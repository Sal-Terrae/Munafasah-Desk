/**
 * Resolve and validate the JWT signing secret. Fail-hard on missing or
 * weak values so the API never boots with the historical
 * 'munafasah-dev-secret' fallback that the audit flagged
 * (audit-findings.md §5 / A02).
 */
export function requireJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.JWT_SECRET;
  if (!value || value.trim().length === 0) {
    throw new Error(
      'JWT_SECRET is required. Set it in the environment (Secret Manager in production).',
    );
  }
  if (value.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters (got ${value.length}).`,
    );
  }
  return value;
}
