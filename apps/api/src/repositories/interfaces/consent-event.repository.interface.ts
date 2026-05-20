import { ConsentEvent } from '@prisma/client';
import { CreateConsentEventData } from '../types';

export interface IConsentEventRepository {
  create(data: CreateConsentEventData): Promise<ConsentEvent>;
  findAllForSubject(
    subjectEmail: string,
    organizationId: string,
  ): Promise<ConsentEvent[]>;
  findById(
    id: string,
    organizationId: string,
  ): Promise<ConsentEvent | null>;
  /** Most recent event for the (subject, purpose) pair — defines current state. */
  findCurrent(
    subjectEmail: string,
    purpose: string,
    organizationId: string,
  ): Promise<ConsentEvent | null>;
  /** PDPL erasure helper: rewrite subjectEmail to a pseudonymous value. */
  anonymiseSubject(
    subjectEmail: string,
    organizationId: string,
    pseudonymousEmail: string,
  ): Promise<number>;
}
