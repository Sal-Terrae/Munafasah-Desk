import { Subscription } from '@prisma/client';

export interface UpsertSubscriptionData {
  organizationId: string;
  planCode: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}

export interface ISubscriptionRepository {
  findByOrg(organizationId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null>;
  upsert(data: UpsertSubscriptionData): Promise<Subscription>;
}
