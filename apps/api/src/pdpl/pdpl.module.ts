import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PdplController } from './pdpl.controller';
import { RetentionService } from './retention.service';
import { IncidentService } from './incident.service';

@Module({
  imports: [AuthModule],
  providers: [RetentionService, IncidentService],
  controllers: [PdplController],
  exports: [RetentionService, IncidentService],
})
export class PdplModule {}
