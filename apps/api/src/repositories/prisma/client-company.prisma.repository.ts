import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IClientCompanyRepository } from '../interfaces/client-company.repository.interface';
import {
  CreateClientCompanyData,
  UpdateClientCompanyData,
} from '../types';

@Injectable()
export class ClientCompanyPrismaRepository
  implements IClientCompanyRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.clientCompany.findMany({
      where: { organizationId },
    });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.clientCompany.findFirst({
      where: { id, organizationId },
    });
  }

  async create(data: CreateClientCompanyData) {
    return this.prisma.clientCompany.create({
      data: {
        name: data.name,
        organization: { connect: { id: data.organizationId } },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateClientCompanyData,
  ) {
    const result = await this.prisma.clientCompany.updateMany({
      where: { id, organizationId },
      data,
    });
    if (result.count === 0) {
      throw new Error(`ClientCompany not found or not in organization`);
    }
    return this.prisma.clientCompany.findUnique({ where: { id } }) as any;
  }

  async delete(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.clientCompany.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }
}
