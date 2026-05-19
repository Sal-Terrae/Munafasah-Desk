import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { TenderService } from './tender.service';
import { TenderController } from './tender.controller';

@Module({
  imports: [RepositoriesModule],
  providers: [TenderService],
  controllers: [TenderController],
  exports: [TenderService],
})
export class TenderModule {}
