import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subscription } from '@prisma/client';
import {
  ISubscriptionRepository,
  UpsertSubscriptionData,
} from '../interfaces/subscription.repository.interface';

@Injectable()
export class FakeSubscriptionRepository implements ISubscriptionRepository {
  readonly rows = new Map<string, Subscription>(); // keyed by orgId

  async findByOrg(organizationId: string): Promise<Subscription | null> {
    return this.rows.get(organizationId) ?? null;
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    for (const r of this.rows.values()) {
      if (r.stripeSubscriptionId === stripeSubscriptionId) return { ...r };
    }
    return null;
  }

  async upsert(data: UpsertSubscriptionData): Promise<Subscription> {
    const existing = this.rows.get(data.organizationId);
    const now = new Date();
    const row: Subscription = {
      id: existing?.id ?? randomUUID(),
      organizationId: data.organizationId,
      planCode: data.planCode,
      status: data.status,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      currentPeriodStart: data.currentPeriodStart ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.rows.set(row.organizationId, row);
    return { ...row };
  }
}
