import { Inject, Injectable } from '@nestjs/common';
import { IUsageCounterRepository } from '../repositories/interfaces/usage-counter.repository.interface';
import { USAGE_COUNTER_REPOSITORY } from '../repositories/tokens';

/** Canonical metric names — keep this list small so dashboards stay sane. */
export type UsageMetric =
  | 'llm_requests'
  | 'llm_tokens'
  | 'documents_created'
  | 'webhook_events'
  | 'inbound_emails';

export interface DailyUsage {
  date: string; // YYYY-MM-DD (UTC)
  byMetric: Record<string, number>;
}

@Injectable()
export class UsageCounterService {
  constructor(
    @Inject(USAGE_COUNTER_REPOSITORY)
    private readonly repo: IUsageCounterRepository,
  ) {}

  /** Bump the metric for the org by delta (default 1). Returns new total. */
  bump(
    organizationId: string,
    metric: UsageMetric,
    delta = 1,
    now: Date = new Date(),
  ): Promise<bigint> {
    return this.repo.bump(organizationId, this.startOfUtcDay(now), metric, delta);
  }

  async today(
    organizationId: string,
    now: Date = new Date(),
  ): Promise<DailyUsage> {
    const day = this.startOfUtcDay(now);
    const rows = await this.repo.findDay(organizationId, day);
    const out: Record<string, number> = {};
    for (const r of rows) out[r.metric] = Number(r.count);
    return { date: day.toISOString().slice(0, 10), byMetric: out };
  }

  /** Sum across [since, until). Useful for the current billing period view. */
  async sumRange(
    organizationId: string,
    since: Date,
    until: Date,
  ): Promise<Record<string, number>> {
    const raw = await this.repo.sumRange(organizationId, since, until);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = Number(v);
    return out;
  }

  private startOfUtcDay(now: Date): Date {
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
