import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IComplianceMatrixRepository } from '../interfaces/compliance-matrix.repository.interface';
import {
  CreateComplianceMatrixData,
  UpdateComplianceMatrixData,
} from '../types';

@Injectable()
export class ComplianceMatrixPrismaRepository
  implements IComplianceMatrixRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAllForTender(tenderId: string, organizationId: string) {
    return this.prisma.complianceMatrix.findMany({
      where: { tenderId, organizationId },
      orderBy: { version: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.complianceMatrix.findFirst({
      where: { id, organizationId },
    });
  }

  async findByVersion(
    tenderId: string,
    version: number,
    organizationId: string,
  ) {
    return this.prisma.complianceMatrix.findFirst({
      where: { tenderId, version, organizationId },
    });
  }

  async latestForTender(tenderId: string, organizationId: string) {
    return this.prisma.complianceMatrix.findFirst({
      where: { tenderId, organizationId },
      orderBy: { version: 'desc' },
    });
  }

  async create(data: CreateComplianceMatrixData) {
    return this.prisma.complianceMatrix.create({
      data: {
        tenderId: data.tenderId,
        organizationId: data.organizationId,
        version: data.version,
        status: data.status ?? 'draft',
        generatedAt: data.generatedAt ?? new Date(),
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateComplianceMatrixData,
  ) {
    const result = await this.prisma.complianceMatrix.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error('ComplianceMatrix not found or not in organization');
    }
    return this.prisma.complianceMatrix.findUnique({ where: { id } }) as any;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.prisma.complianceMatrix.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
