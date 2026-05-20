import { Module } from '@nestjs/common';
import { TenderModule } from '../tender/tender.module';
import { DocumentVaultModule } from '../document-vault/document-vault.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { PdplModule } from '../pdpl/pdpl.module';
import { ComplianceService } from './compliance.service';
import { ComplianceMatrixService } from './compliance-matrix.service';
import { EvidenceLinkService } from './evidence-link.service';
import { RemindersService } from './reminders.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceItemController } from './compliance-item.controller';
import { TenderRequirementController } from './tender-requirement.controller';

@Module({
  imports: [TenderModule, DocumentVaultModule, RepositoriesModule, PdplModule],
  providers: [
    ComplianceService,
    ComplianceMatrixService,
    EvidenceLinkService,
    RemindersService,
  ],
  controllers: [
    ComplianceController,
    ComplianceItemController,
    TenderRequirementController,
  ],
  exports: [
    ComplianceService,
    ComplianceMatrixService,
    EvidenceLinkService,
    RemindersService,
  ],
})
export class ComplianceModule {}
