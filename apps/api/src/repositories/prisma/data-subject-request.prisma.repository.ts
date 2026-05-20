import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { IDataSubjectRequestRepository } from '../interfaces/data-subject-request.repository.interface';
import {
  CreateDataSubjectRequestData,
  DataSubjectRequestStatus,
  UpdateDataSubjectRequestData,
} from '../types';

@Injectable()
export class DataSubjectRequestPrismaRepository
  implements IDataSubjectRequestRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDataSubjectRequestData) {
    return this.prisma.dataSubjectRequest.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        type: data.type,
        subjectEmail: data.subjectEmail,
        requestedBy: data.requestedBy ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.dataSubjectRequest.findFirst({
      where: { id, organizationId },
    });
  }

  async findAll(
    organizationId: string,
    status?: DataSubjectRequestStatus,
  ) {
    return this.prisma.dataSubjectRequest.findMany({
      where: {
        organizationId,
        ...(status === undefined ? {} : { status }),
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findForSubject(subjectEmail: string, organizationId: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { subjectEmail, organizationId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateDataSubjectRequestData,
  ) {
    const result = await this.prisma.dataSubjectRequest.updateMany({
      where: { id, organizationId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.decidedBy !== undefined ? { decidedBy: data.decidedBy } : {}),
        ...(data.decidedAt !== undefined ? { decidedAt: data.decidedAt } : {}),
        ...(data.completedAt !== undefined
          ? { completedAt: data.completedAt }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.payload !== undefined
          ? { payload: data.payload as Prisma.InputJsonValue }
          : {}),
      },
    });
    if (result.count === 0) {
      throw new Error(
        'DataSubjectRequest not found or not in organization',
      );
    }
    return this.prisma.dataSubjectRequest.findUniqueOrThrow({
      where: { id },
    });
  }
}
