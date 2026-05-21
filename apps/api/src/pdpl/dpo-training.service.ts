import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DpoTrainingRecord } from '@prisma/client';
import {
  CreateDpoTrainingRecordData,
  IDpoTrainingRecordRepository,
  UpdateDpoTrainingRecordData,
} from '../repositories/interfaces/dpo-training-record.repository.interface';
import { DPO_TRAINING_RECORD_REPOSITORY } from '../repositories/tokens';

export type TrainingExpiryStatus = 'no-expiry' | 'active' | 'expiring' | 'expired';

export interface TrainingRecordWithStatus extends DpoTrainingRecord {
  expiryStatus: TrainingExpiryStatus;
  daysUntilExpiry: number | null;
}

export interface TrainingListFilter {
  status?: TrainingExpiryStatus | 'all';
}

const EXPIRING_WINDOW_DAYS = 60;

@Injectable()
export class DpoTrainingService {
  constructor(
    @Inject(DPO_TRAINING_RECORD_REPOSITORY)
    private readonly repo: IDpoTrainingRecordRepository,
  ) {}

  async list(
    organizationId: string,
    filter: TrainingListFilter = {},
    now: Date = new Date(),
  ): Promise<TrainingRecordWithStatus[]> {
    const rows = await this.repo.findAll(organizationId);
    const enriched = rows.map((r) => this.enrich(r, now));
    if (!filter.status || filter.status === 'all') return enriched;
    return enriched.filter((r) => r.expiryStatus === filter.status);
  }

  async get(
    id: string,
    organizationId: string,
    now: Date = new Date(),
  ): Promise<TrainingRecordWithStatus> {
    const row = await this.repo.findById(id, organizationId);
    if (!row) throw new NotFoundException('DpoTrainingRecord not found');
    return this.enrich(row, now);
  }

  async create(
    organizationId: string,
    recordedBy: string,
    input: Omit<CreateDpoTrainingRecordData, 'organizationId' | 'recordedBy'>,
  ): Promise<TrainingRecordWithStatus> {
    this.validate(input);
    const row = await this.repo.create({
      organizationId,
      recordedBy,
      ...input,
      // Defensive trim — schema accepts any non-empty, but stray
      // whitespace muddies search + uniqueness assertions later.
      subjectName: input.subjectName.trim(),
      subjectEmail: input.subjectEmail.trim().toLowerCase(),
      topic: input.topic.trim(),
      provider: input.provider?.trim() || null,
      evidenceRef: input.evidenceRef?.trim() || null,
      notes: input.notes?.trim() || null,
    });
    return this.enrich(row);
  }

  async update(
    id: string,
    organizationId: string,
    input: UpdateDpoTrainingRecordData,
  ): Promise<TrainingRecordWithStatus> {
    await this.get(id, organizationId); // tenant guard + 404
    this.validatePartial(input);
    const cleaned: UpdateDpoTrainingRecordData = {
      ...input,
      ...(input.subjectName !== undefined && {
        subjectName: input.subjectName.trim(),
      }),
      ...(input.subjectEmail !== undefined && {
        subjectEmail: input.subjectEmail.trim().toLowerCase(),
      }),
      ...(input.topic !== undefined && { topic: input.topic.trim() }),
      ...(input.provider !== undefined && {
        provider: input.provider?.trim() || null,
      }),
      ...(input.evidenceRef !== undefined && {
        evidenceRef: input.evidenceRef?.trim() || null,
      }),
      ...(input.notes !== undefined && {
        notes: input.notes?.trim() || null,
      }),
    };
    const row = await this.repo.update(id, organizationId, cleaned);
    return this.enrich(row);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.get(id, organizationId); // tenant guard + 404
    await this.repo.delete(id, organizationId);
  }

  /** Summary counts for the dashboard tile. */
  async summary(
    organizationId: string,
    now: Date = new Date(),
  ): Promise<{
    total: number;
    active: number;
    expiring: number;
    expired: number;
    noExpiry: number;
  }> {
    const rows = await this.list(organizationId, { status: 'all' }, now);
    const out = { total: rows.length, active: 0, expiring: 0, expired: 0, noExpiry: 0 };
    for (const r of rows) {
      if (r.expiryStatus === 'active') out.active++;
      else if (r.expiryStatus === 'expiring') out.expiring++;
      else if (r.expiryStatus === 'expired') out.expired++;
      else out.noExpiry++;
    }
    return out;
  }

  private enrich(
    row: DpoTrainingRecord,
    now: Date = new Date(),
  ): TrainingRecordWithStatus {
    let expiryStatus: TrainingExpiryStatus = 'no-expiry';
    let daysUntilExpiry: number | null = null;
    if (row.validUntil) {
      const diff = row.validUntil.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diff / 86_400_000);
      if (diff < 0) {
        expiryStatus = 'expired';
      } else if (daysUntilExpiry <= EXPIRING_WINDOW_DAYS) {
        expiryStatus = 'expiring';
      } else {
        expiryStatus = 'active';
      }
    }
    return { ...row, expiryStatus, daysUntilExpiry };
  }

  private validate(
    input: Omit<CreateDpoTrainingRecordData, 'organizationId' | 'recordedBy'>,
  ): void {
    if (!input.subjectName || !input.subjectName.trim()) {
      throw new BadRequestException('subjectName required');
    }
    if (!input.subjectEmail || !input.subjectEmail.includes('@')) {
      throw new BadRequestException('subjectEmail must be a valid email');
    }
    if (!input.topic || !input.topic.trim()) {
      throw new BadRequestException('topic required');
    }
    if (!input.completedAt) {
      throw new BadRequestException('completedAt required');
    }
    if (
      input.validUntil &&
      input.validUntil.getTime() < input.completedAt.getTime()
    ) {
      throw new BadRequestException(
        'validUntil cannot be earlier than completedAt',
      );
    }
  }

  private validatePartial(input: UpdateDpoTrainingRecordData): void {
    if (input.subjectName !== undefined && !input.subjectName.trim()) {
      throw new BadRequestException('subjectName cannot be blank');
    }
    if (
      input.subjectEmail !== undefined &&
      !input.subjectEmail.includes('@')
    ) {
      throw new BadRequestException('subjectEmail must be a valid email');
    }
    if (input.topic !== undefined && !input.topic.trim()) {
      throw new BadRequestException('topic cannot be blank');
    }
    if (
      input.completedAt !== undefined &&
      input.validUntil !== undefined &&
      input.validUntil !== null &&
      input.validUntil.getTime() < input.completedAt.getTime()
    ) {
      throw new BadRequestException(
        'validUntil cannot be earlier than completedAt',
      );
    }
  }
}
