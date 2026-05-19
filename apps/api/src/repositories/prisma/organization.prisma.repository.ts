import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IOrganizationRepository } from '../interfaces/organization.repository.interface';
import {
  CreateOrganizationData,
  UpdateOrganizationData,
} from '../types';

@Injectable()
export class OrganizationPrismaRepository
  implements IOrganizationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany();
  }

  async findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async create(data: CreateOrganizationData) {
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: UpdateOrganizationData) {
    await this.prisma.organization.update({ where: { id }, data });
    return this.prisma.organization.findUnique({ where: { id } }) as any;
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.organization.delete({ where: { id } });
    return true;
  }
}
