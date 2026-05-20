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

@Module({
  imports: [AuthModule, AuditModule, RepositoriesModule],
  providers: [
    RetentionService,
    IncidentService,
    DataSubjectService,
    ConsentLedgerService,
    TenderAccessService,
  ],
  controllers: [
    PdplController,
    DataSubjectController,
    ConsentLedgerController,
    TenderAccessController,
  ],
  exports: [
    RetentionService,
    IncidentService,
    DataSubjectService,
    ConsentLedgerService,
    TenderAccessService,
  ],
})
export class PdplModule {}
