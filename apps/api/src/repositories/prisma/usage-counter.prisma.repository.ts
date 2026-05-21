import { Injectable } from '@nestjs/common';
import { UsageCounter } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { IUsageCounterRepository } from '../interfaces/usage-counter.repository.interface';

@Injectable()
export class UsageCounterPrismaRepository
  implements IUsageCounterRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async bump(
    organizationId: string,
    date: Date,
    metric: string,
    delta: number,
  ): Promise<bigint> {
    // Upsert by unique (orgId, date, metric). increment is atomic at the DB.
    const row = await this.prisma.usageCounter.upsert({
      where: {
        organizationId_date_metric: { organizationId, date, metric },
      },
      create: {
        organization: { connect: { id: organizationId } },
        date,
        metric,
        count: BigInt(delta),
      },
      update: {
        count: { increment: BigInt(delta) },
      },
    });
    return row.count;
  }

  findDay(organizationId: string, date: Date) {
    return this.prisma.usageCounter.findMany({
      where: { organizationId, date },
    });
  }

  async sumRange(
    organizationId: string,
    since: Date,
    until: Date,
  ): Promise<Record<string, bigint>> {
    const rows = await this.prisma.usageCounter.groupBy({
      by: ['metric'],
      where: {
        organizationId,
        date: { gte: since, lt: until },
      },
      _sum: { count: true },
    });
    const out: Record<string, bigint> = {};
    for (const r of rows) {
      out[r.metric] = r._sum.count ?? BigInt(0);
    }
    return out;
  }
}
