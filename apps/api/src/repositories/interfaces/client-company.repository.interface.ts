import { ClientCompany } from '@prisma/client';
import {
  CreateClientCompanyData,
  UpdateClientCompanyData,
} from '../types';

export interface IClientCompanyRepository {
  findAll(organizationId: string): Promise<ClientCompany[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<ClientCompany | null>;
  create(data: CreateClientCompanyData): Promise<ClientCompany>;
  update(
    id: string,
    organizationId: string,
    data: UpdateClientCompanyData,
  ): Promise<ClientCompany>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
