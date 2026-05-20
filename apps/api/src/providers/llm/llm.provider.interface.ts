import type { ZodSchema } from 'zod';

export interface LlmJsonInput {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface LlmTextInput extends LlmJsonInput {}

export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
}

export interface LlmResult<T> {
  output: T;
  model: string;
  provider: string;
  usage?: LlmUsage;
}

export interface ILlmProvider {
  readonly name: string;
  generateJson<T>(
    input: LlmJsonInput,
    schema: ZodSchema<T>,
  ): Promise<LlmResult<T>>;
  generateText(input: LlmTextInput): Promise<LlmResult<string>>;
}
