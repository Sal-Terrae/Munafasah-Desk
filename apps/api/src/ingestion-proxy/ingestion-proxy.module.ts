import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { IngestionProxyService } from './ingestion-proxy.service';
import { IngestionProxyController } from './ingestion-proxy.controller';

@Module({
  imports: [AuthModule, AuditModule],
  providers: [IngestionProxyService],
  controllers: [IngestionProxyController],
  exports: [IngestionProxyService],
})
export class IngestionProxyModule {}
