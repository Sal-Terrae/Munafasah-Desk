import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IngestionApiKey } from '@prisma/client';
import {
  CreateIngestionApiKeyData,
  IIngestionApiKeyRepository,
} from '../interfaces/ingestion-api-key.repository.interface';

@Injectable()
export class FakeIngestionApiKeyRepository
  implements IIngestionApiKeyRepository
{
  readonly rows = new Map<string, IngestionApiKey>();
  readonly byPrefix = new Map<string, IngestionApiKey>();

  async create(data: CreateIngestionApiKeyData): Promise<IngestionApiKey> {
    if (this.byPrefix.has(data.keyPrefix)) {
      throw new Error('unique constraint: keyPrefix');
    }
    const row: IngestionApiKey = {
      id: randomUUID(),
      organizationId: data.organizationId,
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      createdBy: data.createdBy,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
    };
    this.rows.set(row.id, row);
    this.byPrefix.set(row.keyPrefix, row);
    return { ...row };
  }

  async findByPrefix(keyPrefix: string): Promise<IngestionApiKey | null> {
    const r = this.byPrefix.get(keyPrefix);
    return r ? { ...r } : null;
  }

  async findAllByOrg(organizationId: string): Promise<IngestionApiKey[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({ ...r }));
  }

  async markUsed(id: string): Promise<void> {
    const r = this.rows.get(id);
    if (r) r.lastUsedAt = new Date();
  }

  async revoke(id: string, organizationId: string): Promise<IngestionApiKey> {
    const r = this.rows.get(id);
    if (!r || r.organizationId !== organizationId || r.revokedAt) {
      throw new NotFoundException(
        'IngestionApiKey not found or already revoked',
      );
    }
    r.revokedAt = new Date();
    return { ...r };
  }
}
