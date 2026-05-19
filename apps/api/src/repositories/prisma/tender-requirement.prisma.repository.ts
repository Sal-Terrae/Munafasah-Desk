import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ITenderRequirementRepository } from '../interfaces/tender-requirement.repository.interface';
import {
  CreateTenderRequirementData,
  UpdateTenderRequirementData,
} from '../types';

@Injectable()
export class TenderRequirementPrismaRepository
  implements ITenderRequirementRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAllForTender(tenderId: string, organizationId: string) {
    return this.prisma.tenderRequirement.findMany({
      where: { tenderId, organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.tenderRequirement.findFirst({
      where: { id, organizationId },
    });
  }

  async create(data: CreateTenderRequirementData) {
    return this.prisma.tenderRequirement.create({
      data: {
        tender: { connect: { id: data.tenderId } },
        organization: { connect: { id: data.organizationId } },
        category: data.category,
        text: data.text,
        risk: data.risk ?? 'medium',
        owner: data.owner ?? null,
        source: data.source ?? 'manual',
      },
    });
  }

  async createMany(data: CreateTenderRequirementData[]) {
    return this.prisma.$transaction(
      data.map((d) =>
        this.prisma.tenderRequirement.create({
          data: {
            tender: { connect: { id: d.tenderId } },
            organization: { connect: { id: d.organizationId } },
            category: d.category,
            text: d.text,
            risk: d.risk ?? 'medium',
            owner: d.owner ?? null,
            source: d.source ?? 'manual',
          },
        }),
      ),
    );
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTenderRequirementData,
  ) {
    const result = await this.prisma.tenderRequirement.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error('TenderRequirement not found or not in organization');
    }
    return this.prisma.tenderRequirement.findUnique({
      where: { id },
    }) as any;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.prisma.tenderRequirement.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
