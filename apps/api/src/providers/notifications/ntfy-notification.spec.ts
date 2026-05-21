import { NtfyNotificationProvider } from './ntfy.notification.provider';

describe('NtfyNotificationProvider', () => {
  it('POSTs to /<topic> with Title header from subject', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = '';
    const fetchImpl: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = String(init?.body);
      return new Response('ok', { status: 200 });
    };
    const p = new NtfyNotificationProvider({
      baseUrl: 'https://ntfy.example.com',
      fetchImpl,
    });
    const r = await p.send({
      organizationId: 'org-1',
      to: 'bidready-incidents',
      subject: 'High severity',
      body: 'incident #42',
      payload: { priority: '5', tags: ['warning', 'incident'] },
    });
    expect(capturedUrl).toBe(
      'https://ntfy.example.com/bidready-incidents',
    );
    expect(capturedHeaders.Title).toBe('High severity');
    expect(capturedHeaders.Priority).toBe('5');
    expect(capturedHeaders.Tags).toBe('warning,incident');
    expect(capturedBody).toBe('incident #42');
    expect(r.to).toBe('bidready-incidents');
  });

  it('falls back to defaultTopic when message.to is empty', async () => {
    let capturedUrl = '';
    const fetchImpl: typeof fetch = async (url) => {
      capturedUrl = String(url);
      return new Response('ok', { status: 200 });
    };
    const p = new NtfyNotificationProvider({
      baseUrl: 'https://ntfy.example.com',
      defaultTopic: 'fallback-topic',
      fetchImpl,
    });
    await p.send({ organizationId: 'org-1', to: '', body: 'hi' });
    expect(capturedUrl).toBe('https://ntfy.example.com/fallback-topic');
  });

  it('throws when no topic available', async () => {
    const p = new NtfyNotificationProvider({
      baseUrl: 'https://ntfy.example.com',
    });
    await expect(
      p.send({ organizationId: 'org-1', to: '', body: 'hi' }),
    ).rejects.toThrow(/no topic/);
  });
});
