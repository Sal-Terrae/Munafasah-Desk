import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientDocument, UserRole } from '@prisma/client';
import { ClientDocumentPrismaRepository } from '../repositories/prisma/client-document.prisma.repository';
import { IClientDocumentRepository } from '../repositories/interfaces/client-document.repository.interface';
import { canReadSensitivity } from '../pdpl/sensitivity';

export interface RegisterDocumentInput {
  filename: string;
  // P10: documents now belong to a ClientCompany and are reusable
  // across tenders via EvidenceLink (PRD ERD §3).
  clientCompanyId: string;
  documentType?: string;
  sensitivity?: string;
  expiresAt?: Date | null;
}

@Injectable()
export class DocumentVaultService {
  constructor(
    @Inject(ClientDocumentPrismaRepository)
    private readonly repo: IClientDocumentRepository,
  ) {}

  register(
    input: RegisterDocumentInput,
    organizationId: string,
  ): Promise<ClientDocument> {
    return this.repo.create({
      filename: input.filename,
      clientCompanyId: input.clientCompanyId,
      organizationId,
      documentType: input.documentType ?? 'other',
      sensitivity: input.sensitivity ?? 'low',
      state: 'active',
      expiresAt: input.expiresAt ?? null,
    });
  }

  list(organizationId: string): Promise<ClientDocument[]> {
    return this.repo.findAll(organizationId);
  }

  async get(
    id: string,
    organizationId: string,
    readerRole?: UserRole,
  ): Promise<ClientDocument> {
    const doc = await this.repo.findById(id, organizationId);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    // Sensitivity-class ACL: lie with 404 to non-readers so the
    // existence of a sensitive document isn't disclosed by the
    // status code (audit-findings.md §4 sensitive-data row).
    if (readerRole && !canReadSensitivity(readerRole, doc.sensitivity)) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }

  setState(
    id: string,
    organizationId: string,
    state: 'active' | 'expiring' | 'restricted' | 'archived',
  ): Promise<ClientDocument> {
    return this.repo.update(id, organizationId, { state });
  }

  /** Attach the just-uploaded blob handle to the row. Separated from
   *  `register` because the row id is needed to build the storage key
   *  before the object-store put runs. */
  attachBlob(
    id: string,
    organizationId: string,
    blob: {
      storageKey: string;
      contentType: string;
      sizeBytes: number;
    },
  ): Promise<ClientDocument> {
    return this.repo.update(id, organizationId, blob);
  }

  delete(id: string, organizationId: string): Promise<boolean> {
    return this.repo.delete(id, organizationId);
  }

  /** Documents that expire on/before `before` and are not archived. */
  async listExpiring(
    organizationId: string,
    before: Date,
  ): Promise<ClientDocument[]> {
    const all = await this.repo.findAll(organizationId);
    return all.filter(
      (d) =>
        d.state !== 'archived' &&
        d.expiresAt !== null &&
        d.expiresAt <= before,
    );
  }
}
