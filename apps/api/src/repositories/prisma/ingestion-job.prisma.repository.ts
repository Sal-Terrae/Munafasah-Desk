import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { IIngestionJobRepository } from '../interfaces/ingestion-job.repository.interface';
import {
  CreateIngestionJobData,
  IngestionKind,
  IngestionStatus,
  UpdateIngestionJobData,
} from '../types';

@Injectable()
export class IngestionJobPrismaRepository
  implements IIngestionJobRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateIngestionJobData) {
    return this.prisma.ingestionJob.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        kind: data.kind,
        payload: data.payload as Prisma.InputJsonValue,
        createdBy: data.createdBy ?? null,
      },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.ingestionJob.findFirst({
      where: { id, organizationId },
    });
  }

  async findAll(
    organizationId: string,
    status?: IngestionStatus,
    kind?: IngestionKind,
  ) {
    return this.prisma.ingestionJob.findMany({
      where: {
        organizationId,
        ...(status === undefined ? {} : { status }),
        ...(kind === undefined ? {} : { kind }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Atomic claim using Postgres `SELECT ... FOR UPDATE SKIP LOCKED`
   * in a transaction. Prevents two workers from claiming the same job.
   */
  async claimNext(workerId: string, kind?: IngestionKind) {
    return this.prisma.$transaction(async (tx) => {
      const rows: { id: string }[] = kind
        ? await tx.$queryRaw<{ id: string }[]>(
            Prisma.sql`SELECT id FROM "IngestionJob"
                       WHERE status = 'pending' AND kind = ${kind}
                       ORDER BY "createdAt" ASC
                       FOR UPDATE SKIP LOCKED
                       LIMIT 1`,
          )
        : await tx.$queryRaw<{ id: string }[]>(
            Prisma.sql`SELECT id FROM "IngestionJob"
                       WHERE status = 'pending'
                       ORDER BY "createdAt" ASC
                       FOR UPDATE SKIP LOCKED
                       LIMIT 1`,
          );
      if (rows.length === 0) return null;
      const claimed = await tx.ingestionJob.update({
        where: { id: rows[0].id },
        data: {
          status: 'processing',
          claimedBy: workerId,
          claimedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      return claimed;
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateIngestionJobData,
  ) {
    const result = await this.prisma.ingestionJob.updateMany({
      where: { id, organizationId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.result !== undefined
          ? { result: data.result as Prisma.InputJsonValue }
          : {}),
        ...(data.errorMessage !== undefined
          ? { errorMessage: data.errorMessage }
          : {}),
        ...(data.claimedBy !== undefined ? { claimedBy: data.claimedBy } : {}),
        ...(data.claimedAt !== undefined ? { claimedAt: data.claimedAt } : {}),
        ...(data.completedAt !== undefined
          ? { completedAt: data.completedAt }
          : {}),
        ...(data.attempts !== undefined ? { attempts: data.attempts } : {}),
      },
    });
    if (result.count === 0) {
      throw new Error('IngestionJob not found or not in organization');
    }
    return this.prisma.ingestionJob.findUniqueOrThrow({ where: { id } });
  }
}
