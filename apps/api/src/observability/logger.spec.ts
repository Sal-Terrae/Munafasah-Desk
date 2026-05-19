import { logEvent } from './logger';

describe('logEvent', () => {
  it('emits structured JSON with ts/level/message and context fields', () => {
    let captured = '';
    logEvent('info', 'hello', { phase: 8, n: 1 }, (l) => (captured = l));
    const parsed = JSON.parse(captured);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('hello');
    expect(parsed.phase).toBe(8);
    expect(parsed.n).toBe(1);
    expect(typeof parsed.ts).toBe('string');
  });

  it('redacts obviously secret-shaped keys defensively', () => {
    let captured = '';
    logEvent(
      'info',
      'sensitive',
      {
        password: 'should-not-leak',
        api_key: 'should-not-leak',
        nested: { token: 'gone', ok: 'kept' },
        safe: 'kept',
      },
      (l) => (captured = l),
    );
    const parsed = JSON.parse(captured);
    expect(parsed.password).toBe('[redacted]');
    expect(parsed.api_key).toBe('[redacted]');
    expect(parsed.nested.token).toBe('[redacted]');
    expect(parsed.nested.ok).toBe('kept');
    expect(parsed.safe).toBe('kept');
  });
});
