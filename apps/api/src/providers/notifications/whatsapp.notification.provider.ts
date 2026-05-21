import { Logger } from '@nestjs/common';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';

export interface WhatsappConfig {
  /** Meta Cloud API phone-number id (numeric). */
  phoneNumberId: string;
  /** Long-lived access token. */
  accessToken: string;
  /** API host — graph.facebook.com by default. */
  apiHost?: string;
  /** Graph API version, e.g. 'v18.0'. */
  apiVersion?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Meta Cloud API WhatsApp driver. message.to is an E.164-style phone
 * number (e.g. '+966500000000'). For PDPL: a recipient must have
 * granted consent (ConsentEvent purpose='whatsapp_notifications')
 * before this driver is dispatched; the dispatcher enforces that
 * (or, conservatively, the caller).
 *
 * Sends a plain text message. Template usage (required for
 * non-session messages outside the 24h customer-service window) is
 * passed through payload.template = { name, language, components }.
 */
export class WhatsappNotificationProvider implements INotificationProvider {
  readonly name = 'whatsapp';
  readonly channel: NotificationChannel = 'whatsapp';
  private readonly log = new Logger(WhatsappNotificationProvider.name);
  private readonly doFetch: typeof fetch;

  constructor(private readonly cfg: WhatsappConfig) {
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  async send(message: NotificationMessage): Promise<SentNotification> {
    const host = this.cfg.apiHost ?? 'graph.facebook.com';
    const version = this.cfg.apiVersion ?? 'v18.0';
    const url = `https://${host}/${version}/${this.cfg.phoneNumberId}/messages`;
    const template = message.payload?.template as
      | { name: string; language: { code: string }; components?: unknown }
      | undefined;
    const body: Record<string, unknown> = template
      ? {
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'template',
          template,
        }
      : {
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'text',
          text: { body: message.body, preview_url: false },
        };
    const res = await this.doFetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.cfg.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `whatsapp HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
    };
    const id = json.messages?.[0]?.id;
    this.log.log(
      `whatsapp org=${message.organizationId} to=${message.to} id=${id ?? '(none)'}`,
    );
    return {
      channel: this.channel,
      to: message.to,
      externalId: id,
      sentAt: new Date(),
    };
  }
}
