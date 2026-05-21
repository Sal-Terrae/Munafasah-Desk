import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DpoTrainingRecord } from '@prisma/client';
import {
  CreateDpoTrainingRecordData,
  IDpoTrainingRecordRepository,
  UpdateDpoTrainingRecordData,
} from '../interfaces/dpo-training-record.repository.interface';

@Injectable()
export class FakeDpoTrainingRecordRepository
  implements IDpoTrainingRecordRepository
{
  readonly rows = new Map<string, DpoTrainingRecord>();

  async create(data: CreateDpoTrainingRecordData): Promise<DpoTrainingRecord> {
    const now = new Date();
    const row: DpoTrainingRecord = {
      id: randomUUID(),
      organizationId: data.organizationId,
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
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<DpoTrainingRecord | null> {
    const r = this.rows.get(id);
    if (!r || r.organizationId !== organizationId) return null;
    return { ...r };
  }

  async findAll(organizationId: string): Promise<DpoTrainingRecord[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .map((r) => ({ ...r }))
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
  }

  async findExpiringBefore(
    organizationId: string,
    cutoff: Date,
  ): Promise<DpoTrainingRecord[]> {
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          r.validUntil !== null &&
          r.validUntil <= cutoff,
      )
      .map((r) => ({ ...r }))
      .sort(
        (a, b) =>
          (a.validUntil?.getTime() ?? 0) - (b.validUntil?.getTime() ?? 0),
      );
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateDpoTrainingRecordData,
  ): Promise<DpoTrainingRecord> {
    const existing = this.rows.get(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundException('DpoTrainingRecord not found');
    }
    const updated: DpoTrainingRecord = {
      ...existing,
      ...(data.subjectName !== undefined && { subjectName: data.subjectName }),
      ...(data.subjectEmail !== undefined && {
        subjectEmail: data.subjectEmail,
      }),
      ...(data.topic !== undefined && { topic: data.topic }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.completedAt !== undefined && {
        completedAt: data.completedAt,
      }),
      ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
      ...(data.evidenceRef !== undefined && {
        evidenceRef: data.evidenceRef,
      }),
      ...(data.evidenceDocumentId !== undefined && {
        evidenceDocumentId: data.evidenceDocumentId,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    };
    this.rows.set(id, updated);
    return { ...updated };
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const existing = this.rows.get(id);
    if (existing && existing.organizationId === organizationId) {
      this.rows.delete(id);
    }
  }
}
