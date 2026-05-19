import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IEvidenceLinkRepository } from '../interfaces/evidence-link.repository.interface';
import {
  CreateEvidenceLinkData,
  UpdateEvidenceLinkData,
} from '../types';

@Injectable()
export class EvidenceLinkPrismaRepository implements IEvidenceLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForItem(complianceItemId: string, organizationId: string) {
    return this.prisma.evidenceLink.findMany({
      where: { complianceItemId, organizationId },
    });
  }

  async findAllForDocument(documentId: string, organizationId: string) {
    return this.prisma.evidenceLink.findMany({
      where: { documentId, organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.evidenceLink.findFirst({
      where: { id, organizationId },
    });
  }

  async create(data: CreateEvidenceLinkData) {
    return this.prisma.evidenceLink.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        complianceItem: { connect: { id: data.complianceItemId } },
        document: { connect: { id: data.documentId } },
        note: data.note ?? null,
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateEvidenceLinkData,
  ) {
    const result = await this.prisma.evidenceLink.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error('EvidenceLink not found or not in organization');
    }
    return this.prisma.evidenceLink.findUnique({ where: { id } }) as any;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.prisma.evidenceLink.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }

  async unlink(
    complianceItemId: string,
    documentId: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.evidenceLink.deleteMany({
      where: { complianceItemId, documentId, organizationId },
    });
    return result.count > 0;
  }
}
