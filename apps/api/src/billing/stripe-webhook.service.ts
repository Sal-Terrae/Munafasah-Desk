import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { findPlan, findPlanByStripePriceId } from './plan-catalog';
import { SubscriptionService } from './subscription.service';
import { AuditService } from '../audit/audit.service';
import { verifyStripeSignature } from './stripe-signature';

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Handles Stripe billing events. Authoritative state lives in Stripe;
 * we mirror the minimum: which plan an org is on + subscription
 * status + current period. organizationId must be passed by Stripe in
 * the `metadata.organization_id` field on Customer or Subscription
 * (set when the checkout link is created — out of scope here but
 * documented in docs/billing.md).
 *
 * Events handled:
 *  - customer.subscription.created
 *  - customer.subscription.updated
 *  - customer.subscription.deleted
 *  - checkout.session.completed
 *
 * Unknown event types are no-ops (idempotent).
 */
@Injectable()
export class StripeWebhookService {
  private readonly log = new Logger(StripeWebhookService.name);

  constructor(
    private readonly subscriptions: SubscriptionService,
    private readonly audit: AuditService,
  ) {}

  /** Receive + verify + dispatch. Caller passes raw body string. */
  async receive(
    rawBody: string,
    signatureHeader: string,
    signingSecret: string = process.env.STRIPE_WEBHOOK_SECRET ?? '',
  ): Promise<{ handled: boolean; type: string; subscriptionId?: string }> {
    if (
      !verifyStripeSignature({
        rawBody,
        header: signatureHeader,
        secret: signingSecret,
      })
    ) {
      throw new ForbiddenException('invalid Stripe signature');
    }
    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      throw new BadRequestException('body is not valid JSON');
    }
    if (!event?.type || !event?.data?.object) {
      throw new BadRequestException('event missing type or data.object');
    }
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return this.onSubscriptionUpdate(event);
      case 'customer.subscription.deleted':
        return this.onSubscriptionDeleted(event);
      case 'checkout.session.completed':
        return this.onCheckoutCompleted(event);
      default:
        this.log.log(`unhandled Stripe event: ${event.type}`);
        return { handled: false, type: event.type };
    }
  }

  private async onSubscriptionUpdate(event: StripeEvent) {
    const obj = event.data.object as Record<string, unknown>;
    const organizationId = this.requireOrgId(obj);
    const stripeSubscriptionId = String(obj.id);
    const stripeCustomerId =
      typeof obj.customer === 'string' ? obj.customer : null;
    const status = this.mapStatus(String(obj.status ?? 'incomplete'));
    const priceId = this.extractPriceId(obj);
    const plan = priceId ? findPlanByStripePriceId(priceId) : undefined;
    if (!plan) {
      throw new NotFoundException(
        `no plan registered for Stripe price ${priceId ?? '(none)'}`,
      );
    }
    const sub = await this.subscriptions.upsert({
      organizationId,
      planCode: plan.code,
      status,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: toDate(obj.current_period_start),
      currentPeriodEnd: toDate(obj.current_period_end),
      cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
    });
    await this.audit.record({
      action: `subscription.${event.type.split('.').pop()}`,
      entityType: 'Subscription',
      entityId: sub.id,
      userId: null,
      organizationId,
      details: { planCode: sub.planCode, status: sub.status, eventId: event.id },
    });
    return {
      handled: true,
      type: event.type,
      subscriptionId: sub.id,
    };
  }

  private async onSubscriptionDeleted(event: StripeEvent) {
    const obj = event.data.object as Record<string, unknown>;
    const organizationId = this.requireOrgId(obj);
    const sub = await this.subscriptions.upsert({
      organizationId,
      planCode: 'free',
      status: 'canceled',
      stripeCustomerId:
        typeof obj.customer === 'string' ? obj.customer : null,
      stripeSubscriptionId: String(obj.id),
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    await this.audit.record({
      action: 'subscription.canceled',
      entityType: 'Subscription',
      entityId: sub.id,
      userId: null,
      organizationId,
      details: { eventId: event.id },
    });
    return { handled: true, type: event.type, subscriptionId: sub.id };
  }

  private async onCheckoutCompleted(event: StripeEvent) {
    // checkout.session.completed precedes customer.subscription.created
    // on a normal subscription flow; we record the audit event but the
    // actual plan/status mirror happens on the subscription event.
    const obj = event.data.object as Record<string, unknown>;
    const organizationId = this.tryOrgId(obj);
    if (organizationId) {
      await this.audit.record({
        action: 'checkout.completed',
        entityType: 'Subscription',
        entityId: typeof obj.id === 'string' ? obj.id : 'unknown',
        userId: null,
        organizationId,
        details: { eventId: event.id },
      });
    }
    return { handled: true, type: event.type };
  }

  private mapStatus(
    raw: string,
  ): 'active' | 'past_due' | 'canceled' | 'incomplete' {
    if (raw === 'active' || raw === 'trialing') return 'active';
    if (raw === 'past_due' || raw === 'unpaid') return 'past_due';
    if (raw === 'canceled') return 'canceled';
    return 'incomplete';
  }

  /** Reads metadata.organization_id; throws when missing on an event
   *  that must be tenant-routed. */
  private requireOrgId(obj: Record<string, unknown>): string {
    const orgId = this.tryOrgId(obj);
    if (!orgId) {
      throw new BadRequestException(
        'event metadata missing organization_id',
      );
    }
    return orgId;
  }

  private tryOrgId(obj: Record<string, unknown>): string | null {
    const meta = obj.metadata as Record<string, unknown> | undefined;
    const fromMeta = meta?.organization_id;
    if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta;
    return null;
  }

  /** Best-effort extract of the first price.id from items.data[0]. */
  private extractPriceId(obj: Record<string, unknown>): string | null {
    const items = obj.items as { data?: unknown[] } | undefined;
    const first = items?.data?.[0] as
      | { price?: { id?: string } }
      | undefined;
    return first?.price?.id ?? null;
  }
}

function toDate(v: unknown): Date | null {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v * 1000);
  return null;
}
