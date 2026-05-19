import { Module } from '@nestjs/common';
import { TenderModule } from '../tender/tender.module';
import { DocumentVaultModule } from '../document-vault/document-vault.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { AuditModule } from '../audit/audit.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [TenderModule, DocumentVaultModule, ComplianceModule, AuditModule],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
