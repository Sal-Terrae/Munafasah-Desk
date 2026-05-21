import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { PdplModule } from './pdpl/pdpl.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { UsersModule } from './users/users.module';
import { LlmModule } from './providers/llm/llm.module';
import { QueueModule } from './providers/queue/queue.module';
import { ObjectStorageModule } from './providers/object-storage/object-storage.module';
import { NotificationModule } from './providers/notifications/notification.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
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
    PdplModule,
    IngestionModule,
    UsersModule,
    LlmModule,
    QueueModule,
    ObjectStorageModule,
    NotificationModule,
    WebhooksModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
