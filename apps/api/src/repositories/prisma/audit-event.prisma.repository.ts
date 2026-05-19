import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { IAuditEventRepository } from '../interfaces/audit-event.repository.interface';
import { CreateAuditEventData } from '../types';

@Injectable()
export class AuditEventPrismaRepository
  implements IAuditEventRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditEventData) {
    return this.prisma.auditEvent.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        user: { connect: { id: data.userId } },
        organization: { connect: { id: data.organizationId } },
        ...(data.details === undefined
          ? {}
          : { details: data.details as Prisma.InputJsonValue }),
      },
    });
  }
}
