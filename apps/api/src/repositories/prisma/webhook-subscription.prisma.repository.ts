import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  CreateWebhookSubscriptionData,
  IWebhookSubscriptionRepository,
  UpdateWebhookSubscriptionData,
} from '../interfaces/webhook-subscription.repository.interface';

@Injectable()
export class WebhookSubscriptionPrismaRepository
  implements IWebhookSubscriptionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWebhookSubscriptionData) {
    return this.prisma.webhookSubscription.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        url: data.url,
        secret: data.secret,
        eventTypes: data.eventTypes,
        active: data.active ?? true,
        description: data.description ?? null,
        createdBy: data.createdBy,
      },
    });
  }

  findById(id: string, organizationId: string) {
    return this.prisma.webhookSubscription.findFirst({
      where: { id, organizationId },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActiveForEvent(organizationId: string, eventType: string) {
    return this.prisma.webhookSubscription.findMany({
      where: {
        organizationId,
        active: true,
        eventTypes: { has: eventType },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateWebhookSubscriptionData,
  ) {
    await this.prisma.webhookSubscription.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.prisma.webhookSubscription.findFirstOrThrow({
      where: { id, organizationId },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.prisma.webhookSubscription.deleteMany({
      where: { id, organizationId },
    });
  }
}
