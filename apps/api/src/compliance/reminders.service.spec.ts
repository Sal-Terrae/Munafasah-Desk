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

  it('WhatsApp nudge requires explicit opt-in', () => {
    const svc = new RemindersService();
    const p = new StubNotificationProvider();
    expect(svc.sendWhatsAppNudge('t1', 'deadline', false, p)).toBeNull();
    expect(p.sent).toHaveLength(0);
    expect(svc.sendWhatsAppNudge('t1', 'deadline', true, p)).not.toBeNull();
    expect(p.sent).toHaveLength(1);
  });
});
