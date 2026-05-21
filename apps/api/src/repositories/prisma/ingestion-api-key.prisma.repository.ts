import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  CreateIngestionApiKeyData,
  IIngestionApiKeyRepository,
} from '../interfaces/ingestion-api-key.repository.interface';

@Injectable()
export class IngestionApiKeyPrismaRepository
  implements IIngestionApiKeyRepository
{
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateIngestionApiKeyData) {
    return this.prisma.ingestionApiKey.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        name: data.name,
        keyPrefix: data.keyPrefix,
        keyHash: data.keyHash,
        createdBy: data.createdBy,
      },
    });
  }

  findByPrefix(keyPrefix: string) {
    return this.prisma.ingestionApiKey.findUnique({
      where: { keyPrefix },
    });
  }

  findAllByOrg(organizationId: string) {
    return this.prisma.ingestionApiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markUsed(id: string) {
    await this.prisma.ingestionApiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async revoke(id: string, organizationId: string) {
    const count = await this.prisma.ingestionApiKey.updateMany({
      where: { id, organizationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count.count === 0) {
      throw new NotFoundException('IngestionApiKey not found or already revoked');
    }
    return this.prisma.ingestionApiKey.findFirstOrThrow({
      where: { id, organizationId },
    });
  }
}
