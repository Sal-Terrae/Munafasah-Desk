import { Global, Module } from '@nestjs/common';
import { NOTIFICATION_PROVIDER } from './notification.tokens';
import { ConsoleNotificationProvider } from './console.notification.provider';

/**
 * Console driver only for now — SMTP/Slack/WhatsApp/ntfy drivers land
 * in PRD workstream B.2. Selecting between drivers will move into a
 * factory like the LLM/Queue modules once a second driver exists.
 */
@Global()
@Module({
  providers: [
    ConsoleNotificationProvider,
    {
      provide: NOTIFICATION_PROVIDER,
      useExisting: ConsoleNotificationProvider,
    },
  ],
  exports: [NOTIFICATION_PROVIDER],
})
export class NotificationModule {}
