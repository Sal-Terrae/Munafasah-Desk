import { IngestionJob } from '@prisma/client';
import {
  CreateIngestionJobData,
  IngestionKind,
  IngestionStatus,
  UpdateIngestionJobData,
} from '../types';

export interface IIngestionJobRepository {
  create(data: CreateIngestionJobData): Promise<IngestionJob>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<IngestionJob | null>;
  findAll(
    organizationId: string,
    status?: IngestionStatus,
    kind?: IngestionKind,
  ): Promise<IngestionJob[]>;
  /**
   * Atomically claim the oldest pending job (optionally filtered by
   * kind). Returns the claimed row or null when none are pending.
   * Implementations should use a tx + locking strategy to be safe
   * under concurrent workers; the fake is single-process so a simple
   * find+update is sufficient.
   */
  claimNext(
    workerId: string,
    kind?: IngestionKind,
  ): Promise<IngestionJob | null>;
  update(
    id: string,
    organizationId: string,
    data: UpdateIngestionJobData,
  ): Promise<IngestionJob>;
}
