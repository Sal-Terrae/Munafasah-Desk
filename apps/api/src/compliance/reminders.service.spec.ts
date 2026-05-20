import {
  RemindersService,
  StubNotificationProvider,
} from './reminders.service';
import { EvidenceDoc } from './compliance.service';

const docs: EvidenceDoc[] = [
  {
    id: 'soon',
    documentType: 'legal',
    state: 'active',
    expiresAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'later',
    documentType: 'legal',
    state: 'active',
    expiresAt: new Date('2999-01-01T00:00:00Z'),
  },
  {
    id: 'archived',
    documentType: 'legal',
    state: 'archived',
    expiresAt: new Date('2026-01-01T00:00:00Z'),
  },
];

describe('RemindersService', () => {
  it('emails only non-archived docs expiring on/before cutoff', () => {
    const svc = new RemindersService();
    const p = new StubNotificationProvider();
    const sent = svc.sendExpiryReminders(
      docs,
      new Date('2026-06-01T00:00:00Z'),
      p,
    );
    expect(sent.map((n) => n.ref)).toEqual(['soon']);
    expect(p.sent).toHaveLength(1);
  });

  it('is idempotent — repeated runs do not re-send (dedup)', () => {
    const svc = new RemindersService();
    const p = new StubNotificationProvider();
    const cutoff = new Date('2026-06-01T00:00:00Z');
    svc.sendExpiryReminders(docs, cutoff, p);
    const second = svc.sendExpiryReminders(docs, cutoff, p);
    expect(second).toHaveLength(0);
    expect(p.sent).toHaveLength(1);
  });

  it('WhatsApp nudge (legacy boolean) requires explicit opt-in', () => {
    const svc = new RemindersService();
    const p = new StubNotificationProvider();
    expect(svc.sendWhatsAppNudge('t1', 'deadline', false, p)).toBeNull();
    expect(p.sent).toHaveLength(0);
    expect(svc.sendWhatsAppNudge('t1', 'deadline', true, p)).not.toBeNull();
    expect(p.sent).toHaveLength(1);
  });

  describe('sendWhatsAppForSubject (consent-gated)', () => {
    const ORG = 'org-1';
    const SUBJECT = 'subject@acme.test';

    /* eslint-disable @typescript-eslint/no-require-imports */
    function makeSvc() {
      const consents = new (require('../repositories/fake/fake-consent-event.repository')
        .FakeConsentEventRepository)();
      const audit = new (require('../audit/audit.service').AuditService)(
        new (require('../repositories/fake/fake-audit-event.repository')
          .FakeAuditEventRepository)(),
      );
      const ledger = new (require('../pdpl/consent-ledger.service')
        .ConsentLedgerService)(consents, audit);
      return {
        svc: new RemindersService(ledger),
        ledger,
      };
    }
    /* eslint-enable @typescript-eslint/no-require-imports */

    it('default-deny: no consent event → no send', async () => {
      const { svc } = makeSvc();
      const p = new StubNotificationProvider();
      const result = await svc.sendWhatsAppForSubject(
        't-1',
        'deadline',
        ORG,
        SUBJECT,
        p,
      );
      expect(result).toBeNull();
      expect(p.sent).toHaveLength(0);
    });

    it('granted consent → sends once (idempotent on ref)', async () => {
      const { svc, ledger } = makeSvc();
      await ledger.record(ORG, {
        subjectEmail: SUBJECT,
        purpose: 'whatsapp_reminders',
        state: 'granted',
      });
      const p = new StubNotificationProvider();
      const a = await svc.sendWhatsAppForSubject(
        't-1',
        'deadline',
        ORG,
        SUBJECT,
        p,
      );
      const b = await svc.sendWhatsAppForSubject(
        't-1',
        'deadline',
        ORG,
        SUBJECT,
        p,
      );
      expect(a).not.toBeNull();
      expect(b).toBeNull();
      expect(p.sent).toHaveLength(1);
    });

    it('granted → withdrawn → refuses', async () => {
      const { svc, ledger } = makeSvc();
      await ledger.record(ORG, {
        subjectEmail: SUBJECT,
        purpose: 'whatsapp_reminders',
        state: 'granted',
      });
      await new Promise<void>((r) => setTimeout(r, 5));
      await ledger.record(ORG, {
        subjectEmail: SUBJECT,
        purpose: 'whatsapp_reminders',
        state: 'withdrawn',
      });
      const p = new StubNotificationProvider();
      const result = await svc.sendWhatsAppForSubject(
        't-1',
        'deadline',
        ORG,
        SUBJECT,
        p,
      );
      expect(result).toBeNull();
      expect(p.sent).toHaveLength(0);
    });

    it('tenant-scoped: consent granted in org A does not unlock org B', async () => {
      const { svc, ledger } = makeSvc();
      await ledger.record('org-a', {
        subjectEmail: SUBJECT,
        purpose: 'whatsapp_reminders',
        state: 'granted',
      });
      const p = new StubNotificationProvider();
      const result = await svc.sendWhatsAppForSubject(
        't-1',
        'deadline',
        'org-b',
        SUBJECT,
        p,
      );
      expect(result).toBeNull();
    });
  });
});
