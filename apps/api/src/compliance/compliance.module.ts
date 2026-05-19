import { Module } from '@nestjs/common';
import { TenderModule } from '../tender/tender.module';
import { DocumentVaultModule } from '../document-vault/document-vault.module';
import { ComplianceService } from './compliance.service';
import { RemindersService } from './reminders.service';
import { ComplianceController } from './compliance.controller';

@Module({
  imports: [TenderModule, DocumentVaultModule],
  providers: [ComplianceService, RemindersService],
  controllers: [ComplianceController],
  exports: [ComplianceService, RemindersService],
})
export class ComplianceModule {}
