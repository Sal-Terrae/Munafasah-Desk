import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ClientCompanyModule } from './client-company/client-company.module';

@Module({
  imports: [
    HealthModule,
    RepositoriesModule,
    AuthModule,
    AuditModule,
    ClientCompanyModule,
  ],
})
export class AppModule {}
