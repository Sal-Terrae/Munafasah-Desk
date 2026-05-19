import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClientDocument } from '@prisma/client';
import { IClientDocumentRepository } from '../interfaces/client-document.repository.interface';
import {
  CreateClientDocumentData,
  UpdateClientDocumentData,
} from '../types';

@Injectable()
export class FakeClientDocumentRepository
  implements IClientDocumentRepository
{
  private records = new Map<string, ClientDocument>();

  async findAll(organizationId: string): Promise<ClientDocument[]> {
    return Array.from(this.records.values()).filter(
      (d) => d.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<ClientDocument | null> {
    const doc = this.records.get(id);
    if (doc && doc.organizationId === organizationId) {
      return doc;
    }
    return null;
  }

  async create(data: CreateClientDocumentData): Promise<ClientDocument> {
    const doc: ClientDocument = {
      id: randomUUID(),
      filename: data.filename,
      tenderId: data.tenderId,
      organizationId: data.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(doc.id, doc);
    return doc;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateClientDocumentData,
  ): Promise<ClientDocument> {
    const doc = this.records.get(id);
    if (!doc || doc.organizationId !== organizationId) {
      throw new Error('ClientDocument not found or not in organization');
    }
    if (data.filename !== undefined) {
      doc.filename = data.filename;
    }
    doc.updatedAt = new Date();
    return doc;
  }

  async delete(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const doc = this.records.get(id);
    if (!doc || doc.organizationId !== organizationId) {
      return false;
    }
    return this.records.delete(id);
  }
}
