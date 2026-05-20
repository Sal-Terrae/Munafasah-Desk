import { Injectable, Logger } from '@nestjs/common';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';

/**
 * Default driver — logs the message and returns synthetically. Used in
 * tests + local dev to avoid sending real outbound. The SMTP / Slack /
 * WhatsApp / ntfy drivers land in PRD workstream B.
 *
 * Keeps a per-instance `sent` list so tests can assert without spying
 * on the logger.
 */
@Injectable()
export class ConsoleNotificationProvider implements INotificationProvider {
  readonly name = 'console';
  readonly channel: NotificationChannel = 'console';
  private readonly log = new Logger(ConsoleNotificationProvider.name);
  readonly sent: SentNotification[] = [];

  async send(message: NotificationMessage): Promise<SentNotification> {
    this.log.log(
      `notify org=${message.organizationId} to=${message.to} subject=${message.subject ?? '(none)'}`,
    );
    const rec: SentNotification = {
      channel: this.channel,
      to: message.to,
      sentAt: new Date(),
    };
    this.sent.push(rec);
    return rec;
  }
}
