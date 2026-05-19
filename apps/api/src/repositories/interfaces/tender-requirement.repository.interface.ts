import { TenderRequirement } from '@prisma/client';
import {
  CreateTenderRequirementData,
  UpdateTenderRequirementData,
} from '../types';

export interface ITenderRequirementRepository {
  findAllForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<TenderRequirement[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<TenderRequirement | null>;
  create(data: CreateTenderRequirementData): Promise<TenderRequirement>;
  createMany(
    data: CreateTenderRequirementData[],
  ): Promise<TenderRequirement[]>;
  update(
    id: string,
    organizationId: string,
    data: UpdateTenderRequirementData,
  ): Promise<TenderRequirement>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
