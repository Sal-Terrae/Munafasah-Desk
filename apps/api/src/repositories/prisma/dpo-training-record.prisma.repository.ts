import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  CreateDpoTrainingRecordData,
  IDpoTrainingRecordRepository,
  UpdateDpoTrainingRecordData,
} from '../interfaces/dpo-training-record.repository.interface';

@Injectable()
export class DpoTrainingRecordPrismaRepository
  implements IDpoTrainingRecordRepository
{
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDpoTrainingRecordData) {
    return this.prisma.dpoTrainingRecord.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        userId: data.userId ?? null,
        subjectName: data.subjectName,
        subjectEmail: data.subjectEmail,
        topic: data.topic,
        provider: data.provider ?? null,
        completedAt: data.completedAt,
        validUntil: data.validUntil ?? null,
        evidenceRef: data.evidenceRef ?? null,
        evidenceDocumentId: data.evidenceDocumentId ?? null,
        notes: data.notes ?? null,
        recordedBy: data.recordedBy,
      },
    });
  }

  findById(id: string, organizationId: string) {
    return this.prisma.dpoTrainingRecord.findFirst({
      where: { id, organizationId },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.dpoTrainingRecord.findMany({
      where: { organizationId },
      orderBy: { completedAt: 'desc' },
    });
  }

  findExpiringBefore(organizationId: string, cutoff: Date) {
    return this.prisma.dpoTrainingRecord.findMany({
      where: {
        organizationId,
        validUntil: { not: null, lte: cutoff },
      },
      orderBy: { validUntil: 'asc' },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateDpoTrainingRecordData,
  ) {
    // updateMany with composite where, then re-fetch — cheaper than
    // a tenant-guarded findFirst + update transaction and equally
    // safe because the composite where rejects cross-tenant rows.
    await this.prisma.dpoTrainingRecord.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.prisma.dpoTrainingRecord.findFirstOrThrow({
      where: { id, organizationId },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.prisma.dpoTrainingRecord.deleteMany({
      where: { id, organizationId },
    });
  }
}
