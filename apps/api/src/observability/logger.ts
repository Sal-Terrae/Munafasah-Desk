/** Structured JSON logger. Redacts obvious secrets defensively. */

type Level = 'info' | 'warn' | 'error' | 'debug';
const SECRET_KEYS = /password|token|api[_-]?key|secret|authorization/i;

function redact<T>(value: T): T {
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) ? '[redacted]' : redact(v as unknown);
    }
    return out as T;
  }
  return value;
}

export function logEvent(
  level: Level,
  message: string,
  context: Record<string, unknown> = {},
  sink: (line: string) => void = (l) => process.stdout.write(l + '\n'),
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...redact(context),
  });
  sink(line);
}
