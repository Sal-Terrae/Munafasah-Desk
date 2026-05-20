import type { ZodSchema } from 'zod';
import type {
  ILlmProvider,
  LlmJsonInput,
  LlmResult,
  LlmTextInput,
} from './llm.provider.interface';

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  fetchImpl?: typeof fetch;
}

interface OllamaChatResponse {
  model: string;
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaLlmProvider implements ILlmProvider {
  readonly name = 'ollama';
  private readonly doFetch: typeof fetch;

  constructor(private readonly cfg: OllamaConfig) {
    this.doFetch = cfg.fetchImpl ?? fetch;
  }

  async generateJson<T>(
    input: LlmJsonInput,
    schema: ZodSchema<T>,
  ): Promise<LlmResult<T>> {
    const { content, model, usage } = await this.callChat(input, true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(
        `Ollama JSON parse failed: ${(err as Error).message}`,
      );
    }
    return {
      output: schema.parse(parsed),
      model,
      provider: this.name,
      usage,
    };
  }

  async generateText(input: LlmTextInput): Promise<LlmResult<string>> {
    const { content, model, usage } = await this.callChat(input, false);
    return { output: content, model, provider: this.name, usage };
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
      stream: false,
      options: {
        temperature: input.temperature ?? this.cfg.defaultTemperature,
        num_predict: input.maxTokens ?? this.cfg.defaultMaxTokens,
      },
      ...(jsonMode ? { format: 'json' as const } : {}),
    };

    const res = await this.doFetch(
      `${this.cfg.baseUrl.replace(/\/$/, '')}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    const json = (await res.json()) as OllamaChatResponse;
    const content = json.message?.content ?? '';
    if (!content) {
      throw new Error('Ollama returned empty content');
    }
    return {
      content,
      model,
      usage: {
        inputTokens: json.prompt_eval_count,
        outputTokens: json.eval_count,
        totalTokens:
          (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0) ||
          undefined,
      },
    };
  }
}
