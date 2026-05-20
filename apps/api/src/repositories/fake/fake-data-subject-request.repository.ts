import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSubjectRequest } from '@prisma/client';
import { IDataSubjectRequestRepository } from '../interfaces/data-subject-request.repository.interface';
import {
  CreateDataSubjectRequestData,
  DataSubjectRequestStatus,
  UpdateDataSubjectRequestData,
} from '../types';

@Injectable()
export class FakeDataSubjectRequestRepository
  implements IDataSubjectRequestRepository
{
  private records = new Map<string, DataSubjectRequest>();

  async create(
    data: CreateDataSubjectRequestData,
  ): Promise<DataSubjectRequest> {
    const now = new Date();
    const r: DataSubjectRequest = {
      id: randomUUID(),
      organizationId: data.organizationId,
      type: data.type,
      subjectEmail: data.subjectEmail,
      status: 'pending',
      requestedBy: data.requestedBy ?? null,
      requestedAt: now,
      decidedBy: null,
      decidedAt: null,
      completedAt: null,
      notes: data.notes ?? null,
      payload: null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(r.id, r);
    return { ...r };
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<DataSubjectRequest | null> {
    const r = this.records.get(id);
    return r && r.organizationId === organizationId ? { ...r } : null;
  }

  async findAll(
    organizationId: string,
    status?: DataSubjectRequestStatus,
  ): Promise<DataSubjectRequest[]> {
    return Array.from(this.records.values())
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          (status === undefined || r.status === status),
      )
      .map((r) => ({ ...r }));
  }

  async findForSubject(
    subjectEmail: string,
    organizationId: string,
  ): Promise<DataSubjectRequest[]> {
    return Array.from(this.records.values())
      .filter(
        (r) =>
          r.subjectEmail === subjectEmail &&
          r.organizationId === organizationId,
      )
      .map((r) => ({ ...r }));
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateDataSubjectRequestData,
  ): Promise<DataSubjectRequest> {
    const r = this.records.get(id);
    if (!r || r.organizationId !== organizationId) {
      throw new Error(
        'DataSubjectRequest not found or not in organization',
      );
    }
    if (data.status !== undefined) r.status = data.status;
    if (data.decidedBy !== undefined) r.decidedBy = data.decidedBy;
    if (data.decidedAt !== undefined) r.decidedAt = data.decidedAt;
    if (data.completedAt !== undefined) r.completedAt = data.completedAt;
    if (data.notes !== undefined) r.notes = data.notes;
    if (data.payload !== undefined) r.payload = data.payload as never;
    r.updatedAt = new Date();
    return { ...r };
  }
}
