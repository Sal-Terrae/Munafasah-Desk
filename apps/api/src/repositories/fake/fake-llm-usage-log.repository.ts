import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LlmUsageLog, Prisma } from '@prisma/client';
import {
  CreateLlmUsageData,
  DailyUsageTotals,
  ILlmUsageLogRepository,
} from '../interfaces/llm-usage-log.repository.interface';

@Injectable()
export class FakeLlmUsageLogRepository implements ILlmUsageLogRepository {
  readonly rows: LlmUsageLog[] = [];

  async create(data: CreateLlmUsageData): Promise<LlmUsageLog> {
    const row: LlmUsageLog = {
      id: randomUUID(),
      organizationId: data.organizationId,
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
      createdAt: new Date(),
    };
    this.rows.push(row);
    return { ...row };
  }

  async dailyTotals(
    organizationId: string,
    since: Date,
  ): Promise<DailyUsageTotals> {
    let count = 0;
    let tokens = 0;
    let cost = 0;
    for (const r of this.rows) {
      if (r.organizationId !== organizationId) continue;
      if (r.status !== 'ok') continue;
      if (r.createdAt < since) continue;
      count += 1;
      tokens += r.totalTokens ?? 0;
      cost += r.estimatedCost ? Number(r.estimatedCost) : 0;
    }
    return { requestCount: count, totalTokens: tokens, totalCost: cost };
  }
}
