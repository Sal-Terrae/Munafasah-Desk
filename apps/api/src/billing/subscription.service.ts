import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '@prisma/client';
import { ISubscriptionRepository } from '../repositories/interfaces/subscription.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../repositories/tokens';
import { findPlan, Plan } from './plan-catalog';

export interface SubscriptionView {
  subscription: Subscription;
  plan: Plan;
}

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
  ) {}

  /**
   * Returns the current subscription for an org. If none exists,
   * synthesises an in-memory 'free' subscription view — the org is
   * implicitly on the free plan until it provisions one in Stripe.
   * No row is created (would muddy audit + cascade semantics).
   */
  async forOrg(organizationId: string): Promise<SubscriptionView> {
    const existing = await this.repo.findByOrg(organizationId);
    if (existing) {
      return {
        subscription: existing,
        plan: findPlan(existing.planCode) ?? findPlan('free')!,
      };
    }
    const free = findPlan('free')!;
    const now = new Date();
    return {
      subscription: {
        id: 'implicit-free',
        organizationId,
        planCode: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      },
      plan: free,
    };
  }

  /** Upsert from a Stripe webhook event (or admin tool). */
  upsert(data: {
    organizationId: string;
    planCode: string;
    status: 'active' | 'past_due' | 'canceled' | 'incomplete';
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  }): Promise<Subscription> {
    return this.repo.upsert(data);
  }

  findByStripeSubscriptionId(id: string): Promise<Subscription | null> {
    return this.repo.findByStripeSubscriptionId(id);
  }
}
