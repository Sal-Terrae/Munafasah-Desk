import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuditModule } from '../audit/audit.module';
import { ClientCompanyModule } from '../client-company/client-company.module';
import { TenderModule } from '../tender/tender.module';
import { IngestionPortalController } from './ingestion-portal.controller';
import { IngestionPortalService } from './ingestion-portal.service';

@Module({
  imports: [
    RepositoriesModule,
    AuditModule,
    ClientCompanyModule,
    TenderModule,
  ],
  providers: [IngestionPortalService],
  controllers: [IngestionPortalController],
  exports: [IngestionPortalService],
})
export class IngestionPortalModule {}
