import { FitScoringService, FitSignals } from './fit-scoring.service';

const strong: FitSignals = {
  capability: 1,
  daysToDeadline: 30,
  evidenceReadiness: 1,
  riskLevel: 'low',
};

describe('FitScoringService', () => {
  const svc = new FitScoringService();

  it('is deterministic and explainable (factors sum to score)', () => {
    const a = svc.score(strong);
    const b = svc.score(strong);
    expect(a).toEqual(b);
    const sum = a.factors.reduce((s, f) => s + f.contribution, 0);
    expect(sum).toBe(a.computedScore);
    expect(a.factors.map((f) => f.name).sort()).toEqual([
      'capability',
      'evidence',
      'risk',
      'timeline',
    ]);
  });

  it('strong signals -> high score -> bid', () => {
    const r = svc.score(strong);
    expect(r.computedScore).toBe(100);
    expect(r.recommendation).toBe('bid');
  });

  it('weak signals -> low score -> no_bid', () => {
    const r = svc.score({
      capability: 0.1,
      daysToDeadline: 2,
      evidenceReadiness: 0.1,
      riskLevel: 'high',
    });
    expect(r.computedScore).toBeLessThan(40);
    expect(r.recommendation).toBe('no_bid');
  });

  it('sector packs change the weighting deterministically', () => {
    const base = svc.score({ ...strong, capability: 0.5, sector: 'default' });
    const tech = svc.score({
      ...strong,
      capability: 0.5,
      sector: 'technology',
    });
    // technology weights capability higher -> different contribution
    const baseCap = base.factors.find((f) => f.name === 'capability')!;
    const techCap = tech.factors.find((f) => f.name === 'capability')!;
    expect(techCap.weight).toBeGreaterThan(baseCap.weight);
    expect(tech.sector).toBe('technology');
  });

  it('unknown sector falls back to default', () => {
    expect(svc.score({ ...strong, sector: 'spacemining' }).sector).toBe(
      'default',
    );
  });

  it('override requires a reason and valid range, keeps computed', () => {
    const r = svc.override(strong, 35, 'strategic: capacity committed');
    expect(r.overridden).toBe(true);
    expect(r.finalScore).toBe(35);
    expect(r.recommendation).toBe('no_bid');
    expect(r.computedScore).toBe(100); // transparency: original kept
    expect(() => svc.override(strong, 35, '')).toThrow();
    expect(() => svc.override(strong, 150, 'x')).toThrow();
  });
});
