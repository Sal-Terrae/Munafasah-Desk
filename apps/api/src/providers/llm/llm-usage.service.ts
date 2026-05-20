import { Inject, Injectable, Logger } from '@nestjs/common';
import { ILlmUsageLogRepository } from '../../repositories/interfaces/llm-usage-log.repository.interface';
import { LLM_USAGE_LOG_REPOSITORY } from '../../repositories/tokens';
import type { LlmResult } from './llm.provider.interface';

export interface RecordUsageInput {
  organizationId: string;
  tenderId?: string | null;
  jobType?: string | null;
  promptVersion?: string | null;
  result: LlmResult<unknown>;
  /** Optional cost-per-1k-tokens override (USD); else uses env table. */
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

/**
 * Records one usage row per LLM call. Pure write — cost estimation
 * uses per-provider rate-cards from env so call sites don't need
 * pricing knowledge. Errors here are logged but never thrown — a
 * failed usage write must not break the user's request.
 */
@Injectable()
export class LlmUsageService {
  private readonly log = new Logger(LlmUsageService.name);

  constructor(
    @Inject(LLM_USAGE_LOG_REPOSITORY)
    private readonly repo: ILlmUsageLogRepository,
  ) {}

  async recordOk(input: RecordUsageInput): Promise<void> {
    const usage = input.result.usage ?? {};
    const cost = this.estimateCost(
      input.result.provider,
      input.result.model,
      usage.inputTokens ?? 0,
      usage.outputTokens ?? 0,
      input.costPer1kInput,
      input.costPer1kOutput,
    );
    try {
      await this.repo.create({
        organizationId: input.organizationId,
        tenderId: input.tenderId ?? null,
        provider: input.result.provider,
        model: input.result.model,
        promptVersion: input.promptVersion ?? null,
        jobType: input.jobType ?? null,
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        totalTokens: usage.totalTokens ?? null,
        estimatedCost: cost,
        status: 'ok',
      });
    } catch (err) {
      this.log.error(
        `failed to record LLM usage: ${(err as Error).message}`,
      );
    }
  }

  async recordBlocked(
    organizationId: string,
    provider: string,
    model: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.repo.create({
        organizationId,
        provider,
        model,
        status: 'budget_blocked',
        errorMessage: reason,
      });
    } catch (err) {
      this.log.error(
        `failed to record blocked LLM usage: ${(err as Error).message}`,
      );
    }
  }

  async recordError(
    organizationId: string,
    provider: string,
    model: string,
    message: string,
  ): Promise<void> {
    try {
      await this.repo.create({
        organizationId,
        provider,
        model,
        status: 'error',
        errorMessage: message.slice(0, 500),
      });
    } catch (err) {
      this.log.error(
        `failed to record error LLM usage: ${(err as Error).message}`,
      );
    }
  }

  private estimateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    overrideIn?: number,
    overrideOut?: number,
  ): number | null {
    if (!inputTokens && !outputTokens) return null;
    const rates = this.rateCard(provider, model);
    const inPer1k = overrideIn ?? rates.inputPer1k;
    const outPer1k = overrideOut ?? rates.outputPer1k;
    if (inPer1k === 0 && outPer1k === 0) return 0;
    return (
      (inputTokens / 1000) * inPer1k +
      (outputTokens / 1000) * outPer1k
    );
  }

  /**
   * Cost rate-card. DeepSeek published rates as of writing (USD per 1k
   * tokens). Update via env when prices change without redeploying.
   */
  private rateCard(
    provider: string,
    model: string,
  ): { inputPer1k: number; outputPer1k: number } {
    if (provider === 'mock' || provider === 'ollama') {
      return { inputPer1k: 0, outputPer1k: 0 };
    }
    if (provider === 'deepseek') {
      if (model.includes('pro')) {
        return {
          inputPer1k: Number(
            process.env.DEEPSEEK_PRO_INPUT_PER_1K ?? '0.0014',
          ),
          outputPer1k: Number(
            process.env.DEEPSEEK_PRO_OUTPUT_PER_1K ?? '0.0028',
          ),
        };
      }
      return {
        inputPer1k: Number(
          process.env.DEEPSEEK_FLASH_INPUT_PER_1K ?? '0.00014',
        ),
        outputPer1k: Number(
          process.env.DEEPSEEK_FLASH_OUTPUT_PER_1K ?? '0.00028',
        ),
      };
    }
    return { inputPer1k: 0, outputPer1k: 0 };
  }
}
