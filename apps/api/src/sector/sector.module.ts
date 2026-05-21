import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { TenderModule } from '../tender/tender.module';
import { LlmModule } from '../providers/llm/llm.module';
import { BillingModule } from '../billing/billing.module';
import { SectorClassifierService } from './sector-classifier.service';
import { SectorClassifierController } from './sector-classifier.controller';

@Module({
  imports: [AuthModule, AuditModule, TenderModule, LlmModule, BillingModule],
  providers: [SectorClassifierService],
  controllers: [SectorClassifierController],
  exports: [SectorClassifierService],
})
export class SectorModule {}
