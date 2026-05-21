import { UsageCounter } from '@prisma/client';

export interface IUsageCounterRepository {
  /** Atomic +delta on the (orgId, date, metric) row. Returns the new total. */
  bump(
    organizationId: string,
    date: Date,
    metric: string,
    delta: number,
  ): Promise<bigint>;
  findDay(
    organizationId: string,
    date: Date,
  ): Promise<UsageCounter[]>;
  /** Sum per-metric across [since, until). */
  sumRange(
    organizationId: string,
    since: Date,
    until: Date,
  ): Promise<Record<string, bigint>>;
}
