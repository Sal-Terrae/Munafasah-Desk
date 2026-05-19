import { readResidencyMode } from './residency';

describe('readResidencyMode', () => {
  it('defaults to ksa with an empty safeguard register', () => {
    const cfg = readResidencyMode({} as NodeJS.ProcessEnv);
    expect(cfg.mode).toBe('ksa');
    expect(cfg.safeguardRegister).toEqual([]);
  });

  it('cross_border mode parses comma-separated safeguards', () => {
    const cfg = readResidencyMode({
      MUNAFASAH_RESIDENCY: 'cross_border',
      MUNAFASAH_CROSS_BORDER_SAFEGUARDS: 'SCC, adequacy_decision , dpa',
    } as NodeJS.ProcessEnv);
    expect(cfg.mode).toBe('cross_border');
    expect(cfg.safeguardRegister).toEqual([
      'SCC',
      'adequacy_decision',
      'dpa',
    ]);
  });

  it('ksa mode ignores safeguard env (register stays empty)', () => {
    const cfg = readResidencyMode({
      MUNAFASAH_RESIDENCY: 'ksa',
      MUNAFASAH_CROSS_BORDER_SAFEGUARDS: 'SCC',
    } as NodeJS.ProcessEnv);
    expect(cfg.safeguardRegister).toEqual([]);
  });
});
