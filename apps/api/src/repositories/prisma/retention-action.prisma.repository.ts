import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IRetentionActionRepository } from '../interfaces/retention-action.repository.interface';
import {
  CreateRetentionActionData,
  RetentionActionStatus,
  UpdateRetentionActionData,
} from '../types';

@Injectable()
export class RetentionActionPrismaRepository
  implements IRetentionActionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRetentionActionData) {
    return this.prisma.retentionAction.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        documentId: data.documentId,
        action: data.action,
        reason: data.reason,
        requestedBy: data.requestedBy,
      },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.retentionAction.findFirst({
      where: { id, organizationId },
    });
  }

  async findAll(
    organizationId: string,
    status?: RetentionActionStatus,
  ) {
    return this.prisma.retentionAction.findMany({
      where: {
        organizationId,
        ...(status === undefined ? {} : { status }),
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findForDocument(documentId: string, organizationId: string) {
    return this.prisma.retentionAction.findMany({
      where: { documentId, organizationId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateRetentionActionData,
  ) {
    const result = await this.prisma.retentionAction.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error('RetentionAction not found or not in organization');
    }
    return this.prisma.retentionAction.findUniqueOrThrow({
      where: { id },
    });
  }
}
