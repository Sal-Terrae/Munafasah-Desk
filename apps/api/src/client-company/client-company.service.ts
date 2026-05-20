import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientCompany } from '@prisma/client';
import { IClientCompanyRepository } from '../repositories/interfaces/client-company.repository.interface';
import { CLIENT_COMPANY_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class ClientCompanyService {
  constructor(
    @Inject(CLIENT_COMPANY_REPOSITORY)
    private readonly repo: IClientCompanyRepository,
  ) {}

  list(organizationId: string): Promise<ClientCompany[]> {
    return this.repo.findAll(organizationId);
  }

  async get(id: string, organizationId: string): Promise<ClientCompany> {
    const company = await this.repo.findById(id, organizationId);
    if (!company) {
      throw new NotFoundException('ClientCompany not found');
    }
    return company;
  }

  create(name: string, organizationId: string): Promise<ClientCompany> {
    return this.repo.create({ name, organizationId });
  }

  update(
    id: string,
    organizationId: string,
    name: string,
  ): Promise<ClientCompany> {
    return this.repo.update(id, organizationId, { name });
  }

  remove(id: string, organizationId: string): Promise<boolean> {
    return this.repo.delete(id, organizationId);
  }
}
