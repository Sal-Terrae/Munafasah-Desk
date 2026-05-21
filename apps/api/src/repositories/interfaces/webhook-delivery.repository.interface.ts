import { WebhookDelivery } from '@prisma/client';

export interface CreateWebhookDeliveryData {
  subscriptionId: string;
  organizationId: string;
  eventType: string;
  payload: unknown;
}

export interface UpdateWebhookDeliveryData {
  status?: 'pending' | 'delivered' | 'failed';
  attempts?: number;
  lastError?: string | null;
  responseStatus?: number | null;
  lastTriedAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface IWebhookDeliveryRepository {
  create(data: CreateWebhookDeliveryData): Promise<WebhookDelivery>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<WebhookDelivery | null>;
  findRecent(
    organizationId: string,
    limit?: number,
  ): Promise<WebhookDelivery[]>;
  update(
    id: string,
    data: UpdateWebhookDeliveryData,
  ): Promise<WebhookDelivery>;
}
