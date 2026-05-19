import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const r = new Reflector();
    jest
      .spyOn(r, 'getAllAndOverride')
      .mockReturnValue(undefined as unknown as UserRole[]);
    expect(
      new RolesGuard(r).canActivate(ctx({ role: UserRole.Reviewer })),
    ).toBe(true);
  });

  it('allows when the user role is in the required set', () => {
    const r = new Reflector();
    jest
      .spyOn(r, 'getAllAndOverride')
      .mockReturnValue([UserRole.Owner, UserRole.BidManager]);
    expect(
      new RolesGuard(r).canActivate(ctx({ role: UserRole.Owner })),
    ).toBe(true);
  });

  it('denies when the user role is not in the required set', () => {
    const r = new Reflector();
    jest
      .spyOn(r, 'getAllAndOverride')
      .mockReturnValue([UserRole.Owner]);
    expect(
      new RolesGuard(r).canActivate(ctx({ role: UserRole.Reviewer })),
    ).toBe(false);
  });

  it('denies when there is no authenticated user', () => {
    const r = new Reflector();
    jest
      .spyOn(r, 'getAllAndOverride')
      .mockReturnValue([UserRole.Owner]);
    expect(new RolesGuard(r).canActivate(ctx(undefined))).toBe(false);
  });
});
