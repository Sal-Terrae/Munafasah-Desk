import { BadRequestException } from '@nestjs/common';
import { ConsentLedgerService } from './consent-ledger.service';
import { AuditService } from '../audit/audit.service';
import { FakeConsentEventRepository } from '../repositories/fake/fake-consent-event.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

const ORG = 'org-1';

function makeSvc() {
  const consents = new FakeConsentEventRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  return { svc: new ConsentLedgerService(consents, audit), consents, auditRepo };
}

describe('ConsentLedgerService', () => {
  it('records a grant event + emits an audit row', async () => {
    const { svc, auditRepo } = makeSvc();
    const ev = await svc.record(ORG, {
      subjectEmail: 'subject@acme.test',
      purpose: 'whatsapp_reminders',
      state: 'granted',
      recordedBy: 'admin-1',
    });
    expect(ev.state).toBe('granted');
    const records = (
      auditRepo as unknown as { records: Map<string, { action: string }> }
    ).records;
    expect(
      Array.from(records.values()).some((r) => r.action === 'consent.granted'),
    ).toBe(true);
  });

  it('rejects missing/malformed inputs', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.record(ORG, {
        subjectEmail: '',
        purpose: 'x',
        state: 'granted',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.record(ORG, {
        subjectEmail: 'a@b.c',
        purpose: '',
        state: 'granted',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.record(ORG, {
        subjectEmail: 'a@b.c',
        purpose: 'x',
        state: 'invalid' as never,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('currentState returns null when no event recorded (default deny)', async () => {
    const { svc } = makeSvc();
    expect(
      await svc.currentState(ORG, 'subject@acme.test', 'whatsapp_reminders'),
    ).toBeNull();
    expect(
      await svc.hasActiveConsent(
        ORG,
        'subject@acme.test',
        'whatsapp_reminders',
      ),
    ).toBe(false);
  });

  it('currentState follows the most-recent event (grant then withdraw → withdrawn)', async () => {
    const { svc } = makeSvc();
    await svc.record(ORG, {
      subjectEmail: 'subject@acme.test',
      purpose: 'whatsapp_reminders',
      state: 'granted',
    });
    await new Promise<void>((r) => setTimeout(r, 5));
    await svc.record(ORG, {
      subjectEmail: 'subject@acme.test',
      purpose: 'whatsapp_reminders',
      state: 'withdrawn',
    });
    expect(
      await svc.currentState(ORG, 'subject@acme.test', 'whatsapp_reminders'),
    ).toBe('withdrawn');
    expect(
      await svc.hasActiveConsent(
        ORG,
        'subject@acme.test',
        'whatsapp_reminders',
      ),
    ).toBe(false);
  });

  it('is tenant-scoped — other orgs do not see events', async () => {
    const { svc } = makeSvc();
    await svc.record(ORG, {
      subjectEmail: 'subject@acme.test',
      purpose: 'whatsapp_reminders',
      state: 'granted',
    });
    expect(
      await svc.currentState(
        'org-other',
        'subject@acme.test',
        'whatsapp_reminders',
      ),
    ).toBeNull();
  });
});
