import { NotificationDispatcher } from './notification-dispatcher.service';
import { ConsoleNotificationProvider } from './console.notification.provider';
import type {
  INotificationProvider,
  NotificationChannel,
  NotificationMessage,
  SentNotification,
} from './notification.provider.interface';

function makeStubDriver(
  channel: NotificationChannel,
  outcome: 'ok' | 'fail',
): INotificationProvider {
  return {
    name: `stub-${channel}`,
    channel,
    async send(m: NotificationMessage): Promise<SentNotification> {
      if (outcome === 'fail') throw new Error('boom');
      return { channel, to: m.to, sentAt: new Date() };
    },
  };
}

describe('NotificationDispatcher', () => {
  it('routes to the matching channel driver', async () => {
    const slack = makeStubDriver('slack', 'ok');
    const console = new ConsoleNotificationProvider();
    const d = new NotificationDispatcher([console, slack]);
    expect(d.availableChannels()).toEqual(
      expect.arrayContaining(['console', 'slack']),
    );
    const r = await d.send('slack', {
      organizationId: 'org-1',
      to: '#alerts',
      body: 'hi',
    });
    expect(r.channel).toBe('slack');
  });

  it('throws on unknown channel with available channels in message', async () => {
    const d = new NotificationDispatcher([new ConsoleNotificationProvider()]);
    await expect(
      d.send('email', { organizationId: 'org-1', to: 'x@y', body: 'hi' }),
    ).rejects.toThrow(/email.*available: console/);
  });

  it('fanout returns per-channel results without aborting on failure', async () => {
    const ok = makeStubDriver('slack', 'ok');
    const bad = makeStubDriver('whatsapp', 'fail');
    const d = new NotificationDispatcher([ok, bad]);
    const results = await d.fanout(['slack', 'whatsapp'], {
      organizationId: 'org-1',
      to: 'x',
      body: 'hi',
    });
    expect(results).toHaveLength(2);
    const slackR = results.find((r) => r.channel === 'slack')!;
    const waR = results.find((r) => r.channel === 'whatsapp')!;
    expect(slackR.ok).toBe(true);
    expect(waR.ok).toBe(false);
    if (!waR.ok) expect(waR.error).toBe('boom');
  });
});
