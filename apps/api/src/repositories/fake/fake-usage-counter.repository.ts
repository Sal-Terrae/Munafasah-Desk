import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UsageCounter } from '@prisma/client';
import { IUsageCounterRepository } from '../interfaces/usage-counter.repository.interface';

function key(orgId: string, date: Date, metric: string): string {
  return `${orgId}|${date.toISOString().slice(0, 10)}|${metric}`;
}

@Injectable()
export class FakeUsageCounterRepository implements IUsageCounterRepository {
  readonly rows = new Map<string, UsageCounter>();

  async bump(
    organizationId: string,
    date: Date,
    metric: string,
    delta: number,
  ): Promise<bigint> {
    const k = key(organizationId, date, metric);
    const existing = this.rows.get(k);
    const now = new Date();
    const newCount = (existing?.count ?? BigInt(0)) + BigInt(delta);
    const row: UsageCounter = {
      id: existing?.id ?? randomUUID(),
      organizationId,
      date,
      metric,
      count: newCount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.rows.set(k, row);
    return newCount;
  }

  async findDay(
    organizationId: string,
    date: Date,
  ): Promise<UsageCounter[]> {
    const day = date.toISOString().slice(0, 10);
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          r.date.toISOString().slice(0, 10) === day,
      )
      .map((r) => ({ ...r }));
  }

  async sumRange(
    organizationId: string,
    since: Date,
    until: Date,
  ): Promise<Record<string, bigint>> {
    const out: Record<string, bigint> = {};
    for (const r of this.rows.values()) {
      if (r.organizationId !== organizationId) continue;
      if (r.date < since || r.date >= until) continue;
      out[r.metric] = (out[r.metric] ?? BigInt(0)) + r.count;
    }
    return out;
  }
}
