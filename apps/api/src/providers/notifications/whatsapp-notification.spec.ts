import { WhatsappNotificationProvider } from './whatsapp.notification.provider';

describe('WhatsappNotificationProvider', () => {
  it('POSTs a text message to Meta Cloud API with bearer auth', async () => {
    let capturedUrl = '';
    let capturedAuth = '';
    let capturedBody = '';
    const fetchImpl: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = String(
        (init?.headers as Record<string, string>).authorization,
      );
      capturedBody = String(init?.body);
      return new Response(
        JSON.stringify({ messages: [{ id: 'wamid.X' }] }),
        { status: 200 },
      );
    };
    const p = new WhatsappNotificationProvider({
      phoneNumberId: '12345',
      accessToken: 'tok',
      fetchImpl,
    });
    const r = await p.send({
      organizationId: 'org-1',
      to: '+966500000000',
      body: 'hello',
    });
    expect(capturedUrl).toBe(
      'https://graph.facebook.com/v18.0/12345/messages',
    );
    expect(capturedAuth).toBe('Bearer tok');
    const body = JSON.parse(capturedBody) as Record<string, unknown>;
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '+966500000000',
      type: 'text',
    });
    expect(r.externalId).toBe('wamid.X');
  });

  it('uses template payload when provided', async () => {
    let capturedBody = '';
    const fetchImpl: typeof fetch = async (_url, init) => {
      capturedBody = String(init?.body);
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.T' }] }), {
        status: 200,
      });
    };
    const p = new WhatsappNotificationProvider({
      phoneNumberId: '12345',
      accessToken: 'tok',
      fetchImpl,
    });
    await p.send({
      organizationId: 'org-1',
      to: '+966500000000',
      body: 'fallback',
      payload: {
        template: {
          name: 'incident_alert',
          language: { code: 'ar' },
        },
      },
    });
    const body = JSON.parse(capturedBody) as Record<string, unknown>;
    expect(body.type).toBe('template');
    expect(body.template).toEqual({
      name: 'incident_alert',
      language: { code: 'ar' },
    });
  });
});
