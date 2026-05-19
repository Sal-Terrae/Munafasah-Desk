import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FakeUserRepository } from '../repositories/fake/fake-user.repository';
import { SESSION_COOKIE_NAME } from './jwt.strategy';

function makeResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

describe('AuthController (cookie session)', () => {
  const secret = 'a'.repeat(32);
  let users: FakeUserRepository;
  let jwt: JwtService;
  let svc: AuthService;
  let ctrl: AuthController;

  beforeEach(async () => {
    users = new FakeUserRepository();
    jwt = new JwtService({ secret });
    svc = new AuthService(users, jwt);
    ctrl = new AuthController(svc);
    await users.create({
      email: 'owner@acme.test',
      name: 'Owner',
      role: UserRole.Owner,
      organizationId: 'org-1',
      password: bcrypt.hashSync('pw-correct', 8),
    });
  });

  it('login sets an HttpOnly, SameSite=Lax session cookie and returns user only (no token in body)', async () => {
    const res = makeResponse();
    const result = await ctrl.login(
      { email: 'owner@acme.test', password: 'pw-correct' },
      res as never,
    );
    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [name, value, opts] = res.cookie.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE_NAME);
    expect(typeof value).toBe('string');
    expect(value.split('.').length).toBe(3); // looks like a JWT
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    expect((result as unknown as Record<string, unknown>).access_token).toBeUndefined();
    expect(result.user.email).toBe('owner@acme.test');
    expect(result.user.role).toBe(UserRole.Owner);
    expect((result.user as unknown as Record<string, unknown>).password).toBeUndefined();
  });

  it('login throws on wrong password — no cookie is set', async () => {
    const res = makeResponse();
    await expect(
      ctrl.login(
        { email: 'owner@acme.test', password: 'nope-nope-nope' },
        res as never,
      ),
    ).rejects.toThrow();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('logout clears the session cookie', () => {
    const res = makeResponse();
    ctrl.logout(res as never);
    expect(res.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, maxAge: 0 }),
    );
  });

  it('me returns the public user (no password)', async () => {
    const u = await users.findByEmail('owner@acme.test');
    const result = await ctrl.me({
      user: { userId: u!.id, organizationId: u!.organizationId },
    } as never);
    expect(result.email).toBe('owner@acme.test');
    expect((result as unknown as Record<string, unknown>).password).toBeUndefined();
  });
});
