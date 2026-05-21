import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromAddress: string;
  fromName?: string;
  /** Injected transporter for tests. */
  transporter?: Transporter;
}

/**
 * SMTP driver. Uses nodemailer with a single shared transporter so we
 * don't open a connection per send. Production should target a real
 * SMTP service (SES, SendGrid SMTP, etc.); local dev can target
 * MailHog or Mailpit on host:1025.
 */
export class SmtpNotificationProvider implements INotificationProvider {
  readonly name = 'smtp';
  readonly channel: NotificationChannel = 'email';
  private readonly log = new Logger(SmtpNotificationProvider.name);
  private readonly transporter: Transporter;
  private readonly fromHeader: string;

  constructor(private readonly cfg: SmtpConfig) {
    this.transporter =
      cfg.transporter ??
      nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth:
          cfg.user && cfg.pass
            ? { user: cfg.user, pass: cfg.pass }
            : undefined,
      });
    this.fromHeader = cfg.fromName
      ? `"${cfg.fromName}" <${cfg.fromAddress}>`
      : cfg.fromAddress;
  }

  async send(message: NotificationMessage): Promise<SentNotification> {
    const info = await this.transporter.sendMail({
      from: this.fromHeader,
      to: message.to,
      subject: message.subject ?? '(no subject)',
      text: message.body,
    });
    this.log.log(
      `smtp org=${message.organizationId} to=${message.to} id=${info.messageId ?? '(none)'}`,
    );
    return {
      channel: this.channel,
      to: message.to,
      externalId: info.messageId,
      sentAt: new Date(),
    };
  }
}
