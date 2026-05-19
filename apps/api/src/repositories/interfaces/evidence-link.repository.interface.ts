import { EvidenceLink } from '@prisma/client';
import { CreateEvidenceLinkData, UpdateEvidenceLinkData } from '../types';

export interface IEvidenceLinkRepository {
  findAllForItem(
    complianceItemId: string,
    organizationId: string,
  ): Promise<EvidenceLink[]>;
  findAllForDocument(
    documentId: string,
    organizationId: string,
  ): Promise<EvidenceLink[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<EvidenceLink | null>;
  create(data: CreateEvidenceLinkData): Promise<EvidenceLink>;
  update(
    id: string,
    organizationId: string,
    data: UpdateEvidenceLinkData,
  ): Promise<EvidenceLink>;
  delete(id: string, organizationId: string): Promise<boolean>;
  /** Idempotent unlink — returns true if a link existed and was removed. */
  unlink(
    complianceItemId: string,
    documentId: string,
    organizationId: string,
  ): Promise<boolean>;
}
