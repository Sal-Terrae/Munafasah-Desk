import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClientCompany } from '@prisma/client';
import { IClientCompanyRepository } from '../interfaces/client-company.repository.interface';
import {
  CreateClientCompanyData,
  UpdateClientCompanyData,
} from '../types';

@Injectable()
export class FakeClientCompanyRepository
  implements IClientCompanyRepository
{
  private records = new Map<string, ClientCompany>();

  async findAll(organizationId: string): Promise<ClientCompany[]> {
    return Array.from(this.records.values()).filter(
      (c) => c.organizationId === organizationId,
    );
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<ClientCompany | null> {
    const company = this.records.get(id);
    if (company && company.organizationId === organizationId) {
      return company;
    }
    return null;
  }

  async create(data: CreateClientCompanyData): Promise<ClientCompany> {
    const company: ClientCompany = {
      id: randomUUID(),
      name: data.name,
      organizationId: data.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(company.id, company);
    return company;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateClientCompanyData,
  ): Promise<ClientCompany> {
    const company = this.records.get(id);
    if (!company || company.organizationId !== organizationId) {
      throw new Error('ClientCompany not found or not in organization');
    }
    if (data.name !== undefined) {
      company.name = data.name;
    }
    company.updatedAt = new Date();
    return company;
  }

  async delete(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const company = this.records.get(id);
    if (!company || company.organizationId !== organizationId) {
      return false;
    }
    return this.records.delete(id);
  }
}
