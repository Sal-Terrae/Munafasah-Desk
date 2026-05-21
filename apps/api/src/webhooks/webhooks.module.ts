import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookSubscriptionController } from './webhook-subscription.controller';
import { WebhookDispatcher } from './webhook-dispatcher.service';

@Module({
  imports: [AuthModule, AuditModule, RepositoriesModule],
  providers: [WebhookSubscriptionService, WebhookDispatcher],
  controllers: [WebhookSubscriptionController],
  exports: [WebhookSubscriptionService, WebhookDispatcher],
})
export class WebhooksModule {}
