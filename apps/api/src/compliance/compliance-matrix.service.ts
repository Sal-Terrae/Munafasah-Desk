import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceMatrix, ComplianceItem } from '@prisma/client';
import { ComplianceMatrixPrismaRepository } from '../repositories/prisma/compliance-matrix.prisma.repository';
import { ComplianceItemPrismaRepository } from '../repositories/prisma/compliance-item.prisma.repository';
import { IComplianceMatrixRepository } from '../repositories/interfaces/compliance-matrix.repository.interface';
import { IComplianceItemRepository } from '../repositories/interfaces/compliance-item.repository.interface';
import { TenderService } from '../tender/tender.service';
import {
  ComplianceRequirement,
  ComplianceService,
  EvidenceDoc,
  GenerateOpts,
} from './compliance.service';

export interface GenerateAndPersistOpts extends GenerateOpts {
  /** If true (default), creates a new persisted matrix version. */
  persist?: boolean;
}

export interface PersistedMatrixWithItems {
  matrix: ComplianceMatrix;
  items: ComplianceItem[];
}

@Injectable()
export class ComplianceMatrixService {
  constructor(
    private readonly compute: ComplianceService,
    private readonly tenders: TenderService,
    @Inject(ComplianceMatrixPrismaRepository)
    private readonly matrices: IComplianceMatrixRepository,
    @Inject(ComplianceItemPrismaRepository)
    private readonly items: IComplianceItemRepository,
  ) {}

  /** Compute a new versioned matrix and persist it + its items atomically. */
  async generateAndPersist(
    tenderId: string,
    organizationId: string,
    requirements: ComplianceRequirement[],
    vault: EvidenceDoc[],
    opts: GenerateAndPersistOpts = {},
  ): Promise<PersistedMatrixWithItems> {
    await this.tenders.get(tenderId, organizationId); // tenant guard

    const latest = await this.matrices.latestForTender(
      tenderId,
      organizationId,
    );
    const nextVersion = (latest?.version ?? 0) + 1;

    // Pure compute first — deterministic, no side effects.
    const computed = this.compute.generateMatrix(
      tenderId,
      requirements,
      vault,
      { ...opts, previousVersion: nextVersion - 1 },
    );

    const matrix = await this.matrices.create({
      tenderId,
      organizationId,
      version: computed.version,
      status: 'draft',
      generatedAt: new Date(computed.generatedAt),
    });

    const items =
      computed.items.length === 0
        ? []
        : await this.items.createMany(
            computed.items.map((i) => ({
              matrixId: matrix.id,
              organizationId,
              requirementId: i.requirementId,
              requirementText: i.requirementText,
              category: i.category,
              owner: i.owner,
              risk: i.risk,
              status: i.status,
              dueDate: i.dueDate ? new Date(i.dueDate) : null,
            })),
          );

    return { matrix, items };
  }

  async listForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<ComplianceMatrix[]> {
    await this.tenders.get(tenderId, organizationId);
    return this.matrices.findAllForTender(tenderId, organizationId);
  }

  async getByVersion(
    tenderId: string,
    version: number,
    organizationId: string,
  ): Promise<PersistedMatrixWithItems> {
    await this.tenders.get(tenderId, organizationId);
    const matrix = await this.matrices.findByVersion(
      tenderId,
      version,
      organizationId,
    );
    if (!matrix) {
      throw new NotFoundException(
        `ComplianceMatrix version ${version} not found for tender ${tenderId}`,
      );
    }
    const items = await this.items.findAllForMatrix(
      matrix.id,
      organizationId,
    );
    return { matrix, items };
  }

  async updateItem(
    itemId: string,
    organizationId: string,
    data: {
      owner?: string;
      status?: string;
      risk?: string;
      dueDate?: Date | null;
    },
  ): Promise<ComplianceItem> {
    const existing = await this.items.findById(itemId, organizationId);
    if (!existing) {
      throw new NotFoundException('ComplianceItem not found');
    }
    return this.items.update(itemId, organizationId, data);
  }
}
