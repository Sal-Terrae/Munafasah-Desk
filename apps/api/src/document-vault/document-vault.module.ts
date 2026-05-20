import { Module, forwardRef } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuditModule } from '../audit/audit.module';
import { DocumentVaultService } from './document-vault.service';
import { DocumentVaultController } from './document-vault.controller';
import { DocumentUploadController } from './document-upload.controller';
import { EvidenceLinkService } from '../compliance/evidence-link.service';

@Module({
  imports: [RepositoriesModule, forwardRef(() => AuditModule)],
  providers: [DocumentVaultService, EvidenceLinkService],
  controllers: [DocumentVaultController, DocumentUploadController],
  exports: [DocumentVaultService],
})
export class DocumentVaultModule {}
