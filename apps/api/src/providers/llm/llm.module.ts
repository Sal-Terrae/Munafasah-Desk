import { Global, Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { LLM_PROVIDER } from './llm.tokens';
import { createLlmProvider } from './create-llm-provider.factory';
import { BudgetGuardService } from './budget-guard.service';
import { LlmUsageService } from './llm-usage.service';

@Global()
@Module({
  imports: [RepositoriesModule],
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: () => createLlmProvider(process.env),
    },
    BudgetGuardService,
    LlmUsageService,
  ],
  exports: [LLM_PROVIDER, BudgetGuardService, LlmUsageService],
})
export class LlmModule {}
