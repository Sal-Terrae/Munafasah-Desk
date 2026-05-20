import { Logger } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import type {
  ILlmProvider,
  LlmJsonInput,
  LlmResult,
  LlmTextInput,
} from './llm.provider.interface';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  highQualityModel?: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  /** Injectable fetch — defaults to global fetch. Tests pass a stub. */
  fetchImpl?: typeof fetch;
}

interface ChatCompletionResponse {
  choices: Array<{ message?: { content?: string | null } | null }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class DeepSeekLlmProvider implements ILlmProvider {
  readonly name = 'deepseek';
  private readonly log = new Logger(DeepSeekLlmProvider.name);
  private readonly doFetch: typeof fetch;

  constructor(private readonly cfg: DeepSeekConfig) {
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  async generateJson<T>(
    input: LlmJsonInput,
    schema: ZodSchema<T>,
  ): Promise<LlmResult<T>> {
    const raw = await this.callChat(input, true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.content);
    } catch (err) {
      throw new Error(
        `DeepSeek JSON parse failed: ${(err as Error).message}`,
      );
    }
    const validated = schema.parse(parsed);
    return {
      output: validated,
      model: raw.model,
      provider: this.name,
      usage: raw.usage,
    };
  }

  async generateText(input: LlmTextInput): Promise<LlmResult<string>> {
    const raw = await this.callChat(input, false);
    return {
      output: raw.content,
      model: raw.model,
      provider: this.name,
      usage: raw.usage,
    };
  }

  private async callChat(
    input: LlmJsonInput,
    jsonMode: boolean,
  ): Promise<{
    content: string;
    model: string;
    usage?: LlmResult<unknown>['usage'];
  }> {
    const model = input.model ?? this.cfg.defaultModel;
    const body = {
      model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      temperature: input.temperature ?? this.cfg.defaultTemperature,
      max_tokens: input.maxTokens ?? this.cfg.defaultMaxTokens,
      stream: false,
      ...(jsonMode
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    };

    const res = await this.doFetch(
      `${this.cfg.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `DeepSeek HTTP ${res.status}: ${text.slice(0, 500)}`,
      );
    }

    const json = (await res.json()) as ChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content ?? '';
    if (!content) {
      throw new Error('DeepSeek returned empty content');
    }
    return {
      content,
      model,
      usage: json.usage
        ? {
            inputTokens: json.usage.prompt_tokens,
            outputTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
    };
  }
}
