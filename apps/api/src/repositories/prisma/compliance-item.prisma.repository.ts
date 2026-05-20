import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IComplianceItemRepository } from '../interfaces/compliance-item.repository.interface';
import {
  CreateComplianceItemData,
  UpdateComplianceItemData,
} from '../types';

@Injectable()
export class ComplianceItemPrismaRepository
  implements IComplianceItemRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAllForMatrix(matrixId: string, organizationId: string) {
    return this.prisma.complianceItem.findMany({
      where: { matrixId, organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.complianceItem.findFirst({
      where: { id, organizationId },
    });
  }

  async create(data: CreateComplianceItemData) {
    return this.prisma.complianceItem.create({
      data: {
        matrix: { connect: { id: data.matrixId } },
        organization: { connect: { id: data.organizationId } },
        requirementId: data.requirementId,
        requirementText: data.requirementText,
        category: data.category,
        owner: data.owner,
        risk: data.risk,
        status: data.status,
        dueDate: data.dueDate ?? null,
      },
    });
  }

  async createMany(data: CreateComplianceItemData[]) {
    // Atomic batch — either all items insert or none.
    return this.prisma.$transaction(
      data.map((d) =>
        this.prisma.complianceItem.create({
          data: {
            matrix: { connect: { id: d.matrixId } },
            organization: { connect: { id: d.organizationId } },
            requirementId: d.requirementId,
            requirementText: d.requirementText,
            category: d.category,
            owner: d.owner,
            risk: d.risk,
            status: d.status,
            dueDate: d.dueDate ?? null,
          },
        }),
      ),
    );
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateComplianceItemData,
  ) {
    const result = await this.prisma.complianceItem.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error('ComplianceItem not found or not in organization');
    }
    return this.prisma.complianceItem.findUniqueOrThrow({ where: { id } });
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.prisma.complianceItem.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
