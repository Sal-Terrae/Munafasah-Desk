import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ClientCompanyModule } from '../client-company/client-company.module';
import { TenderModule } from '../tender/tender.module';
import { IngestionPortalController } from './ingestion-portal.controller';
import { IngestionPortalService } from './ingestion-portal.service';
import { IngestionApiKeyService } from './ingestion-api-key.service';
import { IngestionApiKeyController } from './ingestion-api-key.controller';
import { IngestionTokenGuard } from './ingestion-token.guard';

@Module({
  imports: [
    RepositoriesModule,
    AuthModule,
    AuditModule,
    ClientCompanyModule,
    TenderModule,
  ],
  providers: [
    IngestionPortalService,
    IngestionApiKeyService,
    IngestionTokenGuard,
  ],
  controllers: [IngestionPortalController, IngestionApiKeyController],
  exports: [IngestionPortalService, IngestionApiKeyService],
})
export class IngestionPortalModule {}
