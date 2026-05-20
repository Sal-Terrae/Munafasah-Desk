import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RetentionAction } from '@prisma/client';
import { IRetentionActionRepository } from '../interfaces/retention-action.repository.interface';
import {
  CreateRetentionActionData,
  RetentionActionStatus,
  UpdateRetentionActionData,
} from '../types';

@Injectable()
export class FakeRetentionActionRepository
  implements IRetentionActionRepository
{
  private records = new Map<string, RetentionAction>();

  async create(data: CreateRetentionActionData): Promise<RetentionAction> {
    const now = new Date();
    const r: RetentionAction = {
      id: randomUUID(),
      organizationId: data.organizationId,
      documentId: data.documentId,
      action: data.action,
      reason: data.reason,
      requestedBy: data.requestedBy,
      requestedAt: now,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      executedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(r.id, r);
    return { ...r };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<RetentionAction | null> {
    const r = this.records.get(id);
    return r && r.organizationId === organizationId ? { ...r } : null;
  }

  async findAll(
    organizationId: string,
    status?: RetentionActionStatus,
  ): Promise<RetentionAction[]> {
    return Array.from(this.records.values())
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          (status === undefined || r.status === status),
      )
      .map((r) => ({ ...r }));
  }

  async findForDocument(
    documentId: string,
    organizationId: string,
  ): Promise<RetentionAction[]> {
    return Array.from(this.records.values())
      .filter(
        (r) =>
          r.documentId === documentId &&
          r.organizationId === organizationId,
      )
      .map((r) => ({ ...r }));
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateRetentionActionData,
  ): Promise<RetentionAction> {
    const r = this.records.get(id);
    if (!r || r.organizationId !== organizationId) {
      throw new Error('RetentionAction not found or not in organization');
    }
    if (data.status !== undefined) r.status = data.status;
    if (data.decidedBy !== undefined) r.decidedBy = data.decidedBy;
    if (data.decidedAt !== undefined) r.decidedAt = data.decidedAt;
    if (data.executedAt !== undefined) r.executedAt = data.executedAt;
    r.updatedAt = new Date();
    return { ...r };
  }
}
