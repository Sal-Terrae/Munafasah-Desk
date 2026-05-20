import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { IngestionService } from './ingestion.service';
import {
  IngestionController,
  WebhookController,
} from './ingestion.controller';
import { SharedTokenGuard } from './shared-token.guard';

@Module({
  imports: [AuthModule, AuditModule, RepositoriesModule],
  providers: [IngestionService, SharedTokenGuard],
  controllers: [IngestionController, WebhookController],
  exports: [IngestionService],
})
export class IngestionModule {}
