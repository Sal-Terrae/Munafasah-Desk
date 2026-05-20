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
        ...(data.userId === null
          ? {}
          : { user: { connect: { id: data.userId } } }),
        organization: { connect: { id: data.organizationId } },
        ...(data.details === undefined
          ? {}
          : { details: data.details as Prisma.InputJsonValue }),
      },
    });
  }

  async findForUser(userId: string, organizationId: string) {
    return this.prisma.auditEvent.findMany({
      where: { userId, organizationId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async anonymiseUser(
    userId: string,
    organizationId: string,
  ): Promise<number> {
    const result = await this.prisma.auditEvent.updateMany({
      where: { userId, organizationId },
      data: { userId: null },
    });
    return result.count;
  }
}
