import { Organization } from '@prisma/client';
import {
  CreateOrganizationData,
  UpdateOrganizationData,
} from '../types';

export interface IOrganizationRepository {
  findAll(): Promise<Organization[]>;
  findById(id: string): Promise<Organization | null>;
  create(data: CreateOrganizationData): Promise<Organization>;
  update(id: string, data: UpdateOrganizationData): Promise<Organization>;
  delete(id: string): Promise<boolean>;
}
