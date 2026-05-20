import { LlmUsageLog } from '@prisma/client';

export interface CreateLlmUsageData {
  organizationId: string;
  tenderId?: string | null;
  provider: string;
  model: string;
  promptVersion?: string | null;
  jobType?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  estimatedCost?: number | null;
  status?: 'ok' | 'error' | 'budget_blocked';
  errorMessage?: string | null;
}

export interface DailyUsageTotals {
  requestCount: number;
  totalTokens: number;
  totalCost: number;
}

export interface ILlmUsageLogRepository {
  create(data: CreateLlmUsageData): Promise<LlmUsageLog>;
  /**
   * Sum of `ok`-status rows in [since, now). `budget_blocked` and
   * `error` rows are excluded so a blocked attempt doesn't itself
   * count toward the budget — otherwise a single rejected call would
   * permanently jam future calls.
   */
  dailyTotals(
    organizationId: string,
    since: Date,
  ): Promise<DailyUsageTotals>;
}
