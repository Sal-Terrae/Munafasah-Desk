/* eslint-disable no-console */
import { z } from 'zod';
import { createLlmProvider } from '../providers/llm/create-llm-provider.factory';

/**
 * Smoke test for the configured LLM provider. Run with:
 *   npm run smoke:llm
 *
 * Prints provider, model, output, and usage so an operator can
 * verify DeepSeek (or whichever provider) before kicking off real
 * sector-classification or ingestion runs.
 *
 * Exit codes:
 *   0  success
 *   1  network / parse failure
 *   2  schema validation failure
 */
async function main(): Promise<void> {
  const provider = createLlmProvider(process.env);
  console.log(`provider: ${provider.name}`);

  const schema = z.object({
    pong: z.literal(true),
    greeting: z.string().min(1).max(60),
  });

  try {
    const r = await provider.generateJson(
      {
        systemPrompt:
          'You are a smoke-test responder. Return only JSON conforming to the requested schema. Do not add commentary.',
        userPrompt: JSON.stringify({
          instruction:
            'Return { "pong": true, "greeting": "<short greeting in Arabic>" }',
        }),
        temperature: 0.1,
        maxTokens: 60,
      },
      schema,
    );
    console.log('output:', r.output);
    console.log(`model: ${r.model}`);
    if (r.usage) {
      console.log(
        `usage: in=${r.usage.inputTokens ?? '?'} out=${r.usage.outputTokens ?? '?'} total=${r.usage.totalTokens ?? '?'}`,
      );
    }
    process.exit(0);
  } catch (err) {
    if (
      provider.name === 'mock' &&
      err &&
      (err as { name?: string }).name === 'ZodError'
    ) {
      // Expected in mock mode: the mock returns {} which doesn't
      // satisfy the schema. The smoke value here is "we constructed
      // the provider + the call returned without a network error",
      // which is all we can verify offline.
      console.log(
        'mock provider: wiring OK (schema fails as expected — mock returns {} by default)',
      );
      process.exit(0);
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('JSON parse') || msg.includes('HTTP')) {
      console.error('network / parse failure:', msg);
      process.exit(1);
    }
    if (err && (err as { name?: string }).name === 'ZodError') {
      console.error('schema validation failed:', msg);
      process.exit(2);
    }
    console.error('smoke failed:', msg);
    process.exit(1);
  }
}

main();
