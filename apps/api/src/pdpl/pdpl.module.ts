import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { PdplController } from './pdpl.controller';
import { RetentionService } from './retention.service';
import { IncidentService } from './incident.service';
import { DataSubjectService } from './data-subject.service';
import { DataSubjectController } from './data-subject.controller';
import { ConsentLedgerService } from './consent-ledger.service';
import { ConsentLedgerController } from './consent-ledger.controller';
import { TenderAccessService } from './tender-access.service';
import { TenderAccessController } from './tender-access.controller';
import { RetentionActionPersistenceService } from './retention-action.service';
import {
  RetentionActionController,
  RetentionScheduledController,
} from './retention-action.controller';
import { RetentionScheduler } from './retention.scheduler';
import { SchedulerOidcGuard } from './scheduler-oidc.guard';
import { DpoContactService } from './dpo-contact.service';
import { DpoContactController } from './dpo-contact.controller';
import { ResidencyGate } from './residency-gate';

@Module({
  imports: [AuthModule, AuditModule, RepositoriesModule],
  providers: [
    RetentionService,
    IncidentService,
    DataSubjectService,
    ConsentLedgerService,
    TenderAccessService,
    RetentionActionPersistenceService,
    RetentionScheduler,
    SchedulerOidcGuard,
    DpoContactService,
    ResidencyGate,
  ],
  controllers: [
    PdplController,
    DataSubjectController,
    ConsentLedgerController,
    TenderAccessController,
    RetentionActionController,
    RetentionScheduledController,
    DpoContactController,
  ],
  exports: [
    RetentionService,
    IncidentService,
    DataSubjectService,
    ConsentLedgerService,
    TenderAccessService,
    RetentionActionPersistenceService,
    DpoContactService,
    ResidencyGate,
  ],
})
export class PdplModule {}
