import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrganizationPrismaRepository } from './prisma/organization.prisma.repository';
import { UserPrismaRepository } from './prisma/user.prisma.repository';
import { ClientCompanyPrismaRepository } from './prisma/client-company.prisma.repository';
import { TenderPrismaRepository } from './prisma/tender.prisma.repository';
import { ClientDocumentPrismaRepository } from './prisma/client-document.prisma.repository';
import { AuditEventPrismaRepository } from './prisma/audit-event.prisma.repository';

@Module({
  providers: [
    PrismaService,
    OrganizationPrismaRepository,
    UserPrismaRepository,
    ClientCompanyPrismaRepository,
    TenderPrismaRepository,
    ClientDocumentPrismaRepository,
    AuditEventPrismaRepository,
  ],
  exports: [
    PrismaService,
    OrganizationPrismaRepository,
    UserPrismaRepository,
    ClientCompanyPrismaRepository,
    TenderPrismaRepository,
    ClientDocumentPrismaRepository,
    AuditEventPrismaRepository,
  ],
})
export class RepositoriesModule {}
