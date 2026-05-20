import { UserRole } from '@prisma/client';
import { canReadSensitivity } from './sensitivity';

describe('canReadSensitivity', () => {
  it('low: every role can read', () => {
    for (const role of Object.values(UserRole)) {
      expect(canReadSensitivity(role, 'low')).toBe(true);
    }
  });

  it('high: only Owner + DocController can read', () => {
    expect(canReadSensitivity(UserRole.Owner, 'high')).toBe(true);
    expect(canReadSensitivity(UserRole.DocController, 'high')).toBe(true);
    expect(canReadSensitivity(UserRole.BidManager, 'high')).toBe(false);
    expect(canReadSensitivity(UserRole.Presales, 'high')).toBe(false);
    expect(canReadSensitivity(UserRole.Finance, 'high')).toBe(false);
    expect(canReadSensitivity(UserRole.Reviewer, 'high')).toBe(false);
  });

  it('medium: Owner / DocController / BidManager can read', () => {
    expect(canReadSensitivity(UserRole.Owner, 'medium')).toBe(true);
    expect(canReadSensitivity(UserRole.BidManager, 'medium')).toBe(true);
    expect(canReadSensitivity(UserRole.Reviewer, 'medium')).toBe(false);
  });

  it('unknown sensitivity class is treated as high (fail-safe)', () => {
    expect(canReadSensitivity(UserRole.Reviewer, 'highly-classified')).toBe(
      false,
    );
    expect(canReadSensitivity(UserRole.Owner, 'highly-classified')).toBe(
      true,
    );
  });
});
