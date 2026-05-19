import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IClientDocumentRepository } from '../interfaces/client-document.repository.interface';
import {
  CreateClientDocumentData,
  UpdateClientDocumentData,
} from '../types';

@Injectable()
export class ClientDocumentPrismaRepository
  implements IClientDocumentRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.clientDocument.findMany({
      where: { organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.clientDocument.findFirst({
      where: { id, organizationId },
    });
  }

  async create(data: CreateClientDocumentData) {
    return this.prisma.clientDocument.create({
      data: {
        filename: data.filename,
        documentType: data.documentType ?? 'other',
        sensitivity: data.sensitivity ?? 'low',
        state: data.state ?? 'active',
        expiresAt: data.expiresAt ?? null,
        tender: { connect: { id: data.tenderId } },
        organization: { connect: { id: data.organizationId } },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateClientDocumentData,
  ) {
    const result = await this.prisma.clientDocument.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error(`ClientDocument not found or not in organization`);
    }
    return this.prisma.clientDocument.findUnique({ where: { id } }) as any;
  }

  async delete(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.clientDocument.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
