import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { PdplModule } from '../pdpl/pdpl.module';
import { IngestionService } from './ingestion.service';
import {
  IngestionController,
  WebhookController,
} from './ingestion.controller';
import { SharedTokenGuard } from './shared-token.guard';
import { InboundEmailService } from './inbound-email.service';
import { InboundEmailController } from './inbound-email.controller';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    RepositoriesModule,
    forwardRef(() => PdplModule),
  ],
  providers: [IngestionService, SharedTokenGuard, InboundEmailService],
  controllers: [
    IngestionController,
    WebhookController,
    InboundEmailController,
  ],
  exports: [IngestionService, InboundEmailService],
})
export class IngestionModule {}
