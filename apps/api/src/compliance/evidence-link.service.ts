import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceLink } from '@prisma/client';
import { EvidenceLinkPrismaRepository } from '../repositories/prisma/evidence-link.prisma.repository';
import { ComplianceItemPrismaRepository } from '../repositories/prisma/compliance-item.prisma.repository';
import { ClientDocumentPrismaRepository } from '../repositories/prisma/client-document.prisma.repository';
import { IEvidenceLinkRepository } from '../repositories/interfaces/evidence-link.repository.interface';
import { IComplianceItemRepository } from '../repositories/interfaces/compliance-item.repository.interface';
import { IClientDocumentRepository } from '../repositories/interfaces/client-document.repository.interface';

@Injectable()
export class EvidenceLinkService {
  constructor(
    @Inject(EvidenceLinkPrismaRepository)
    private readonly links: IEvidenceLinkRepository,
    @Inject(ComplianceItemPrismaRepository)
    private readonly items: IComplianceItemRepository,
    @Inject(ClientDocumentPrismaRepository)
    private readonly documents: IClientDocumentRepository,
  ) {}

  async link(
    complianceItemId: string,
    documentId: string,
    organizationId: string,
    note?: string | null,
  ): Promise<EvidenceLink> {
    // Tenant-scoped existence checks before linking — refuse to cross
    // tenant boundaries even if the FK would technically allow it.
    const item = await this.items.findById(complianceItemId, organizationId);
    if (!item) {
      throw new NotFoundException('ComplianceItem not found');
    }
    const doc = await this.documents.findById(documentId, organizationId);
    if (!doc) {
      throw new NotFoundException('ClientDocument not found');
    }
    return this.links.create({
      organizationId,
      complianceItemId,
      documentId,
      note: note ?? null,
    });
  }

  async unlink(
    complianceItemId: string,
    documentId: string,
    organizationId: string,
  ): Promise<{ removed: boolean }> {
    const removed = await this.links.unlink(
      complianceItemId,
      documentId,
      organizationId,
    );
    return { removed };
  }

  listForItem(
    complianceItemId: string,
    organizationId: string,
  ): Promise<EvidenceLink[]> {
    return this.links.findAllForItem(complianceItemId, organizationId);
  }
}
