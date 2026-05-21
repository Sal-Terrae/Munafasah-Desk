/**
 * Closed enum of sectors the classifier picks from. Restricting the
 * output keeps reports clean (no 'IT', 'I.T.', 'tech' duplicates) and
 * lets the prompt force the model into a known vocabulary via the
 * structured JSON contract.
 */
export const SECTORS = [
  'construction',
  'it_software',
  'healthcare',
  'telecom',
  'transport_logistics',
  'energy_utilities',
  'oil_gas',
  'education',
  'defense_security',
  'manufacturing',
  'professional_services',
  'retail_consumer',
  'agriculture',
  'public_sector_admin',
  'other',
] as const;

export type Sector = (typeof SECTORS)[number];

export function isSector(v: unknown): v is Sector {
  return typeof v === 'string' && (SECTORS as readonly string[]).includes(v);
}
