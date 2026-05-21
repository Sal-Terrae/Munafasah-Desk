import { Logger } from '@nestjs/common';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';

export interface NtfyConfig {
  /** Base URL of an ntfy.sh-compatible server (self-hosted or ntfy.sh). */
  baseUrl: string;
  /** Optional default topic if message.to is omitted. */
  defaultTopic?: string;
  /** Optional bearer token for protected topics. */
  bearerToken?: string;
  fetchImpl?: typeof fetch;
}

/**
 * ntfy.sh-compatible push driver. Topic comes from message.to (e.g.
 * 'bidready-incidents'). Subject becomes the Title header, body the
 * payload. Tags/icon/priority can be passed via payload.
 */
export class NtfyNotificationProvider implements INotificationProvider {
  readonly name = 'ntfy';
  readonly channel: NotificationChannel = 'ntfy';
  private readonly log = new Logger(NtfyNotificationProvider.name);
  private readonly doFetch: typeof fetch;

  constructor(private readonly cfg: NtfyConfig) {
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  async send(message: NotificationMessage): Promise<SentNotification> {
    const topic = message.to || this.cfg.defaultTopic;
    if (!topic) {
      throw new Error(
        'ntfy: no topic (set NOTIFICATION_NTFY_DEFAULT_TOPIC or pass message.to)',
      );
    }
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(topic)}`;
    const headers: Record<string, string> = { 'content-type': 'text/plain; charset=utf-8' };
    if (message.subject) headers['Title'] = message.subject;
    if (this.cfg.bearerToken) {
      headers['Authorization'] = `Bearer ${this.cfg.bearerToken}`;
    }
    const priority = message.payload?.priority as string | undefined;
    if (priority) headers['Priority'] = priority;
    const tags = message.payload?.tags as string[] | undefined;
    if (tags && tags.length) headers['Tags'] = tags.join(',');
    const res = await this.doFetch(url, {
      method: 'POST',
      headers,
      body: message.body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ntfy HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    this.log.log(`ntfy org=${message.organizationId} topic=${topic} ok`);
    return {
      channel: this.channel,
      to: topic,
      sentAt: new Date(),
    };
  }
}
