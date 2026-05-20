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

@Module({
  providers: [
    PrismaService,
    OrganizationPrismaRepository,
    UserPrismaRepository,
    ClientCompanyPrismaRepository,
    TenderPrismaRepository,
    ClientDocumentPrismaRepository,
    AuditEventPrismaRepository,
    ComplianceMatrixPrismaRepository,
    ComplianceItemPrismaRepository,
    TenderRequirementPrismaRepository,
    EvidenceLinkPrismaRepository,
    ConsentEventPrismaRepository,
    DataSubjectRequestPrismaRepository,
    TenderAccessPrismaRepository,
    RetentionActionPrismaRepository,
    IngestionJobPrismaRepository,
  ],
  exports: [
    PrismaService,
    OrganizationPrismaRepository,
    UserPrismaRepository,
    ClientCompanyPrismaRepository,
    TenderPrismaRepository,
    ClientDocumentPrismaRepository,
    AuditEventPrismaRepository,
    ComplianceMatrixPrismaRepository,
    ComplianceItemPrismaRepository,
    TenderRequirementPrismaRepository,
    EvidenceLinkPrismaRepository,
    ConsentEventPrismaRepository,
    DataSubjectRequestPrismaRepository,
    TenderAccessPrismaRepository,
    RetentionActionPrismaRepository,
    IngestionJobPrismaRepository,
  ],
})
export class RepositoriesModule {}
