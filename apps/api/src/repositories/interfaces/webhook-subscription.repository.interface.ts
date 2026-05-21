import { WebhookSubscription } from '@prisma/client';

export interface CreateWebhookSubscriptionData {
  organizationId: string;
  url: string;
  secret: string;
  eventTypes: string[];
  active?: boolean;
  description?: string | null;
  createdBy: string;
}

export interface UpdateWebhookSubscriptionData {
  url?: string;
  eventTypes?: string[];
  active?: boolean;
  description?: string | null;
  secret?: string;
}

export interface IWebhookSubscriptionRepository {
  create(data: CreateWebhookSubscriptionData): Promise<WebhookSubscription>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<WebhookSubscription | null>;
  findAll(organizationId: string): Promise<WebhookSubscription[]>;
  /** Active subscriptions for an org that subscribe to the given event. */
  findActiveForEvent(
    organizationId: string,
    eventType: string,
  ): Promise<WebhookSubscription[]>;
  update(
    id: string,
    organizationId: string,
    data: UpdateWebhookSubscriptionData,
  ): Promise<WebhookSubscription>;
  delete(id: string, organizationId: string): Promise<void>;
}
