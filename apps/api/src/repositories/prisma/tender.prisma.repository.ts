import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ITenderRepository } from '../interfaces/tender.repository.interface';
import { CreateTenderData, UpdateTenderData } from '../types';

@Injectable()
export class TenderPrismaRepository implements ITenderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.tender.findMany({
      where: { organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.tender.findFirst({
      where: { id, organizationId },
    });
  }

  async create(data: CreateTenderData) {
    return this.prisma.tender.create({
      data: {
        title: data.title,
        source: data.source ?? 'manual',
        status: data.status ?? 'intake',
        organization: { connect: { id: data.organizationId } },
        clientCompany: { connect: { id: data.clientCompanyId } },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTenderData,
  ) {
    const result = await this.prisma.tender.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error(`Tender not found or not in organization`);
    }
    return this.prisma.tender.findUniqueOrThrow({ where: { id } });
  }

  async delete(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.tender.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
