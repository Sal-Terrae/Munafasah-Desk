export type ResidencyMode = 'ksa' | 'cross_border';

export interface ResidencyConfig {
  mode: ResidencyMode;
  safeguardRegister: string[];
}

export function readResidencyMode(
  env: NodeJS.ProcessEnv = process.env,
): ResidencyConfig {
  const raw = (env.MUNAFASAH_RESIDENCY ?? 'ksa').toLowerCase();
  const mode: ResidencyMode = raw === 'cross_border' ? 'cross_border' : 'ksa';
  const safeguards = (env.MUNAFASAH_CROSS_BORDER_SAFEGUARDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    mode,
    safeguardRegister: mode === 'cross_border' ? safeguards : [],
  };
}
