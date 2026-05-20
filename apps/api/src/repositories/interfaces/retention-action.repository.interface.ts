import { RetentionAction } from '@prisma/client';
import {
  CreateRetentionActionData,
  RetentionActionStatus,
  UpdateRetentionActionData,
} from '../types';

export interface IRetentionActionRepository {
  create(data: CreateRetentionActionData): Promise<RetentionAction>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<RetentionAction | null>;
  findAll(
    organizationId: string,
    status?: RetentionActionStatus,
  ): Promise<RetentionAction[]>;
  findForDocument(
    documentId: string,
    organizationId: string,
  ): Promise<RetentionAction[]>;
  update(
    id: string,
    organizationId: string,
    data: UpdateRetentionActionData,
  ): Promise<RetentionAction>;
}
