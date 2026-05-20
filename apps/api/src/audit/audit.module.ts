import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [RepositoriesModule, forwardRef(() => AuthModule)],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
