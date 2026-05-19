import { ComplianceItem } from '@prisma/client';
import {
  CreateComplianceItemData,
  UpdateComplianceItemData,
} from '../types';

export interface IComplianceItemRepository {
  findAllForMatrix(
    matrixId: string,
    organizationId: string,
  ): Promise<ComplianceItem[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<ComplianceItem | null>;
  create(data: CreateComplianceItemData): Promise<ComplianceItem>;
  createMany(data: CreateComplianceItemData[]): Promise<ComplianceItem[]>;
  update(
    id: string,
    organizationId: string,
    data: UpdateComplianceItemData,
  ): Promise<ComplianceItem>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
