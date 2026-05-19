import {
  ComplianceRequirement,
  ComplianceService,
  EvidenceDoc,
} from '../compliance/compliance.service';
import { ExportService, SubmissionPack } from './export.service';

const NOW = new Date('2026-05-19T00:00:00Z');

const goodVault: EvidenceDoc[] = [
  { id: 'd1', documentType: 'legal', state: 'active', expiresAt: null },
  {
    id: 'd2',
    documentType: 'financial',
    state: 'active',
    expiresAt: null,
  },
];

const reqs: ComplianceRequirement[] = [
  { id: 'r1', text: 'CR', category: 'legal', critical: true },
  { id: 'r2', text: 'Bond', category: 'financial', critical: true },
];

describe('ExportService', () => {
  const compliance = new ComplianceService();
  const exporter = new ExportService(compliance);

  it('builds a consistent, deterministic pack when all critical rows satisfied', () => {
    const matrix = compliance.generateMatrix('t1', reqs, goodVault, {
      now: NOW,
    });
    const pack = exporter.build(matrix, [], NOW) as SubmissionPack;
    expect('blocked' in pack).toBe(false);
    expect(pack.manifest.schemaVersion).toBe('1');
    expect(pack.manifest.tenderId).toBe('t1');
    expect(pack.manifest.artifactNames).toEqual([
      'compliance-matrix.csv',
      'open-tasks.json',
      'manifest.json',
    ]);
    // CSV header always present
    expect(pack.artifacts[0].content.split('\n')[0]).toBe(
      'requirementId,category,owner,risk,status,evidenceDocId',
    );
    // deterministic: same inputs -> identical pack
    const pack2 = exporter.build(matrix, [], NOW) as SubmissionPack;
    expect(pack2).toEqual(pack);
  });

  it('blocks export when a critical row is missing (no pack emitted)', () => {
    const matrix = compliance.generateMatrix('t1', reqs, [], { now: NOW });
    const result = exporter.build(matrix, [], NOW);
    expect('blocked' in result && result.blocked).toBe(true);
    if ('blocked' in result) {
      expect(result.blockingRequirementIds.sort()).toEqual(['r1', 'r2']);
    }
  });

  it('explicit override unblocks the export and is recorded in manifest', () => {
    const matrix = compliance.generateMatrix(
      't1',
      [{ id: 'r1', text: 'CR', category: 'legal', critical: true }],
      [],
      { now: NOW },
    );
    const pack = exporter.build(matrix, ['r1'], NOW) as SubmissionPack;
    expect('blocked' in pack).toBe(false);
    expect(pack.manifest.criticalGapsOverridden).toEqual(['r1']);
  });
});
