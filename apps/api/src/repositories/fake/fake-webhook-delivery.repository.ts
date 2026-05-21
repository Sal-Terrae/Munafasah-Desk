import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WebhookDelivery, Prisma } from '@prisma/client';
import {
  CreateWebhookDeliveryData,
  IWebhookDeliveryRepository,
  UpdateWebhookDeliveryData,
} from '../interfaces/webhook-delivery.repository.interface';

@Injectable()
export class FakeWebhookDeliveryRepository
  implements IWebhookDeliveryRepository
{
  readonly rows = new Map<string, WebhookDelivery>();

  async create(data: CreateWebhookDeliveryData): Promise<WebhookDelivery> {
    const now = new Date();
    const row: WebhookDelivery = {
      id: randomUUID(),
      subscriptionId: data.subscriptionId,
      organizationId: data.organizationId,
      eventType: data.eventType,
      payload: data.payload as Prisma.JsonValue,
      status: 'pending',
      attempts: 0,
      lastError: null,
      responseStatus: null,
      lastTriedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<WebhookDelivery | null> {
    const r = this.rows.get(id);
    if (!r || r.organizationId !== organizationId) return null;
    return { ...r };
  }

  async findRecent(
    organizationId: string,
    limit = 100,
  ): Promise<WebhookDelivery[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  async update(
    id: string,
    data: UpdateWebhookDeliveryData,
  ): Promise<WebhookDelivery> {
    const existing = this.rows.get(id);
    if (!existing) throw new NotFoundException('WebhookDelivery not found');
    const updated: WebhookDelivery = {
      ...existing,
      ...(data.status !== undefined && { status: data.status }),
      ...(data.attempts !== undefined && { attempts: data.attempts }),
      ...(data.lastError !== undefined && { lastError: data.lastError }),
      ...(data.responseStatus !== undefined && {
        responseStatus: data.responseStatus,
      }),
      ...(data.lastTriedAt !== undefined && { lastTriedAt: data.lastTriedAt }),
      ...(data.deliveredAt !== undefined && { deliveredAt: data.deliveredAt }),
      updatedAt: new Date(),
    };
    this.rows.set(id, updated);
    return { ...updated };
  }
}
