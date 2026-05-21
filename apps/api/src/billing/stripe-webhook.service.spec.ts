import { createHmac } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StripeWebhookService } from './stripe-webhook.service';
import { SubscriptionService } from './subscription.service';
import { AuditService } from '../audit/audit.service';
import { FakeSubscriptionRepository } from '../repositories/fake/fake-subscription.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

const SECRET = 'whsec_test';

// Mirror plan-catalog: set env so 'basic' has a known stripe price id.
// The plan-catalog is read at module-load time so we have to set it
// before importing — but since the catalog is built dynamically per
// process.env at module require, we can override by setting then
// re-requiring. For simplicity here the test sets the env once at
// suite start and matches what plan-catalog reads on import.

function sign(body: string, ts: number, secret = SECRET): string {
  const v1 = createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex');
  return `t=${ts},v1=${v1}`;
}

function makeSvc() {
  const subsRepo = new FakeSubscriptionRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  const subs = new SubscriptionService(subsRepo);
  const svc = new StripeWebhookService(subs, audit);
  return { svc, subsRepo, auditRepo, subs };
}

describe('StripeWebhookService', () => {
  const prevBasic = process.env.STRIPE_PRICE_BASIC;

  beforeAll(() => {
    process.env.STRIPE_PRICE_BASIC = 'price_test_basic';
    // re-import plan-catalog to pick up env. Jest caches modules; the
    // simplest workaround for this isolated test is to ensure the env
    // is set before any service depending on plan-catalog is created.
  });

  afterAll(() => {
    if (prevBasic === undefined) delete process.env.STRIPE_PRICE_BASIC;
    else process.env.STRIPE_PRICE_BASIC = prevBasic;
  });

  it('rejects with 403 on invalid signature', async () => {
    const { svc } = makeSvc();
    const body = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.created' });
    await expect(
      svc.receive(body, 't=1,v1=bad', SECRET),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects with 400 on non-JSON body', async () => {
    const { svc } = makeSvc();
    const ts = Math.floor(Date.now() / 1000);
    const body = 'not json';
    await expect(
      svc.receive(body, sign(body, ts), SECRET),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is a no-op for unhandled event types', async () => {
    const { svc } = makeSvc();
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: 'evt_x',
      type: 'invoice.finalized',
      data: { object: { id: 'in_x' } },
    });
    const r = await svc.receive(body, sign(body, ts), SECRET);
    expect(r.handled).toBe(false);
    expect(r.type).toBe('invoice.finalized');
  });

  it('upserts subscription on customer.subscription.created', async () => {
    // Re-import plan-catalog after env mutation so basic gets the priceId.
    jest.resetModules();
    process.env.STRIPE_PRICE_BASIC = 'price_test_basic';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StripeWebhookService: Fresh } = require('./stripe-webhook.service');
    const subsRepo = new FakeSubscriptionRepository();
    const auditRepo = new FakeAuditEventRepository();
    const audit = new AuditService(auditRepo);
    const subs = new SubscriptionService(subsRepo);
    const svc = new Fresh(subs, audit);

    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: 'evt_sub_created',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_X',
          status: 'active',
          customer: 'cus_X',
          current_period_start: ts - 1000,
          current_period_end: ts + 1_000_000,
          cancel_at_period_end: false,
          metadata: { organization_id: 'org-1' },
          items: { data: [{ price: { id: 'price_test_basic' } }] },
        },
      },
    });
    const r = await svc.receive(body, sign(body, ts), SECRET);
    expect(r.handled).toBe(true);
    const view = await subs.forOrg('org-1');
    expect(view.subscription.planCode).toBe('basic');
    expect(view.subscription.stripeSubscriptionId).toBe('sub_X');
    const audits = Array.from(
      (auditRepo as unknown as { records: Map<string, { action: string }> })
        .records.values(),
    );
    expect(
      audits.some((a) => a.action.startsWith('subscription.')),
    ).toBe(true);
  });

  it('downgrades to free + canceled on customer.subscription.deleted', async () => {
    const { svc, subs } = makeSvc();
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: 'evt_del',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_X',
          customer: 'cus_X',
          metadata: { organization_id: 'org-1' },
        },
      },
    });
    const r = await svc.receive(body, sign(body, ts), SECRET);
    expect(r.handled).toBe(true);
    const view = await subs.forOrg('org-1');
    expect(view.subscription.planCode).toBe('free');
    expect(view.subscription.status).toBe('canceled');
  });

  it('rejects subscription events missing organization_id metadata', async () => {
    const { svc } = makeSvc();
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: 'evt_bad',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_Y',
          status: 'active',
          customer: 'cus_Y',
          items: { data: [{ price: { id: 'price_test_basic' } }] },
        },
      },
    });
    await expect(
      svc.receive(body, sign(body, ts), SECRET),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the price id does not map to a known plan', async () => {
    const { svc } = makeSvc();
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: 'evt_bad',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_Y',
          status: 'active',
          customer: 'cus_Y',
          metadata: { organization_id: 'org-1' },
          items: { data: [{ price: { id: 'price_unknown' } }] },
        },
      },
    });
    await expect(
      svc.receive(body, sign(body, ts), SECRET),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
