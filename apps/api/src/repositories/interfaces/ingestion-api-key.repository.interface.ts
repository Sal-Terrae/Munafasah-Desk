import { IngestionApiKey } from '@prisma/client';

export interface CreateIngestionApiKeyData {
  organizationId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdBy: string;
}

export interface IIngestionApiKeyRepository {
  create(data: CreateIngestionApiKeyData): Promise<IngestionApiKey>;
  findByPrefix(keyPrefix: string): Promise<IngestionApiKey | null>;
  findAllByOrg(organizationId: string): Promise<IngestionApiKey[]>;
  markUsed(id: string): Promise<void>;
  revoke(id: string, organizationId: string): Promise<IngestionApiKey>;
}
