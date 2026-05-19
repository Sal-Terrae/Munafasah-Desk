import { ComplianceMatrix } from '@prisma/client';
import {
  CreateComplianceMatrixData,
  UpdateComplianceMatrixData,
} from '../types';

export interface IComplianceMatrixRepository {
  findAllForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<ComplianceMatrix[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<ComplianceMatrix | null>;
  findByVersion(
    tenderId: string,
    version: number,
    organizationId: string,
  ): Promise<ComplianceMatrix | null>;
  latestForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<ComplianceMatrix | null>;
  create(data: CreateComplianceMatrixData): Promise<ComplianceMatrix>;
  update(
    id: string,
    organizationId: string,
    data: UpdateComplianceMatrixData,
  ): Promise<ComplianceMatrix>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
