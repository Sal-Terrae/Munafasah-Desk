import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import { UsageCounterService } from './usage-counter.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Module({
  imports: [AuthModule, AuditModule, RepositoriesModule],
  providers: [SubscriptionService, UsageCounterService, StripeWebhookService],
  controllers: [BillingController],
  exports: [SubscriptionService, UsageCounterService],
})
export class BillingModule {}
