import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  CreateWebhookDeliveryData,
  IWebhookDeliveryRepository,
  UpdateWebhookDeliveryData,
} from '../interfaces/webhook-delivery.repository.interface';

@Injectable()
export class WebhookDeliveryPrismaRepository
  implements IWebhookDeliveryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWebhookDeliveryData) {
    return this.prisma.webhookDelivery.create({
      data: {
        subscription: { connect: { id: data.subscriptionId } },
        organization: { connect: { id: data.organizationId } },
        eventType: data.eventType,
        payload: data.payload as Prisma.InputJsonValue,
      },
    });
  }

  findById(id: string, organizationId: string) {
    return this.prisma.webhookDelivery.findFirst({
      where: { id, organizationId },
    });
  }

  findRecent(organizationId: string, limit = 100) {
    return this.prisma.webhookDelivery.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  update(id: string, data: UpdateWebhookDeliveryData) {
    return this.prisma.webhookDelivery.update({
      where: { id },
      data,
    });
  }
}
