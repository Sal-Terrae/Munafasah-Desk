import { Injectable, Optional } from '@nestjs/common';
import { EvidenceDoc } from './compliance.service';
import { ConsentLedgerService } from '../pdpl/consent-ledger.service';

export interface Notification {
  channel: 'email' | 'whatsapp';
  ref: string; // dedup/idempotency key
  message: string;
}

export const WHATSAPP_CONSENT_PURPOSE = 'whatsapp_reminders';

export interface NotificationProvider {
  send(n: Notification): void;
}

/** Test/stub provider — records sends, performs no I/O. */
export class StubNotificationProvider implements NotificationProvider {
  public readonly sent: Notification[] = [];
  send(n: Notification): void {
    this.sent.push(n);
  }
}

@Injectable()
export class RemindersService {
  // Idempotency: a (channel:ref) is sent at most once per instance.
  private readonly seen = new Set<string>();

  // ConsentLedgerService is optional so the legacy unit tests (which
  // construct RemindersService with `new RemindersService()`) still work.
  // P12b code paths that need consent-gated sends should resolve via DI
  // so the ledger is injected from PdplModule.
  constructor(
    @Optional() private readonly consent?: ConsentLedgerService,
  ) {}

  /** Email reminders for docs expiring on/before `cutoff` (deduped). */
  sendExpiryReminders(
    docs: EvidenceDoc[],
    cutoff: Date,
    provider: NotificationProvider,
  ): Notification[] {
    const out: Notification[] = [];
    for (const d of docs) {
      if (
        d.state === 'archived' ||
        d.expiresAt === null ||
        d.expiresAt > cutoff
      ) {
        continue;
      }
      const key = `email:${d.id}`;
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      const n: Notification = {
        channel: 'email',
        ref: d.id,
        message: `Document ${d.id} expires on ${d.expiresAt.toISOString()}`,
      };
      provider.send(n);
      out.push(n);
    }
    return out;
  }

  /** Legacy: WhatsApp nudge with an opt-in boolean. Retained for
   *  backward compatibility; new callers should prefer
   *  `sendWhatsAppForSubject` which consults the ConsentLedger. */
  sendWhatsAppNudge(
    ref: string,
    message: string,
    optedIn: boolean,
    provider: NotificationProvider,
  ): Notification | null {
    if (!optedIn) return null;
    const key = `whatsapp:${ref}`;
    if (this.seen.has(key)) return null;
    this.seen.add(key);
    const n: Notification = { channel: 'whatsapp', ref, message };
    provider.send(n);
    return n;
  }

  /**
   * Consent-gated WhatsApp send. Refuses to send unless the
   * (subjectEmail, 'whatsapp_reminders') pair has a granted, not-
   * withdrawn event in the ConsentLedger for the tenant. Closes the
   * audit-findings.md §12 "WhatsApp consent gate" deferral.
   */
  async sendWhatsAppForSubject(
    ref: string,
    message: string,
    organizationId: string,
    subjectEmail: string,
    provider: NotificationProvider,
  ): Promise<Notification | null> {
    if (!this.consent) {
      throw new Error(
        'ConsentLedgerService not injected — wire RemindersService via DI',
      );
    }
    const allowed = await this.consent.hasActiveConsent(
      organizationId,
      subjectEmail,
      WHATSAPP_CONSENT_PURPOSE,
    );
    if (!allowed) return null;
    const key = `whatsapp:${ref}`;
    if (this.seen.has(key)) return null;
    this.seen.add(key);
    const n: Notification = { channel: 'whatsapp', ref, message };
    provider.send(n);
    return n;
  }
}
