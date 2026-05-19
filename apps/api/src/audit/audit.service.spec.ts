import { AuditService } from './audit.service';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

describe('AuditService (append-only)', () => {
  it('records an audit event via create', async () => {
    const repo = new FakeAuditEventRepository();
    const svc = new AuditService(repo);
    const ev = await svc.record({
      action: 'login',
      entityType: 'User',
      entityId: 'u1',
      userId: 'u1',
      organizationId: 'org-1',
    });
    expect(ev.action).toBe('login');
    expect(ev.organizationId).toBe('org-1');
  });

  it('exposes no mutation surface (append-only)', () => {
    const svc = new AuditService(new FakeAuditEventRepository());
    expect(
      (svc as unknown as { update?: unknown }).update,
    ).toBeUndefined();
    expect(
      (svc as unknown as { delete?: unknown }).delete,
    ).toBeUndefined();
  });
});
