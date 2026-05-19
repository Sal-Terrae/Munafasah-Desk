import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ClientCompanyModule } from './client-company/client-company.module';
import { TenderModule } from './tender/tender.module';
import { DocumentVaultModule } from './document-vault/document-vault.module';
import { FitScoringModule } from './fit-scoring/fit-scoring.module';
import { ComplianceModule } from './compliance/compliance.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    HealthModule,
    RepositoriesModule,
    AuthModule,
    AuditModule,
    ClientCompanyModule,
    TenderModule,
    DocumentVaultModule,
    FitScoringModule,
    ComplianceModule,
    ExportModule,
  ],
})
export class AppModule {}
