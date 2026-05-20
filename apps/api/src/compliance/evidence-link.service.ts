import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EvidenceLink } from '@prisma/client';
import { IEvidenceLinkRepository } from '../repositories/interfaces/evidence-link.repository.interface';
import { IComplianceItemRepository } from '../repositories/interfaces/compliance-item.repository.interface';
import { IClientDocumentRepository } from '../repositories/interfaces/client-document.repository.interface';
import { CLIENT_DOCUMENT_REPOSITORY, COMPLIANCE_ITEM_REPOSITORY, EVIDENCE_LINK_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class EvidenceLinkService {
  constructor(
    @Inject(EVIDENCE_LINK_REPOSITORY)
    private readonly links: IEvidenceLinkRepository,
    @Inject(COMPLIANCE_ITEM_REPOSITORY)
    private readonly items: IComplianceItemRepository,
    @Inject(CLIENT_DOCUMENT_REPOSITORY)
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

  listForDocument(
    documentId: string,
    organizationId: string,
  ): Promise<EvidenceLink[]> {
    return this.links.findAllForDocument(documentId, organizationId);
  }
}
