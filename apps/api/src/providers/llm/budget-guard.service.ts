import { Inject, Injectable, Logger } from '@nestjs/common';
import { ILlmUsageLogRepository } from '../../repositories/interfaces/llm-usage-log.repository.interface';
import { LLM_USAGE_LOG_REPOSITORY } from '../../repositories/tokens';
import { BudgetExceededException } from './budget-exceeded.exception';

export interface BudgetConfig {
  maxRequestsPerDay: number;
  maxCostPerDayUsd: number;
}

/**
 * Reads daily totals from LlmUsageLog and fails closed when an org is
 * over its daily request count or USD spend. Limits come from env
 * (LLM_DAILY_MAX_REQUESTS, LLM_DAILY_MAX_COST_USD). Defaults are
 * intentionally conservative — production raises them by env.
 */
@Injectable()
export class BudgetGuardService {
  private readonly log = new Logger(BudgetGuardService.name);
  private readonly cfg: BudgetConfig;

  constructor(
    @Inject(LLM_USAGE_LOG_REPOSITORY)
    private readonly usage: ILlmUsageLogRepository,
  ) {
    this.cfg = {
      maxRequestsPerDay: Number(
        process.env.LLM_DAILY_MAX_REQUESTS ?? '1000',
      ),
      maxCostPerDayUsd: Number(process.env.LLM_DAILY_MAX_COST_USD ?? '10'),
    };
  }

  /** Throws BudgetExceededException if the org would exceed its daily cap. */
  async assertCanSpend(organizationId: string): Promise<void> {
    const since = this.startOfUtcDay();
    const totals = await this.usage.dailyTotals(organizationId, since);
    if (totals.requestCount >= this.cfg.maxRequestsPerDay) {
      this.log.warn(
        `org=${organizationId} blocked: requests=${totals.requestCount} >= ${this.cfg.maxRequestsPerDay}`,
      );
      throw new BudgetExceededException({
        reason: 'requests',
        limit: this.cfg.maxRequestsPerDay,
        current: totals.requestCount,
      });
    }
    if (totals.totalCost >= this.cfg.maxCostPerDayUsd) {
      this.log.warn(
        `org=${organizationId} blocked: cost=$${totals.totalCost.toFixed(4)} >= $${this.cfg.maxCostPerDayUsd}`,
      );
      throw new BudgetExceededException({
        reason: 'cost',
        limit: this.cfg.maxCostPerDayUsd,
        current: totals.totalCost,
      });
    }
  }

  private startOfUtcDay(now: Date = new Date()): Date {
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }
}
