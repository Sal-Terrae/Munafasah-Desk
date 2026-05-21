import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthorityNotificationService } from './authority-notification.service';
import { DpoContactService } from './dpo-contact.service';
import { IncidentService } from './incident.service';
import { AuditService } from '../audit/audit.service';
import { FakeDpoContactRepository } from '../repositories/fake/fake-dpo-contact.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';
import { NotificationDispatcher } from '../providers/notifications/notification-dispatcher.service';
import { ConsoleNotificationProvider } from '../providers/notifications/console.notification.provider';
import type {
  INotificationProvider,
  NotificationMessage,
  SentNotification,
} from '../providers/notifications/notification.provider.interface';

const ORG = 'org-1';

function emailDriver(outcome: 'ok' | 'fail'): INotificationProvider {
  return {
    name: 'stub-smtp',
    channel: 'email',
    async send(m: NotificationMessage): Promise<SentNotification> {
      if (outcome === 'fail') throw new Error('boom');
      return {
        channel: 'email',
        to: m.to,
        externalId: '<stub-id@local>',
        sentAt: new Date(),
      };
    },
  };
}

function makeSvc(opts: { withEmail: boolean; emailOk?: boolean }) {
  const repo = new FakeDpoContactRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  const incidents = new IncidentService();
  const dpo = new DpoContactService(repo, audit, incidents);
  const drivers: INotificationProvider[] = [new ConsoleNotificationProvider()];
  if (opts.withEmail) {
    drivers.push(emailDriver(opts.emailOk ? 'ok' : 'fail'));
  }
  const dispatcher = new NotificationDispatcher(drivers);
  const svc = new AuthorityNotificationService(dpo, incidents, audit, dispatcher);
  return { svc, dpo, incidents, audit, auditRepo, dispatcher };
}

function auditRecords(
  auditRepo: FakeAuditEventRepository,
): Array<{ action: string }> {
  return Array.from(
    (auditRepo as unknown as { records: Map<string, { action: string }> })
      .records.values(),
  );
}

async function setupOverdueIncident(svc: {
  dpo: DpoContactService;
  incidents: IncidentService;
}) {
  await svc.dpo.upsert(
    ORG,
    {
      name: 'DPO',
      email: 'dpo@example.test',
      authorityEmail: 'sdaia@example.test',
    },
    'admin-1',
  );
  const t0 = new Date('2026-05-20T00:00:00Z');
  const inc = svc.incidents.create('critical', 'data_breach', 'lost laptop', t0);
  // > 72h after detection, no report yet → overdue
  jest.useFakeTimers().setSystemTime(new Date('2026-05-23T08:00:00Z'));
  return inc;
}

describe('AuthorityNotificationService', () => {
  afterEach(() => jest.useRealTimers());

  it('delivers via SMTP driver when one is registered', async () => {
    const ctx = makeSvc({ withEmail: true, emailOk: true });
    const inc = await setupOverdueIncident(ctx);
    const r = await ctx.svc.notifyForIncident(ORG, inc.id, 'admin-1');
    expect(r.delivered).toBe(true);
    expect(r.driver).toBe('smtp');
    expect(r.externalId).toBe('<stub-id@local>');
    const events = auditRecords(ctx.auditRepo);
    // Two events: the canonical "intent" + the dispatch outcome.
    expect(
      events.some((e) => e.action === 'incident.authority_notified'),
    ).toBe(true);
    expect(
      events.some((e) => e.action === 'incident.authority_notified.dispatched'),
    ).toBe(true);
  });

  it('records dispatch_failed but does not throw when SMTP rejects', async () => {
    const ctx = makeSvc({ withEmail: true, emailOk: false });
    const inc = await setupOverdueIncident(ctx);
    const r = await ctx.svc.notifyForIncident(ORG, inc.id, 'admin-1');
    expect(r.delivered).toBe(false);
    expect(r.error).toBe('boom');
    expect(
      auditRecords(ctx.auditRepo).some(
        (e) => e.action === 'incident.authority_notified.dispatch_failed',
      ),
    ).toBe(true);
  });

  it('returns driver=none + delivered=false when no SMTP driver is registered', async () => {
    const ctx = makeSvc({ withEmail: false });
    const inc = await setupOverdueIncident(ctx);
    const r = await ctx.svc.notifyForIncident(ORG, inc.id, 'admin-1');
    expect(r.delivered).toBe(false);
    expect(r.driver).toBe('none');
    // No dispatch audit row, but the intent row is still written.
    const events = auditRecords(ctx.auditRepo);
    expect(
      events.some((e) => e.action === 'incident.authority_notified'),
    ).toBe(true);
    expect(
      events.some((e) =>
        e.action.startsWith('incident.authority_notified.dispatch'),
      ),
    ).toBe(false);
  });

  it('refuses when the incident does not require notification', async () => {
    const ctx = makeSvc({ withEmail: true, emailOk: true });
    await ctx.dpo.upsert(
      ORG,
      {
        name: 'DPO',
        email: 'dpo@example.test',
        authorityEmail: 'sdaia@example.test',
      },
      'admin-1',
    );
    const t0 = new Date('2026-05-20T00:00:00Z');
    const inc = ctx.incidents.create('low', 'minor', 'fine', t0);
    await expect(
      ctx.svc.notifyForIncident(ORG, inc.id, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFound for unknown incident id', async () => {
    const ctx = makeSvc({ withEmail: true, emailOk: true });
    await expect(
      ctx.svc.notifyForIncident(ORG, 'inc-missing', 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
