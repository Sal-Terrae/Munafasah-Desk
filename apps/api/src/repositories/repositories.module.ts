import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrganizationPrismaRepository } from './prisma/organization.prisma.repository';
import { UserPrismaRepository } from './prisma/user.prisma.repository';
import { ClientCompanyPrismaRepository } from './prisma/client-company.prisma.repository';
import { TenderPrismaRepository } from './prisma/tender.prisma.repository';
import { ClientDocumentPrismaRepository } from './prisma/client-document.prisma.repository';
import { AuditEventPrismaRepository } from './prisma/audit-event.prisma.repository';
import { ComplianceMatrixPrismaRepository } from './prisma/compliance-matrix.prisma.repository';
import { ComplianceItemPrismaRepository } from './prisma/compliance-item.prisma.repository';
import { TenderRequirementPrismaRepository } from './prisma/tender-requirement.prisma.repository';
import { EvidenceLinkPrismaRepository } from './prisma/evidence-link.prisma.repository';
import { ConsentEventPrismaRepository } from './prisma/consent-event.prisma.repository';
import { DataSubjectRequestPrismaRepository } from './prisma/data-subject-request.prisma.repository';
import { TenderAccessPrismaRepository } from './prisma/tender-access.prisma.repository';
import { RetentionActionPrismaRepository } from './prisma/retention-action.prisma.repository';
import { IngestionJobPrismaRepository } from './prisma/ingestion-job.prisma.repository';
import { DpoContactPrismaRepository } from './prisma/dpo-contact.prisma.repository';
import { LlmUsageLogPrismaRepository } from './prisma/llm-usage-log.prisma.repository';
import { DpoTrainingRecordPrismaRepository } from './prisma/dpo-training-record.prisma.repository';
import {
  AUDIT_EVENT_REPOSITORY,
  CLIENT_COMPANY_REPOSITORY,
  CLIENT_DOCUMENT_REPOSITORY,
  COMPLIANCE_ITEM_REPOSITORY,
  COMPLIANCE_MATRIX_REPOSITORY,
  CONSENT_EVENT_REPOSITORY,
  DATA_SUBJECT_REQUEST_REPOSITORY,
  DPO_CONTACT_REPOSITORY,
  DPO_TRAINING_RECORD_REPOSITORY,
  EVIDENCE_LINK_REPOSITORY,
  INGESTION_JOB_REPOSITORY,
  LLM_USAGE_LOG_REPOSITORY,
  ORGANIZATION_REPOSITORY,
  RETENTION_ACTION_REPOSITORY,
  TENDER_ACCESS_REPOSITORY,
  TENDER_REPOSITORY,
  TENDER_REQUIREMENT_REPOSITORY,
  USER_REPOSITORY,
} from './tokens';

const TOKEN_BINDINGS = [
  { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationPrismaRepository },
  { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
  { provide: CLIENT_COMPANY_REPOSITORY, useClass: ClientCompanyPrismaRepository },
  { provide: TENDER_REPOSITORY, useClass: TenderPrismaRepository },
  { provide: CLIENT_DOCUMENT_REPOSITORY, useClass: ClientDocumentPrismaRepository },
  { provide: AUDIT_EVENT_REPOSITORY, useClass: AuditEventPrismaRepository },
  { provide: COMPLIANCE_MATRIX_REPOSITORY, useClass: ComplianceMatrixPrismaRepository },
  { provide: COMPLIANCE_ITEM_REPOSITORY, useClass: ComplianceItemPrismaRepository },
  { provide: TENDER_REQUIREMENT_REPOSITORY, useClass: TenderRequirementPrismaRepository },
  { provide: EVIDENCE_LINK_REPOSITORY, useClass: EvidenceLinkPrismaRepository },
  { provide: CONSENT_EVENT_REPOSITORY, useClass: ConsentEventPrismaRepository },
  { provide: DATA_SUBJECT_REQUEST_REPOSITORY, useClass: DataSubjectRequestPrismaRepository },
  { provide: TENDER_ACCESS_REPOSITORY, useClass: TenderAccessPrismaRepository },
  { provide: RETENTION_ACTION_REPOSITORY, useClass: RetentionActionPrismaRepository },
  { provide: INGESTION_JOB_REPOSITORY, useClass: IngestionJobPrismaRepository },
  { provide: DPO_CONTACT_REPOSITORY, useClass: DpoContactPrismaRepository },
  { provide: LLM_USAGE_LOG_REPOSITORY, useClass: LlmUsageLogPrismaRepository },
  {
    provide: DPO_TRAINING_RECORD_REPOSITORY,
    useClass: DpoTrainingRecordPrismaRepository,
  },
];

const TOKENS = TOKEN_BINDINGS.map((b) => b.provide);

@Module({
  providers: [PrismaService, ...TOKEN_BINDINGS],
  exports: [PrismaService, ...TOKENS],
})
export class RepositoriesModule {}
