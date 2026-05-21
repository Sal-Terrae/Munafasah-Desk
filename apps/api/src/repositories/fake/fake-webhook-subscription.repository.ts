import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WebhookSubscription } from '@prisma/client';
import {
  CreateWebhookSubscriptionData,
  IWebhookSubscriptionRepository,
  UpdateWebhookSubscriptionData,
} from '../interfaces/webhook-subscription.repository.interface';

@Injectable()
export class FakeWebhookSubscriptionRepository
  implements IWebhookSubscriptionRepository
{
  readonly rows = new Map<string, WebhookSubscription>();

  async create(
    data: CreateWebhookSubscriptionData,
  ): Promise<WebhookSubscription> {
    const now = new Date();
    const row: WebhookSubscription = {
      id: randomUUID(),
      organizationId: data.organizationId,
      url: data.url,
      secret: data.secret,
      eventTypes: [...data.eventTypes],
      active: data.active ?? true,
      description: data.description ?? null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<WebhookSubscription | null> {
    const r = this.rows.get(id);
    if (!r || r.organizationId !== organizationId) return null;
    return { ...r };
  }

  async findAll(organizationId: string): Promise<WebhookSubscription[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({ ...r }));
  }

  async findActiveForEvent(
    organizationId: string,
    eventType: string,
  ): Promise<WebhookSubscription[]> {
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          r.active &&
          r.eventTypes.includes(eventType),
      )
      .map((r) => ({ ...r }));
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateWebhookSubscriptionData,
  ): Promise<WebhookSubscription> {
    const existing = this.rows.get(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundException('WebhookSubscription not found');
    }
    const updated: WebhookSubscription = {
      ...existing,
      ...(data.url !== undefined && { url: data.url }),
      ...(data.secret !== undefined && { secret: data.secret }),
      ...(data.eventTypes !== undefined && { eventTypes: [...data.eventTypes] }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.description !== undefined && { description: data.description }),
      updatedAt: new Date(),
    };
    this.rows.set(id, updated);
    return { ...updated };
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const existing = this.rows.get(id);
    if (existing && existing.organizationId === organizationId) {
      this.rows.delete(id);
    }
  }
}
