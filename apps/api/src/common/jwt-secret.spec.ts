import { requireJwtSecret } from './jwt-secret';

describe('requireJwtSecret', () => {
  it('returns the secret when present and long enough', () => {
    expect(
      requireJwtSecret({
        JWT_SECRET: 'a'.repeat(32),
      } as NodeJS.ProcessEnv),
    ).toBe('a'.repeat(32));
  });

  it('throws when the secret is missing', () => {
    expect(() => requireJwtSecret({} as NodeJS.ProcessEnv)).toThrow(
      /JWT_SECRET is required/,
    );
  });

  it('throws when the secret is empty / whitespace', () => {
    expect(() =>
      requireJwtSecret({ JWT_SECRET: '' } as NodeJS.ProcessEnv),
    ).toThrow(/required/);
    expect(() =>
      requireJwtSecret({ JWT_SECRET: '   ' } as NodeJS.ProcessEnv),
    ).toThrow(/required/);
  });

  it('throws when the secret is shorter than 32 characters', () => {
    expect(() =>
      requireJwtSecret({ JWT_SECRET: 'too-short' } as NodeJS.ProcessEnv),
    ).toThrow(/at least 32/);
  });
});
