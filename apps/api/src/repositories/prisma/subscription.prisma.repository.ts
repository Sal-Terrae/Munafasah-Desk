import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  ISubscriptionRepository,
  UpsertSubscriptionData,
} from '../interfaces/subscription.repository.interface';

@Injectable()
export class SubscriptionPrismaRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrg(organizationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
    });
  }

  findByStripeSubscriptionId(stripeSubscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });
  }

  upsert(data: UpsertSubscriptionData) {
    return this.prisma.subscription.upsert({
      where: { organizationId: data.organizationId },
      create: {
        organization: { connect: { id: data.organizationId } },
        planCode: data.planCode,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      },
      update: {
        planCode: data.planCode,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      },
    });
  }
}
