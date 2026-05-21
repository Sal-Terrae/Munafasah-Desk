import { WebhookDispatcher } from './webhook-dispatcher.service';
import { FakeWebhookSubscriptionRepository } from '../repositories/fake/fake-webhook-subscription.repository';
import { FakeWebhookDeliveryRepository } from '../repositories/fake/fake-webhook-delivery.repository';
import { verifyWebhookSignature } from './webhook-signing';

interface CapturedRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
}

function makeDispatcher(opts: {
  outcomes: Array<{ status: number } | { throw: string }>;
}): {
  dispatcher: WebhookDispatcher;
  subs: FakeWebhookSubscriptionRepository;
  deliveries: FakeWebhookDeliveryRepository;
  captures: CapturedRequest[];
} {
  const subs = new FakeWebhookSubscriptionRepository();
  const deliveries = new FakeWebhookDeliveryRepository();
  const captures: CapturedRequest[] = [];
  let i = 0;
  const fetchImpl: typeof fetch = async (url, init) => {
    captures.push({
      url: String(url),
      body: String(init?.body),
      headers: init?.headers as Record<string, string>,
    });
    const outcome = opts.outcomes[Math.min(i, opts.outcomes.length - 1)];
    i++;
    if ('throw' in outcome) throw new Error(outcome.throw);
    return new Response('', { status: outcome.status });
  };
  const dispatcher = new WebhookDispatcher(subs, deliveries, {
    fetchImpl,
    maxAttempts: 3,
    backoffBaseMs: 1, // make retry sleeps near-instant for tests
    requestTimeoutMs: 5000,
  });
  return { dispatcher, subs, deliveries, captures };
}

describe('WebhookDispatcher', () => {
  it('signs the body and posts to the subscription URL on publish', async () => {
    const ctx = makeDispatcher({ outcomes: [{ status: 200 }] });
    const sub = await ctx.subs.create({
      organizationId: 'org-1',
      url: 'https://hooks.example.com/in',
      secret: 'unit-secret',
      eventTypes: ['ticket.created'],
      createdBy: 'admin-1',
    });
    const [delivery] = await ctx.dispatcher.publish(
      'org-1',
      'ticket.created',
      { hello: 'world' },
    );
    expect(delivery.status).toBe('delivered');
    expect(delivery.attempts).toBe(1);
    expect(delivery.responseStatus).toBe(200);
    const c = ctx.captures[0];
    expect(c.url).toBe('https://hooks.example.com/in');
    expect(c.headers['X-Bidready-Event']).toBe('ticket.created');
    expect(c.headers['Idempotency-Key']).toBe(delivery.id);
    const ts = Number(c.headers['X-Bidready-Timestamp']);
    expect(
      verifyWebhookSignature(
        sub.secret,
        c.body,
        ts,
        c.headers['X-Bidready-Signature'],
      ),
    ).toBe(true);
  });

  it('retries up to maxAttempts and marks failed when never 2xx', async () => {
    const ctx = makeDispatcher({
      outcomes: [{ status: 500 }, { status: 502 }, { status: 503 }],
    });
    await ctx.subs.create({
      organizationId: 'org-1',
      url: 'https://hooks.example.com/in',
      secret: 's',
      eventTypes: ['ticket.created'],
      createdBy: 'admin-1',
    });
    const [delivery] = await ctx.dispatcher.publish(
      'org-1',
      'ticket.created',
      {},
    );
    expect(delivery.status).toBe('failed');
    expect(delivery.attempts).toBe(3);
    expect(ctx.captures).toHaveLength(3);
    expect(delivery.lastError).toBe('HTTP 503');
  });

  it('records network errors as lastError without responseStatus', async () => {
    const ctx = makeDispatcher({
      outcomes: [{ throw: 'connection refused' }, { status: 200 }],
    });
    await ctx.subs.create({
      organizationId: 'org-1',
      url: 'https://hooks.example.com/in',
      secret: 's',
      eventTypes: ['ticket.created'],
      createdBy: 'admin-1',
    });
    const [delivery] = await ctx.dispatcher.publish(
      'org-1',
      'ticket.created',
      {},
    );
    expect(delivery.status).toBe('delivered');
    expect(delivery.attempts).toBe(2);
    expect(delivery.responseStatus).toBe(200);
  });

  it('only dispatches to active subscriptions for the matching event', async () => {
    const ctx = makeDispatcher({ outcomes: [{ status: 200 }] });
    await ctx.subs.create({
      organizationId: 'org-1',
      url: 'https://a.test/',
      secret: 's',
      eventTypes: ['ticket.created'],
      createdBy: 'admin-1',
    });
    await ctx.subs.create({
      organizationId: 'org-1',
      url: 'https://b.test/',
      secret: 's',
      eventTypes: ['ticket.created'],
      active: false,
      createdBy: 'admin-1',
    });
    await ctx.subs.create({
      organizationId: 'org-1',
      url: 'https://c.test/',
      secret: 's',
      eventTypes: ['document.expired'],
      createdBy: 'admin-1',
    });
    await ctx.subs.create({
      organizationId: 'org-2',
      url: 'https://other-tenant.test/',
      secret: 's',
      eventTypes: ['ticket.created'],
      createdBy: 'admin-2',
    });
    const out = await ctx.dispatcher.publish(
      'org-1',
      'ticket.created',
      { x: 1 },
    );
    expect(out).toHaveLength(1);
    expect(ctx.captures.map((c) => c.url)).toEqual(['https://a.test/']);
  });

  it('returns [] when no subscriptions match', async () => {
    const ctx = makeDispatcher({ outcomes: [] });
    const out = await ctx.dispatcher.publish('org-1', 'never.happens', {});
    expect(out).toEqual([]);
    expect(ctx.captures).toEqual([]);
  });
});
