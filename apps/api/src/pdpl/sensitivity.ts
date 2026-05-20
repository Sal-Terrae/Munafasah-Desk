import { UserRole } from '@prisma/client';

/**
 * Sensitivity-class ACL: any non-low-sensitivity document is restricted
 * to a small set of org-wide roles. Other roles get a NotFound (not a
 * 403) so the existence of a sensitive document doesn't leak.
 *
 * Owner | DocController | BidManager can read high/medium. Everyone
 * can read low. Adjust per-PRD by editing this single matrix.
 */
const READERS_BY_SENSITIVITY: Record<string, Set<UserRole>> = {
  high: new Set([UserRole.Owner, UserRole.DocController]),
  medium: new Set([
    UserRole.Owner,
    UserRole.DocController,
    UserRole.BidManager,
  ]),
  low: new Set([
    UserRole.Owner,
    UserRole.DocController,
    UserRole.BidManager,
    UserRole.Presales,
    UserRole.Finance,
    UserRole.Reviewer,
  ]),
};

export function canReadSensitivity(
  role: UserRole,
  sensitivity: string,
): boolean {
  const allowed =
    READERS_BY_SENSITIVITY[sensitivity] ?? READERS_BY_SENSITIVITY.high;
  return allowed.has(role);
}
