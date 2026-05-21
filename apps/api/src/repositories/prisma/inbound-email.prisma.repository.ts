import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  CreateInboundEmailData,
  IInboundEmailRepository,
} from '../interfaces/inbound-email.repository.interface';

@Injectable()
export class InboundEmailPrismaRepository implements IInboundEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByMessageId(messageId: string) {
    return this.prisma.inboundEmail.findUnique({ where: { messageId } });
  }

  create(data: CreateInboundEmailData) {
    return this.prisma.inboundEmail.create({
      data: {
        messageId: data.messageId,
        organizationId: data.organizationId ?? null,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        subject: data.subject ?? null,
        body: data.body,
        status: data.status,
        routedAction: data.routedAction ?? null,
        routedEntityType: data.routedEntityType ?? null,
        routedEntityId: data.routedEntityId ?? null,
        rejectionReason: data.rejectionReason ?? null,
        ...(data.receivedAt && { receivedAt: data.receivedAt }),
      },
    });
  }

  findRecent(organizationId: string, limit = 100) {
    return this.prisma.inboundEmail.findMany({
      where: { organizationId },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  }
}
