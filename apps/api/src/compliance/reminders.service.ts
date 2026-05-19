import { Injectable } from '@nestjs/common';
import { EvidenceDoc } from './compliance.service';

export interface Notification {
  channel: 'email' | 'whatsapp';
  ref: string; // dedup/idempotency key
  message: string;
}

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

  /** WhatsApp nudge — only when the recipient explicitly opted in. */
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
}
