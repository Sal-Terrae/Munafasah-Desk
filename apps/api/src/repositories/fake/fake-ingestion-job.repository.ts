import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IngestionJob } from '@prisma/client';
import { IIngestionJobRepository } from '../interfaces/ingestion-job.repository.interface';
import {
  CreateIngestionJobData,
  IngestionKind,
  IngestionStatus,
  UpdateIngestionJobData,
} from '../types';

@Injectable()
export class FakeIngestionJobRepository implements IIngestionJobRepository {
  private records = new Map<string, IngestionJob>();

  async create(data: CreateIngestionJobData): Promise<IngestionJob> {
    const now = new Date();
    const job: IngestionJob = {
      id: randomUUID(),
      organizationId: data.organizationId,
      kind: data.kind,
      status: 'pending',
      payload: data.payload as never,
      result: null,
      errorMessage: null,
      attempts: 0,
      claimedBy: null,
      claimedAt: null,
      completedAt: null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(job.id, job);
    return { ...job };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<IngestionJob | null> {
    const j = this.records.get(id);
    return j && j.organizationId === organizationId ? { ...j } : null;
  }

  async findAll(
    organizationId: string,
    status?: IngestionStatus,
    kind?: IngestionKind,
  ): Promise<IngestionJob[]> {
    return Array.from(this.records.values())
      .filter(
        (j) =>
          j.organizationId === organizationId &&
          (status === undefined || j.status === status) &&
          (kind === undefined || j.kind === kind),
      )
      .map((j) => ({ ...j }));
  }

  async claimNext(
    workerId: string,
    kind?: IngestionKind,
  ): Promise<IngestionJob | null> {
    const pending = Array.from(this.records.values())
      .filter(
        (j) =>
          j.status === 'pending' &&
          (kind === undefined || j.kind === kind),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (pending.length === 0) return null;
    const next = pending[0];
    next.status = 'processing';
    next.claimedBy = workerId;
    next.claimedAt = new Date();
    next.attempts = (next.attempts ?? 0) + 1;
    next.updatedAt = new Date();
    return { ...next };
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateIngestionJobData,
  ): Promise<IngestionJob> {
    const j = this.records.get(id);
    if (!j || j.organizationId !== organizationId) {
      throw new Error('IngestionJob not found or not in organization');
    }
    if (data.status !== undefined) j.status = data.status;
    if (data.result !== undefined) j.result = data.result as never;
    if (data.errorMessage !== undefined) j.errorMessage = data.errorMessage;
    if (data.claimedBy !== undefined) j.claimedBy = data.claimedBy;
    if (data.claimedAt !== undefined) j.claimedAt = data.claimedAt;
    if (data.completedAt !== undefined) j.completedAt = data.completedAt;
    if (data.attempts !== undefined) j.attempts = data.attempts;
    j.updatedAt = new Date();
    return { ...j };
  }
}
