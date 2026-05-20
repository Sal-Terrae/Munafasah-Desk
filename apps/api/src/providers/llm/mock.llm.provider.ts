import type { ZodSchema } from 'zod';
import type {
  ILlmProvider,
  LlmJsonInput,
  LlmResult,
  LlmTextInput,
} from './llm.provider.interface';

export interface MockLlmConfig {
  /** Optional canned JSON for generateJson — schema-validated still. */
  jsonResponse?: unknown;
  /** Optional canned text for generateText. */
  textResponse?: string;
  /** Model label echoed back so tests can assert. */
  model?: string;
}

/**
 * Default provider for tests and the dev profile when no real key is
 * configured. Deterministic, no network. Records calls so tests can
 * assert on prompts.
 */
export class MockLlmProvider implements ILlmProvider {
  readonly name = 'mock';
  readonly calls: Array<{
    kind: 'json' | 'text';
    input: LlmJsonInput;
  }> = [];

  constructor(private readonly cfg: MockLlmConfig = {}) {}

  async generateJson<T>(
    input: LlmJsonInput,
    schema: ZodSchema<T>,
  ): Promise<LlmResult<T>> {
    this.calls.push({ kind: 'json', input });
    const value = this.cfg.jsonResponse ?? {};
    return {
      output: schema.parse(value),
      model: this.cfg.model ?? 'mock-json',
      provider: this.name,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  async generateText(input: LlmTextInput): Promise<LlmResult<string>> {
    this.calls.push({ kind: 'text', input });
    return {
      output: this.cfg.textResponse ?? '',
      model: this.cfg.model ?? 'mock-text',
      provider: this.name,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }
}
