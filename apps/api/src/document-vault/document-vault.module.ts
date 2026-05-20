import { Module, forwardRef } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuditModule } from '../audit/audit.module';
import { DocumentVaultService } from './document-vault.service';
import { DocumentVaultController } from './document-vault.controller';
import { DocumentUploadController } from './document-upload.controller';
import { ObjectStoreService } from './object-store.service';
import { EvidenceLinkService } from '../compliance/evidence-link.service';

@Module({
  imports: [RepositoriesModule, forwardRef(() => AuditModule)],
  providers: [DocumentVaultService, EvidenceLinkService, ObjectStoreService],
  controllers: [DocumentVaultController, DocumentUploadController],
  exports: [DocumentVaultService, ObjectStoreService],
})
export class DocumentVaultModule {}
