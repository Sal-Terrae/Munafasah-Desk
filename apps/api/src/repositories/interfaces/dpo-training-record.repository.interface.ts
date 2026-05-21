import { DpoTrainingRecord } from '@prisma/client';

export interface CreateDpoTrainingRecordData {
  organizationId: string;
  userId?: string | null;
  subjectName: string;
  subjectEmail: string;
  topic: string;
  provider?: string | null;
  completedAt: Date;
  validUntil?: Date | null;
  evidenceRef?: string | null;
  evidenceDocumentId?: string | null;
  notes?: string | null;
  recordedBy: string;
}

export interface UpdateDpoTrainingRecordData {
  subjectName?: string;
  subjectEmail?: string;
  topic?: string;
  provider?: string | null;
  completedAt?: Date;
  validUntil?: Date | null;
  evidenceRef?: string | null;
  evidenceDocumentId?: string | null;
  notes?: string | null;
}

export interface IDpoTrainingRecordRepository {
  create(data: CreateDpoTrainingRecordData): Promise<DpoTrainingRecord>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<DpoTrainingRecord | null>;
  findAll(organizationId: string): Promise<DpoTrainingRecord[]>;
  /** Rows with non-null validUntil that fall on/before the cutoff. */
  findExpiringBefore(
    organizationId: string,
    cutoff: Date,
  ): Promise<DpoTrainingRecord[]>;
  update(
    id: string,
    organizationId: string,
    data: UpdateDpoTrainingRecordData,
  ): Promise<DpoTrainingRecord>;
  delete(id: string, organizationId: string): Promise<void>;
}
