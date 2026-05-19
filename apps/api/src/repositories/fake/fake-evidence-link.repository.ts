import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EvidenceLink } from '@prisma/client';
import { IEvidenceLinkRepository } from '../interfaces/evidence-link.repository.interface';
import {
  CreateEvidenceLinkData,
  UpdateEvidenceLinkData,
} from '../types';

@Injectable()
export class FakeEvidenceLinkRepository implements IEvidenceLinkRepository {
  private records = new Map<string, EvidenceLink>();

  async findAllForItem(
    complianceItemId: string,
    organizationId: string,
  ): Promise<EvidenceLink[]> {
    return Array.from(this.records.values()).filter(
      (l) =>
        l.complianceItemId === complianceItemId &&
        l.organizationId === organizationId,
    );
  }

  async findAllForDocument(
    documentId: string,
    organizationId: string,
  ): Promise<EvidenceLink[]> {
    return Array.from(this.records.values()).filter(
      (l) =>
        l.documentId === documentId && l.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<EvidenceLink | null> {
    const l = this.records.get(id);
    return l && l.organizationId === organizationId ? { ...l } : null;
  }

  async create(data: CreateEvidenceLinkData): Promise<EvidenceLink> {
    // Enforce @@unique([complianceItemId, documentId])
    const clash = Array.from(this.records.values()).find(
      (l) =>
        l.complianceItemId === data.complianceItemId &&
        l.documentId === data.documentId,
    );
    if (clash) {
      throw new Error(
        'EvidenceLink already exists for this item/document pair',
      );
    }
    const now = new Date();
    const l: EvidenceLink = {
      id: randomUUID(),
      organizationId: data.organizationId,
      complianceItemId: data.complianceItemId,
      documentId: data.documentId,
      note: data.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(l.id, l);
    return { ...l };
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateEvidenceLinkData,
  ): Promise<EvidenceLink> {
    const l = this.records.get(id);
    if (!l || l.organizationId !== organizationId) {
      throw new Error('EvidenceLink not found or not in organization');
    }
    if (data.note !== undefined) l.note = data.note;
    l.updatedAt = new Date();
    return { ...l };
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const l = this.records.get(id);
    if (!l || l.organizationId !== organizationId) return false;
    return this.records.delete(id);
  }

  async unlink(
    complianceItemId: string,
    documentId: string,
    organizationId: string,
  ): Promise<boolean> {
    for (const l of this.records.values()) {
      if (
        l.complianceItemId === complianceItemId &&
        l.documentId === documentId &&
        l.organizationId === organizationId
      ) {
        return this.records.delete(l.id);
      }
    }
    return false;
  }
}
