import { Logger } from '@nestjs/common';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';

export interface SlackConfig {
  /** Default incoming-webhook URL; overridable per message via to=<url>. */
  defaultWebhookUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Slack incoming-webhook driver. message.to is either an https://
 * incoming-webhook URL (per-team, per-channel) or omitted to use
 * defaultWebhookUrl. Payload uses `text` for portability; richer
 * Block Kit usage can be passed via payload.blocks.
 */
export class SlackNotificationProvider implements INotificationProvider {
  readonly name = 'slack';
  readonly channel: NotificationChannel = 'slack';
  private readonly log = new Logger(SlackNotificationProvider.name);
  private readonly doFetch: typeof fetch;

  constructor(private readonly cfg: SlackConfig) {
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  async send(message: NotificationMessage): Promise<SentNotification> {
    const url =
      message.to && message.to.startsWith('https://')
        ? message.to
        : this.cfg.defaultWebhookUrl;
    if (!url) {
      throw new Error(
        'slack: no webhook url (set NOTIFICATION_SLACK_WEBHOOK_URL or pass message.to)',
      );
    }
    const body: Record<string, unknown> = {
      text: message.subject ? `*${message.subject}*\n${message.body}` : message.body,
    };
    if (message.payload?.blocks) {
      body.blocks = message.payload.blocks;
    }
    const res = await this.doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`slack webhook HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    this.log.log(`slack org=${message.organizationId} ok`);
    return {
      channel: this.channel,
      to: this.maskWebhook(url),
      sentAt: new Date(),
    };
  }

  private maskWebhook(url: string): string {
    // Don't leak the secret-bearing path in audit/log surface.
    try {
      const u = new URL(url);
      return `${u.origin}/…`;
    } catch {
      return 'slack:webhook';
    }
  }
}
