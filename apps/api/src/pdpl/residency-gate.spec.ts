import { ResidencyGate, ResidencyViolation } from './residency-gate';

function gate(env: Record<string, string | undefined>): ResidencyGate {
  const g = new ResidencyGate();
  g.loadFrom(env as NodeJS.ProcessEnv);
  return g;
}

const ksaProvider = {
  name: 'vertex-me-central2',
  jurisdiction: 'ksa' as const,
};
const fallbackUS = {
  name: 'openai-us',
  jurisdiction: 'cross_border' as const,
};
const safeguardedUS = {
  name: 'openai-us-scc',
  jurisdiction: 'cross_border' as const,
  safeguard: 'standard-contractual-clauses-2024',
};

describe('ResidencyGate (ksa mode, default)', () => {
  it('low-sensitivity data flows to any provider', () => {
    const g = gate({});
    expect(g.isAllowed(ksaProvider, 'low')).toBe(true);
    expect(g.isAllowed(fallbackUS, 'low')).toBe(true);
  });

  it('medium/high data must stay with a ksa-jurisdiction provider', () => {
    const g = gate({});
    expect(g.isAllowed(ksaProvider, 'medium')).toBe(true);
    expect(g.isAllowed(ksaProvider, 'high')).toBe(true);
    expect(g.isAllowed(fallbackUS, 'medium')).toBe(false);
    expect(g.isAllowed(fallbackUS, 'high')).toBe(false);
    expect(g.isAllowed(safeguardedUS, 'high')).toBe(false);
  });

  it('assertAllowed throws ResidencyViolation on a forbidden combo', () => {
    const g = gate({});
    expect(() => g.assertAllowed(fallbackUS, 'high')).toThrow(
      ResidencyViolation,
    );
    expect(() => g.assertAllowed(ksaProvider, 'high')).not.toThrow();
  });
});

describe('ResidencyGate (cross_border mode, opt-in)', () => {
  const baseEnv = { MUNAFASAH_RESIDENCY: 'cross_border' };

  it('still refuses cross-border providers WITHOUT a registered safeguard', () => {
    const g = gate({
      ...baseEnv,
      MUNAFASAH_CROSS_BORDER_SAFEGUARDS: 'some-other-safeguard',
    });
    expect(g.isAllowed(fallbackUS, 'high')).toBe(false);
    expect(g.isAllowed(safeguardedUS, 'high')).toBe(false); // not registered
  });

  it('permits cross-border with a registered safeguard', () => {
    const g = gate({
      ...baseEnv,
      MUNAFASAH_CROSS_BORDER_SAFEGUARDS:
        'standard-contractual-clauses-2024,bcrs-2024',
    });
    expect(g.isAllowed(safeguardedUS, 'high')).toBe(true);
    expect(g.isAllowed(safeguardedUS, 'medium')).toBe(true);
    // Provider without a safeguard token is still refused.
    expect(g.isAllowed(fallbackUS, 'high')).toBe(false);
  });

  it('mode reports the effective env value', () => {
    expect(gate({}).mode).toBe('ksa');
    expect(gate(baseEnv).mode).toBe('cross_border');
  });

  it('low-sensitivity is always allowed regardless of mode/safeguard', () => {
    const g = gate(baseEnv);
    expect(g.isAllowed(fallbackUS, 'low')).toBe(true);
  });
});

describe('ResidencyGate (env fallback)', () => {
  it('treats unknown MUNAFASAH_RESIDENCY values as ksa (fail-safe)', () => {
    const g = gate({ MUNAFASAH_RESIDENCY: 'antarctica' });
    expect(g.mode).toBe('ksa');
    expect(g.isAllowed(fallbackUS, 'high')).toBe(false);
  });
});
