import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma, IngestionJob } from '@prisma/client';
import { IngestionJobPrismaRepository } from '../repositories/prisma/ingestion-job.prisma.repository';
import { IIngestionJobRepository } from '../repositories/interfaces/ingestion-job.repository.interface';
import { AuditService } from '../audit/audit.service';
import {
  IngestionKind,
  IngestionStatus,
} from '../repositories/types';

export interface EnqueueInput {
  organizationId: string;
  kind: IngestionKind;
  payload: Prisma.JsonValue;
  createdBy: string | null;
}

@Injectable()
export class IngestionService {
  constructor(
    @Inject(IngestionJobPrismaRepository)
    private readonly repo: IIngestionJobRepository,
    private readonly audit: AuditService,
  ) {}

  async enqueue(input: EnqueueInput): Promise<IngestionJob> {
    if (!input.kind) {
      throw new BadRequestException('kind required');
    }
    const job = await this.repo.create(input);
    await this.audit.record({
      action: 'ingestion.enqueue',
      entityType: 'IngestionJob',
      entityId: job.id,
      userId: input.createdBy,
      organizationId: input.organizationId,
      details: { kind: input.kind },
    });
    return job;
  }

  list(
    organizationId: string,
    status?: IngestionStatus,
    kind?: IngestionKind,
  ): Promise<IngestionJob[]> {
    return this.repo.findAll(organizationId, status, kind);
  }

  async get(
    id: string,
    organizationId: string,
  ): Promise<IngestionJob> {
    const job = await this.repo.findById(id, organizationId);
    if (!job) throw new NotFoundException('IngestionJob not found');
    return job;
  }

  /** Worker-only: claim the oldest pending job, optionally filtered. */
  claimNext(
    workerId: string,
    kind?: IngestionKind,
  ): Promise<IngestionJob | null> {
    return this.repo.claimNext(workerId, kind);
  }

  /** Worker-only: mark a previously-claimed job complete with a result. */
  async complete(
    id: string,
    organizationId: string,
    result: Prisma.JsonValue,
  ): Promise<IngestionJob> {
    const job = await this.get(id, organizationId);
    if (job.status !== 'processing') {
      throw new BadRequestException(
        `job not in processing state (got ${job.status})`,
      );
    }
    return this.repo.update(id, organizationId, {
      status: 'completed',
      result,
      completedAt: new Date(),
    });
  }

  /** Worker-only: mark a job failed. */
  async fail(
    id: string,
    organizationId: string,
    errorMessage: string,
  ): Promise<IngestionJob> {
    const job = await this.get(id, organizationId);
    if (job.status !== 'processing') {
      throw new BadRequestException(
        `job not in processing state (got ${job.status})`,
      );
    }
    return this.repo.update(id, organizationId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
  }
}
