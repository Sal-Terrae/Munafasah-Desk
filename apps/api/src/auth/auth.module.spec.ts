import { requireJwtSecret } from '../common/jwt-secret';

describe('AuthModule — fail-hard JWT secret', () => {
  it('blocks boot when JWT_SECRET is missing (production guard)', () => {
    const original = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      expect(() => requireJwtSecret()).toThrow(/JWT_SECRET is required/);
    } finally {
      process.env.JWT_SECRET = original;
    }
  });

  it('blocks boot when JWT_SECRET is too weak', () => {
    const original = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = 'short';
      expect(() => requireJwtSecret()).toThrow(/at least 32/);
    } finally {
      process.env.JWT_SECRET = original;
    }
  });

  it('does not expose the legacy dev-secret fallback string', async () => {
    const moduleSource = await import('fs').then((fs) =>
      fs.readFileSync(
        require.resolve('./auth.module'),
        'utf8',
      ),
    );
    expect(moduleSource).not.toMatch(/munafasah-dev-secret/);
    const strategySource = await import('fs').then((fs) =>
      fs.readFileSync(
        require.resolve('./jwt.strategy'),
        'utf8',
      ),
    );
    expect(strategySource).not.toMatch(/munafasah-dev-secret/);
  });
});
