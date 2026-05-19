import { IncidentService } from './incident.service';

describe('IncidentService', () => {
  it('walks detected -> reported -> resolved', () => {
    const svc = new IncidentService();
    const t0 = new Date('2026-05-19T00:00:00Z');
    const inc = svc.create('high', 'data_breach', 'lost laptop', t0);
    expect(inc.status).toBe('detected');
    const reported = svc.report(
      inc.id,
      new Date('2026-05-19T10:00:00Z'),
    );
    expect(reported.status).toBe('reported');
    expect(reported.reportedAt).toBeDefined();
    const resolved = svc.resolve(inc.id);
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toBeDefined();
  });

  it('72h rule: severe incident reported within 72h does NOT need authority notification', () => {
    const svc = new IncidentService();
    const t0 = new Date('2026-05-19T00:00:00Z');
    const inc = svc.create('critical', 'data_breach', 'x', t0);
    svc.report(inc.id, new Date('2026-05-20T00:00:00Z')); // 24h
    expect(svc.requiresAuthorityNotification(inc)).toBe(false);
  });

  it('72h rule: severe incident not reported within 72h REQUIRES notification', () => {
    const svc = new IncidentService();
    const t0 = new Date('2026-05-19T00:00:00Z');
    const inc = svc.create('critical', 'data_breach', 'x', t0);
    // Now = T0 + 80h, still not reported
    const now = new Date('2026-05-22T08:00:00Z');
    expect(svc.requiresAuthorityNotification(inc, now)).toBe(true);
  });

  it('non-severe incidents never require authority notification', () => {
    const svc = new IncidentService();
    const inc = svc.create('low', 'minor', 'x', new Date('2020-01-01'));
    expect(svc.requiresAuthorityNotification(inc, new Date('2099-01-01'))).toBe(
      false,
    );
  });
});
