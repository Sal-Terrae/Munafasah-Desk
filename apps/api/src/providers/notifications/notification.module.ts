import { Global, Module } from '@nestjs/common';
import {
  NOTIFICATION_DRIVERS,
  NOTIFICATION_PROVIDER,
} from './notification.tokens';
import type { INotificationProvider } from './notification.provider.interface';
import { ConsoleNotificationProvider } from './console.notification.provider';
import { SmtpNotificationProvider } from './smtp.notification.provider';
import { SlackNotificationProvider } from './slack.notification.provider';
import { WhatsappNotificationProvider } from './whatsapp.notification.provider';
import { NtfyNotificationProvider } from './ntfy.notification.provider';
import { NotificationDispatcher } from './notification-dispatcher.service';

/**
 * Reads env and instantiates whichever channel drivers are enabled.
 * The console driver is always registered as a fallback so logs +
 * tests have something to assert against. Drivers register
 * conditionally — if their *_ENABLED flag is unset or the required
 * credentials are missing, they are silently skipped.
 *
 *   NOTIFICATION_SMTP_ENABLED=true + NOTIFICATION_SMTP_HOST + _PORT +
 *     _SECURE + _USER + _PASS + _FROM_ADDRESS + _FROM_NAME
 *   NOTIFICATION_SLACK_ENABLED=true + NOTIFICATION_SLACK_WEBHOOK_URL
 *   NOTIFICATION_WHATSAPP_ENABLED=true + _PHONE_NUMBER_ID + _ACCESS_TOKEN
 *   NOTIFICATION_NTFY_ENABLED=true + _BASE_URL (+ optional _DEFAULT_TOPIC,
 *     _BEARER_TOKEN)
 */
function buildDrivers(env: NodeJS.ProcessEnv): INotificationProvider[] {
  const drivers: INotificationProvider[] = [new ConsoleNotificationProvider()];

  if (env.NOTIFICATION_SMTP_ENABLED === 'true' && env.NOTIFICATION_SMTP_HOST) {
    drivers.push(
      new SmtpNotificationProvider({
        host: env.NOTIFICATION_SMTP_HOST,
        port: Number(env.NOTIFICATION_SMTP_PORT ?? '587'),
        secure: env.NOTIFICATION_SMTP_SECURE === 'true',
        user: env.NOTIFICATION_SMTP_USER,
        pass: env.NOTIFICATION_SMTP_PASS,
        fromAddress: env.NOTIFICATION_SMTP_FROM_ADDRESS ?? 'noreply@localhost',
        fromName: env.NOTIFICATION_SMTP_FROM_NAME,
      }),
    );
  }

  if (
    env.NOTIFICATION_SLACK_ENABLED === 'true' &&
    env.NOTIFICATION_SLACK_WEBHOOK_URL
  ) {
    drivers.push(
      new SlackNotificationProvider({
        defaultWebhookUrl: env.NOTIFICATION_SLACK_WEBHOOK_URL,
      }),
    );
  }

  if (
    env.NOTIFICATION_WHATSAPP_ENABLED === 'true' &&
    env.NOTIFICATION_WHATSAPP_PHONE_NUMBER_ID &&
    env.NOTIFICATION_WHATSAPP_ACCESS_TOKEN
  ) {
    drivers.push(
      new WhatsappNotificationProvider({
        phoneNumberId: env.NOTIFICATION_WHATSAPP_PHONE_NUMBER_ID,
        accessToken: env.NOTIFICATION_WHATSAPP_ACCESS_TOKEN,
        apiHost: env.NOTIFICATION_WHATSAPP_API_HOST,
        apiVersion: env.NOTIFICATION_WHATSAPP_API_VERSION,
      }),
    );
  }

  if (env.NOTIFICATION_NTFY_ENABLED === 'true' && env.NOTIFICATION_NTFY_BASE_URL) {
    drivers.push(
      new NtfyNotificationProvider({
        baseUrl: env.NOTIFICATION_NTFY_BASE_URL,
        defaultTopic: env.NOTIFICATION_NTFY_DEFAULT_TOPIC,
        bearerToken: env.NOTIFICATION_NTFY_BEARER_TOKEN,
      }),
    );
  }

  return drivers;
}

@Global()
@Module({
  providers: [
    ConsoleNotificationProvider, // legacy single-driver token still available
    {
      provide: NOTIFICATION_PROVIDER,
      useExisting: ConsoleNotificationProvider,
    },
    {
      provide: NOTIFICATION_DRIVERS,
      useFactory: () => buildDrivers(process.env),
    },
    NotificationDispatcher,
  ],
  exports: [
    NOTIFICATION_PROVIDER,
    NOTIFICATION_DRIVERS,
    NotificationDispatcher,
  ],
})
export class NotificationModule {}
