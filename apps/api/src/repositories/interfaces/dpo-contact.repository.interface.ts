import { DpoContact } from '@prisma/client';
import { UpsertDpoContactData } from '../types';

export interface IDpoContactRepository {
  /** One row per organization — `upsert` is the only write surface. */
  upsert(data: UpsertDpoContactData): Promise<DpoContact>;
  findByOrg(organizationId: string): Promise<DpoContact | null>;
}
