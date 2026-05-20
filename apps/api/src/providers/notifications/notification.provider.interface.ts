export type NotificationChannel =
  | 'email'
  | 'slack'
  | 'whatsapp'
  | 'ntfy'
  | 'console';

export interface NotificationMessage {
  /** Tenant the message belongs to — used for routing + audit. */
  organizationId: string;
  /** Channel-specific recipient. email: address; slack: webhook/channel; whatsapp: phone. */
  to: string;
  subject?: string;
  /** Markdown or plain text. Drivers render to channel-appropriate format. */
  body: string;
  /** Structured payload for richer channels (Slack blocks, email templates). */
  payload?: Record<string, unknown>;
}

export interface SentNotification {
  channel: NotificationChannel;
  to: string;
  /** Driver-specific message id where available (Slack ts, SMTP message-id). */
  externalId?: string;
  sentAt: Date;
}

export interface INotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<SentNotification>;
}
