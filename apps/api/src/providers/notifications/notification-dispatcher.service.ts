import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';
import { NOTIFICATION_DRIVERS } from './notification.tokens';

/**
 * Multi-channel router. Holds one provider per channel and dispatches
 * by the caller-supplied channel name. Drivers register themselves in
 * the NotificationModule factory based on env; unknown/unconfigured
 * channels throw a clear error rather than silently drop.
 *
 * PDPL note: this dispatcher does NOT enforce consent — the caller is
 * responsible for checking ConsentEvent before sending on channels
 * that require an opt-in (e.g. WhatsApp marketing). Use the existing
 * ConsentLedgerService.check() before calling send() for those.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly log = new Logger(NotificationDispatcher.name);
  private readonly byChannel = new Map<
    NotificationChannel,
    INotificationProvider
  >();

  constructor(
    @Inject(NOTIFICATION_DRIVERS)
    private readonly drivers: INotificationProvider[],
  ) {
    for (const d of drivers) {
      if (this.byChannel.has(d.channel)) {
        this.log.warn(
          `duplicate driver for channel=${d.channel}: ${d.name} overrides ${this.byChannel.get(d.channel)?.name}`,
        );
      }
      this.byChannel.set(d.channel, d);
    }
  }

  /** Available channels (driver registered). */
  availableChannels(): NotificationChannel[] {
    return [...this.byChannel.keys()];
  }

  async send(
    channel: NotificationChannel,
    message: NotificationMessage,
  ): Promise<SentNotification> {
    const driver = this.byChannel.get(channel);
    if (!driver) {
      throw new Error(
        `no notification driver registered for channel=${channel}; available: ${this.availableChannels().join(',') || '(none)'}`,
      );
    }
    return driver.send(message);
  }

  /**
   * Best-effort fan-out across multiple channels. Returns per-channel
   * results; a failure on one channel doesn't abort the rest. Useful
   * for advisory notifications where partial delivery is acceptable.
   */
  async fanout(
    channels: NotificationChannel[],
    message: NotificationMessage,
  ): Promise<
    Array<
      | { channel: NotificationChannel; ok: true; result: SentNotification }
      | { channel: NotificationChannel; ok: false; error: string }
    >
  > {
    const tasks = channels.map(async (ch) => {
      try {
        const result = await this.send(ch, message);
        return { channel: ch, ok: true as const, result };
      } catch (err) {
        return {
          channel: ch,
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
    return Promise.all(tasks);
  }
}
