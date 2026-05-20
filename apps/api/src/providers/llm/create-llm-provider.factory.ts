import { Logger } from '@nestjs/common';
import type { ILlmProvider } from './llm.provider.interface';
import { DeepSeekLlmProvider } from './deepseek.llm.provider';
import { OllamaLlmProvider } from './ollama.llm.provider';
import { MockLlmProvider } from './mock.llm.provider';

const log = new Logger('createLlmProvider');

/**
 * Pure factory. Reads env → returns one provider.
 *
 * Selection:
 *   LLM_PROVIDER=deepseek (default if DEEPSEEK_API_KEY set) — DeepSeek
 *   LLM_PROVIDER=ollama   — local Ollama
 *   LLM_PROVIDER=mock     (fallback) — deterministic, no network
 *
 * Fail-soft: if `deepseek` is requested but DEEPSEEK_API_KEY is unset,
 * we log a warning and return the mock — keeps tests + first-boot
 * green without paid credentials. The BudgetGuard (separate concern)
 * enforces fail-closed cost limits on top of whichever provider runs.
 */
export function createLlmProvider(
  env: NodeJS.ProcessEnv = process.env,
): ILlmProvider {
  const requested = (env.LLM_PROVIDER ?? '').toLowerCase();
  const provider =
    requested ||
    (env.DEEPSEEK_API_KEY ? 'deepseek' : 'mock');

  if (provider === 'deepseek') {
    if (!env.DEEPSEEK_API_KEY) {
      log.warn(
        'LLM_PROVIDER=deepseek but DEEPSEEK_API_KEY is unset; falling back to mock.',
      );
      return new MockLlmProvider();
    }
    return new DeepSeekLlmProvider({
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      defaultModel: env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash',
      highQualityModel:
        env.DEEPSEEK_HIGH_QUALITY_MODEL ?? 'deepseek-v4-pro',
      defaultTemperature: Number(env.DEEPSEEK_TEMPERATURE ?? '0.1'),
      defaultMaxTokens: Number(env.DEEPSEEK_MAX_TOKENS ?? '8000'),
    });
  }

  if (provider === 'ollama') {
    return new OllamaLlmProvider({
      baseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      defaultModel: env.OLLAMA_CHAT_MODEL ?? 'qwen2.5:7b-instruct',
      defaultTemperature: Number(env.OLLAMA_TEMPERATURE ?? '0.2'),
      defaultMaxTokens: Number(env.OLLAMA_MAX_TOKENS ?? '8000'),
    });
  }

  if (provider === 'mock') {
    return new MockLlmProvider();
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${requested}`);
}
