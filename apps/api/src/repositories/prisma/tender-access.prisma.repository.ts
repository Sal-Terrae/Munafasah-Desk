import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ITenderAccessRepository } from '../interfaces/tender-access.repository.interface';
import {
  CreateTenderAccessData,
  UpdateTenderAccessData,
} from '../types';

@Injectable()
export class TenderAccessPrismaRepository
  implements ITenderAccessRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTenderAccessData) {
    return this.prisma.tenderAccess.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        user: { connect: { id: data.userId } },
        tender: { connect: { id: data.tenderId } },
        role: data.role,
        grantedBy: data.grantedBy ?? null,
      },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.tenderAccess.findFirst({
      where: { id, organizationId },
    });
  }

  async findAllForTender(tenderId: string, organizationId: string) {
    return this.prisma.tenderAccess.findMany({
      where: { tenderId, organizationId },
    });
  }

  async findAllForUser(userId: string, organizationId: string) {
    return this.prisma.tenderAccess.findMany({
      where: { userId, organizationId },
    });
  }

  async findByUserAndTender(
    userId: string,
    tenderId: string,
    organizationId: string,
  ) {
    return this.prisma.tenderAccess.findFirst({
      where: { userId, tenderId, organizationId },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTenderAccessData,
  ) {
    const result = await this.prisma.tenderAccess.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error('TenderAccess not found or not in organization');
    }
    return this.prisma.tenderAccess.findUnique({ where: { id } }) as any;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.prisma.tenderAccess.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }

  async revoke(
    userId: string,
    tenderId: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.tenderAccess.deleteMany({
      where: { userId, tenderId, organizationId },
    });
    return result.count > 0;
  }
}
