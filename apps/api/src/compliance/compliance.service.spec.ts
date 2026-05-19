import {
  ComplianceRequirement,
  ComplianceService,
  EvidenceDoc,
} from './compliance.service';

const NOW = new Date('2026-05-19T00:00:00Z');

const reqs: ComplianceRequirement[] = [
  { id: 'r1', text: 'Valid CR', category: 'legal', critical: true },
  { id: 'r2', text: 'Bid bond', category: 'financial', critical: true },
  { id: 'r3', text: 'OEM letter', category: 'technical', critical: false },
];

function vault(): EvidenceDoc[] {
  return [
    { id: 'd1', documentType: 'legal', state: 'active', expiresAt: null },
    {
      id: 'd2',
      documentType: 'financial',
      state: 'active',
      expiresAt: new Date('2025-01-01T00:00:00Z'), // expired
    },
  ];
}

describe('ComplianceService', () => {
  const svc = new ComplianceService();

  it('builds a versioned matrix with full provenance per row', () => {
    const m = svc.generateMatrix('t1', reqs, vault(), {
      now: NOW,
      dueDate: '2026-06-01',
      previousVersion: 2,
    });
    expect(m.version).toBe(3);
    const byId = Object.fromEntries(
      m.items.map((i) => [i.requirementId, i]),
    );
    // active legal doc -> satisfied/low
    expect(byId.r1.status).toBe('satisfied');
    expect(byId.r1.evidenceDocId).toBe('d1');
    expect(byId.r1.risk).toBe('low');
    expect(byId.r1.owner).toBe('DocController');
    expect(byId.r1.dueDate).toBe('2026-06-01');
    // expired financial doc -> partial/medium (expiry-aware downgrade)
    expect(byId.r2.status).toBe('partial');
    expect(byId.r2.risk).toBe('medium');
    // no technical doc, non-critical -> missing/high
    expect(byId.r3.status).toBe('missing');
    expect(byId.r3.risk).toBe('high');
  });

  it('critical missing -> critical risk and blocks export unless overridden', () => {
    const m = svc.generateMatrix(
      't1',
      [{ id: 'rc', text: 'X', category: 'legal', critical: true }],
      [],
      { now: NOW },
    );
    expect(m.items[0].risk).toBe('critical');
    expect(svc.exportGate(m).allowed).toBe(false);
    expect(svc.exportGate(m).blocking).toHaveLength(1);
    expect(svc.exportGate(m, ['rc']).allowed).toBe(true);
  });

  it('derives remediation tasks only for non-satisfied items', () => {
    const m = svc.generateMatrix('t1', reqs, vault(), { now: NOW });
    const tasks = svc.deriveTasks(m);
    expect(tasks.map((t) => t.requirementId).sort()).toEqual(['r2', 'r3']);
    expect(tasks.every((t) => t.title.startsWith('Provide evidence:'))).toBe(
      true,
    );
  });
});
