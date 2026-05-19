import { Module } from '@nestjs/common';
import { TenderModule } from '../tender/tender.module';
import { FitScoringService } from './fit-scoring.service';
import { FitScoringController } from './fit-scoring.controller';

@Module({
  imports: [TenderModule],
  providers: [FitScoringService],
  controllers: [FitScoringController],
  exports: [FitScoringService],
})
export class FitScoringModule {}
