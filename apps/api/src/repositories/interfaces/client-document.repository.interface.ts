import { ClientDocument } from '@prisma/client';
import {
  CreateClientDocumentData,
  UpdateClientDocumentData,
} from '../types';

export interface IClientDocumentRepository {
  findAll(organizationId: string): Promise<ClientDocument[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<ClientDocument | null>;
  create(data: CreateClientDocumentData): Promise<ClientDocument>;
  update(
    id: string,
    organizationId: string,
    data: UpdateClientDocumentData,
  ): Promise<ClientDocument>;
  delete(id: string, organizationId: string): Promise<boolean>;
}
