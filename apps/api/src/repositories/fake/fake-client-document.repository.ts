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
      documentType: data.documentType ?? 'other',
      sensitivity: data.sensitivity ?? 'low',
      state: data.state ?? 'active',
      expiresAt: data.expiresAt ?? null,
      storageKey: data.storageKey ?? null,
      contentType: data.contentType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      clientCompanyId: data.clientCompanyId,
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
    if (data.documentType !== undefined) {
      doc.documentType = data.documentType;
    }
    if (data.sensitivity !== undefined) {
      doc.sensitivity = data.sensitivity;
    }
    if (data.state !== undefined) {
      doc.state = data.state;
    }
    if (data.expiresAt !== undefined) {
      doc.expiresAt = data.expiresAt;
    }
    if (data.storageKey !== undefined) {
      doc.storageKey = data.storageKey;
    }
    if (data.contentType !== undefined) {
      doc.contentType = data.contentType;
    }
    if (data.sizeBytes !== undefined) {
      doc.sizeBytes = data.sizeBytes;
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
