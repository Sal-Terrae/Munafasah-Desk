import { TenderAccess } from '@prisma/client';
import {
  CreateTenderAccessData,
  UpdateTenderAccessData,
} from '../types';

export interface ITenderAccessRepository {
  create(data: CreateTenderAccessData): Promise<TenderAccess>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<TenderAccess | null>;
  findAllForTender(
    tenderId: string,
    organizationId: string,
  ): Promise<TenderAccess[]>;
  findAllForUser(
    userId: string,
    organizationId: string,
  ): Promise<TenderAccess[]>;
  findByUserAndTender(
    userId: string,
    tenderId: string,
    organizationId: string,
  ): Promise<TenderAccess | null>;
  update(
    id: string,
    organizationId: string,
    data: UpdateTenderAccessData,
  ): Promise<TenderAccess>;
  delete(id: string, organizationId: string): Promise<boolean>;
  revoke(
    userId: string,
    tenderId: string,
    organizationId: string,
  ): Promise<boolean>;
}
