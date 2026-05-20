import { z } from 'zod';
import { MockLlmProvider } from './mock.llm.provider';
import { DeepSeekLlmProvider } from './deepseek.llm.provider';
import { OllamaLlmProvider } from './ollama.llm.provider';
import { createLlmProvider } from './create-llm-provider.factory';

describe('MockLlmProvider', () => {
  it('records calls and returns schema-validated json', async () => {
    const schema = z.object({ ok: z.boolean(), n: z.number() });
    const m = new MockLlmProvider({ jsonResponse: { ok: true, n: 42 } });
    const r = await m.generateJson(
      { systemPrompt: 's', userPrompt: 'u' },
      schema,
    );
    expect(r.output).toEqual({ ok: true, n: 42 });
    expect(r.provider).toBe('mock');
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0].kind).toBe('json');
  });

  it('rejects when canned response fails schema', async () => {
    const schema = z.object({ ok: z.boolean() });
    const m = new MockLlmProvider({ jsonResponse: { ok: 'not-a-bool' } });
    await expect(
      m.generateJson({ systemPrompt: 's', userPrompt: 'u' }, schema),
    ).rejects.toThrow();
  });

  it('returns canned text from generateText', async () => {
    const m = new MockLlmProvider({ textResponse: 'hello' });
    const r = await m.generateText({ systemPrompt: 's', userPrompt: 'u' });
    expect(r.output).toBe('hello');
  });
});

describe('DeepSeekLlmProvider (fetch stubbed — no network)', () => {
  const baseOk = {
    choices: [{ message: { content: '{"x":1}' } }],
    usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
  };

  const okFetch: typeof fetch = async () =>
    new Response(JSON.stringify(baseOk), { status: 200 });

  it('parses JSON output via response_format json_object', async () => {
    let capturedBody: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(baseOk), { status: 200 });
    };
    const p = new DeepSeekLlmProvider({
      apiKey: 'k',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      defaultTemperature: 0.1,
      defaultMaxTokens: 8000,
      fetchImpl,
    });
    const r = await p.generateJson(
      { systemPrompt: 's', userPrompt: 'u' },
      z.object({ x: z.number() }),
    );
    expect(r.output).toEqual({ x: 1 });
    expect(r.usage).toEqual({
      inputTokens: 7,
      outputTokens: 3,
      totalTokens: 10,
    });
    expect((capturedBody as { response_format?: unknown }).response_format).toEqual({
      type: 'json_object',
    });
  });

  it('does not pass response_format for generateText', async () => {
    let capturedBody: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'hello' } }],
        }),
        { status: 200 },
      );
    };
    const p = new DeepSeekLlmProvider({
      apiKey: 'k',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      defaultTemperature: 0.1,
      defaultMaxTokens: 8000,
      fetchImpl,
    });
    const r = await p.generateText({ systemPrompt: 's', userPrompt: 'u' });
    expect(r.output).toBe('hello');
    expect(
      (capturedBody as { response_format?: unknown }).response_format,
    ).toBeUndefined();
  });

  it('throws with status info on HTTP error', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('boom', { status: 500 });
    const p = new DeepSeekLlmProvider({
      apiKey: 'k',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      defaultTemperature: 0.1,
      defaultMaxTokens: 8000,
      fetchImpl,
    });
    await expect(
      p.generateText({ systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow(/HTTP 500/);
  });

  it('throws on invalid JSON when in json mode', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'not json' } }] }),
        { status: 200 },
      );
    const p = new DeepSeekLlmProvider({
      apiKey: 'k',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      defaultTemperature: 0.1,
      defaultMaxTokens: 8000,
      fetchImpl,
    });
    await expect(
      p.generateJson(
        { systemPrompt: 's', userPrompt: 'u' },
        z.object({}),
      ),
    ).rejects.toThrow(/JSON parse failed/);
  });
});

describe('OllamaLlmProvider (fetch stubbed)', () => {
  it('uses format=json and parses output', async () => {
    let capturedBody: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          model: 'qwen2.5:7b-instruct',
          message: { content: '{"ok":true}' },
          prompt_eval_count: 5,
          eval_count: 2,
        }),
        { status: 200 },
      );
    };
    const p = new OllamaLlmProvider({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'qwen2.5:7b-instruct',
      defaultTemperature: 0.2,
      defaultMaxTokens: 8000,
      fetchImpl,
    });
    const r = await p.generateJson(
      { systemPrompt: 's', userPrompt: 'u' },
      z.object({ ok: z.boolean() }),
    );
    expect(r.output).toEqual({ ok: true });
    expect(r.usage?.totalTokens).toBe(7);
    expect((capturedBody as { format?: string }).format).toBe('json');
  });
});

describe('createLlmProvider (env factory)', () => {
  it('falls back to mock when LLM_PROVIDER=deepseek but no API key', () => {
    const p = createLlmProvider({ LLM_PROVIDER: 'deepseek' } as NodeJS.ProcessEnv);
    expect(p.name).toBe('mock');
  });

  it('returns DeepSeek when key + provider=deepseek', () => {
    const p = createLlmProvider({
      LLM_PROVIDER: 'deepseek',
      DEEPSEEK_API_KEY: 'k',
    } as NodeJS.ProcessEnv);
    expect(p.name).toBe('deepseek');
  });

  it('returns Ollama when provider=ollama', () => {
    const p = createLlmProvider({
      LLM_PROVIDER: 'ollama',
    } as NodeJS.ProcessEnv);
    expect(p.name).toBe('ollama');
  });

  it('returns mock by default when nothing is set', () => {
    const p = createLlmProvider({} as NodeJS.ProcessEnv);
    expect(p.name).toBe('mock');
  });

  it('throws for unknown provider', () => {
    expect(() =>
      createLlmProvider({ LLM_PROVIDER: 'gpt5' } as NodeJS.ProcessEnv),
    ).toThrow(/Unsupported LLM_PROVIDER/);
  });
});
