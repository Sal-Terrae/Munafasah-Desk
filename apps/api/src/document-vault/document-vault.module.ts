import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { DocumentVaultService } from './document-vault.service';
import { DocumentVaultController } from './document-vault.controller';

@Module({
  imports: [RepositoriesModule],
  providers: [DocumentVaultService],
  controllers: [DocumentVaultController],
  exports: [DocumentVaultService],
})
export class DocumentVaultModule {}
