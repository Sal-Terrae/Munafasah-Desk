import { SlackNotificationProvider } from './slack.notification.provider';

describe('SlackNotificationProvider', () => {
  it('POSTs to default webhook with text payload', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    const fetchImpl: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body);
      return new Response('ok', { status: 200 });
    };
    const p = new SlackNotificationProvider({
      defaultWebhookUrl: 'https://hooks.slack.com/services/T0/B0/abc',
      fetchImpl,
    });
    const r = await p.send({
      organizationId: 'org-1',
      to: '',
      subject: 'Alert',
      body: 'something broke',
    });
    expect(r.channel).toBe('slack');
    expect(capturedUrl).toBe('https://hooks.slack.com/services/T0/B0/abc');
    const body = JSON.parse(capturedBody) as { text: string };
    expect(body.text).toContain('*Alert*');
    expect(body.text).toContain('something broke');
    // Webhook is masked in the result so it's audit-safe.
    expect(r.to).toBe('https://hooks.slack.com/…');
  });

  it('accepts per-message override URL', async () => {
    let capturedUrl = '';
    const fetchImpl: typeof fetch = async (url) => {
      capturedUrl = String(url);
      return new Response('ok', { status: 200 });
    };
    const p = new SlackNotificationProvider({ fetchImpl });
    await p.send({
      organizationId: 'org-1',
      to: 'https://hooks.slack.com/services/T1/B1/xyz',
      body: 'hi',
    });
    expect(capturedUrl).toBe('https://hooks.slack.com/services/T1/B1/xyz');
  });

  it('throws clearly when no webhook configured', async () => {
    const p = new SlackNotificationProvider({});
    await expect(
      p.send({ organizationId: 'org-1', to: '', body: 'hi' }),
    ).rejects.toThrow(/no webhook url/);
  });

  it('surfaces HTTP errors', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('bad', { status: 400 });
    const p = new SlackNotificationProvider({
      defaultWebhookUrl: 'https://hooks.slack.com/services/T/B/x',
      fetchImpl,
    });
    await expect(
      p.send({ organizationId: 'org-1', to: '', body: 'hi' }),
    ).rejects.toThrow(/HTTP 400/);
  });
});
