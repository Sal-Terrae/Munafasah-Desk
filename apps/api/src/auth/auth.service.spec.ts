import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { FakeUserRepository } from '../repositories/fake/fake-user.repository';

describe('AuthService', () => {
  const secret = 'test-secret';
  let users: FakeUserRepository;
  let jwt: JwtService;
  let svc: AuthService;

  beforeEach(async () => {
    users = new FakeUserRepository();
    jwt = new JwtService({ secret });
    svc = new AuthService(users, jwt);
    await users.create({
      email: 'owner@acme.test',
      name: 'Owner',
      role: UserRole.Owner,
      organizationId: 'org-1',
      password: bcrypt.hashSync('pw-correct', 8),
    });
  });

  it('validateUser returns the user for a correct password', async () => {
    const u = await svc.validateUser('owner@acme.test', 'pw-correct');
    expect(u).not.toBeNull();
    expect(u!.email).toBe('owner@acme.test');
  });

  it('validateUser returns null for a wrong password', async () => {
    expect(await svc.validateUser('owner@acme.test', 'nope')).toBeNull();
  });

  it('validateUser returns null for an unknown user', async () => {
    expect(await svc.validateUser('ghost@acme.test', 'x')).toBeNull();
  });

  it('login issues a verifiable JWT carrying sub/org/role', async () => {
    const { access_token } = await svc.login('owner@acme.test', 'pw-correct');
    const decoded = jwt.verify<{
      sub: string;
      organizationId: string;
      role: string;
    }>(access_token, { secret });
    expect(decoded.organizationId).toBe('org-1');
    expect(decoded.role).toBe(UserRole.Owner);
    expect(typeof decoded.sub).toBe('string');
  });

  it('login throws on bad credentials', async () => {
    await expect(svc.login('owner@acme.test', 'bad')).rejects.toThrow();
  });
});
