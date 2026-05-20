import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { FakeUserRepository } from '../repositories/fake/fake-user.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

describe('AuthService', () => {
  const secret = 'test-secret';
  let users: FakeUserRepository;
  let jwt: JwtService;
  let audit: AuditService;
  let auditRepo: FakeAuditEventRepository;
  let svc: AuthService;

  beforeEach(async () => {
    users = new FakeUserRepository();
    jwt = new JwtService({ secret });
    auditRepo = new FakeAuditEventRepository();
    audit = new AuditService(auditRepo);
    svc = new AuthService(users, jwt, audit);
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

  it('login.success writes an audit event', async () => {
    await svc.login('owner@acme.test', 'pw-correct');
    const events = await auditRepo.findForUser(
      (await users.findByEmail('owner@acme.test'))!.id,
      'org-1',
    );
    expect(events.some((e) => e.action === 'auth.login.success')).toBe(true);
  });

  it('login.failure for a known email writes an audit event with userId=null', async () => {
    await expect(svc.login('owner@acme.test', 'wrong')).rejects.toThrow();
    // userId is nullified, so it does NOT appear under findForUser; but
    // it is recorded — assert by inspecting the repository's recent rows.
    const u = await users.findByEmail('owner@acme.test');
    const fromUser = await auditRepo.findForUser(u!.id, 'org-1');
    expect(fromUser.some((e) => e.action === 'auth.login.failure')).toBe(
      false,
    );
    // Search the repo's anonymised rows via re-record:
    const all = (
      auditRepo as unknown as {
        records: Map<string, { action: string; userId: string | null }>;
      }
    ).records;
    const failures = Array.from(all.values()).filter(
      (r) => r.action === 'auth.login.failure',
    );
    expect(failures.length).toBe(1);
    expect(failures[0].userId).toBeNull();
  });

  it('login.failure for an unknown email writes NO audit event (avoid PII leak)', async () => {
    await expect(svc.login('ghost@nope.test', 'anything')).rejects.toThrow();
    const all = (
      auditRepo as unknown as {
        records: Map<string, { action: string }>;
      }
    ).records;
    const failures = Array.from(all.values()).filter(
      (r) => r.action === 'auth.login.failure',
    );
    expect(failures).toHaveLength(0);
  });
});
