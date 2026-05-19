import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientDocument } from '@prisma/client';
import { ClientDocumentPrismaRepository } from '../repositories/prisma/client-document.prisma.repository';
import { IClientDocumentRepository } from '../repositories/interfaces/client-document.repository.interface';

export interface RegisterDocumentInput {
  filename: string;
  tenderId: string;
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
      tenderId: input.tenderId,
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
  ): Promise<ClientDocument> {
    const doc = await this.repo.findById(id, organizationId);
    if (!doc) {
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
