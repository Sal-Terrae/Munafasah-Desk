import { Tender } from '@prisma/client';
import { CreateTenderData, UpdateTenderData } from '../types';

export interface ITenderRepository {
  findAll(organizationId: string): Promise<Tender[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<Tender | null>;
  create(data: CreateTenderData): Promise<Tender>;
  update(
    id: string,
    organizationId: string,
    data: UpdateTenderData,
  ): Promise<Tender>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
