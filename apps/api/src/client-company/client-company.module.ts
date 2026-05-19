import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ClientCompanyService } from './client-company.service';
import { ClientCompanyController } from './client-company.controller';

@Module({
  imports: [RepositoriesModule],
  providers: [ClientCompanyService],
  controllers: [ClientCompanyController],
})
export class ClientCompanyModule {}
