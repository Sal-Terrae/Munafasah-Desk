import { DataSubjectRequest } from '@prisma/client';
import {
  CreateDataSubjectRequestData,
  DataSubjectRequestStatus,
  UpdateDataSubjectRequestData,
} from '../types';

export interface IDataSubjectRequestRepository {
  create(
    data: CreateDataSubjectRequestData,
  ): Promise<DataSubjectRequest>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<DataSubjectRequest | null>;
  findAll(
    organizationId: string,
    status?: DataSubjectRequestStatus,
  ): Promise<DataSubjectRequest[]>;
  findForSubject(
    subjectEmail: string,
    organizationId: string,
  ): Promise<DataSubjectRequest[]>;
  update(
    id: string,
    organizationId: string,
    data: UpdateDataSubjectRequestData,
  ): Promise<DataSubjectRequest>;
}
