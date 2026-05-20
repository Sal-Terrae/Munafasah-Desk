import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  CreateLlmUsageData,
  DailyUsageTotals,
  ILlmUsageLogRepository,
} from '../interfaces/llm-usage-log.repository.interface';

@Injectable()
export class LlmUsageLogPrismaRepository implements ILlmUsageLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateLlmUsageData) {
    return this.prisma.llmUsageLog.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        tenderId: data.tenderId ?? null,
        provider: data.provider,
        model: data.model,
        promptVersion: data.promptVersion ?? null,
        jobType: data.jobType ?? null,
        inputTokens: data.inputTokens ?? null,
        outputTokens: data.outputTokens ?? null,
        totalTokens: data.totalTokens ?? null,
        estimatedCost:
          data.estimatedCost === null || data.estimatedCost === undefined
            ? null
            : new Prisma.Decimal(data.estimatedCost),
        status: data.status ?? 'ok',
        errorMessage: data.errorMessage ?? null,
      },
    });
  }

  async dailyTotals(
    organizationId: string,
    since: Date,
  ): Promise<DailyUsageTotals> {
    const agg = await this.prisma.llmUsageLog.aggregate({
      where: {
        organizationId,
        createdAt: { gte: since },
        status: 'ok',
      },
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCost: true },
    });
    return {
      requestCount: agg._count._all,
      totalTokens: agg._sum.totalTokens ?? 0,
      totalCost: Number(agg._sum.estimatedCost ?? 0),
    };
  }
}
