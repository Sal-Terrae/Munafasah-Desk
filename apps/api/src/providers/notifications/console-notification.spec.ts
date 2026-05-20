import { ConsoleNotificationProvider } from './console.notification.provider';

describe('ConsoleNotificationProvider', () => {
  it('records sent messages on the instance', async () => {
    const p = new ConsoleNotificationProvider();
    const r = await p.send({
      organizationId: 'org-1',
      to: 'a@example.com',
      subject: 'hi',
      body: 'hello',
    });
    expect(r.channel).toBe('console');
    expect(r.to).toBe('a@example.com');
    expect(p.sent).toHaveLength(1);
  });
});
