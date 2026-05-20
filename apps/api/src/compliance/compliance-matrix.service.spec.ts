import { NotFoundException } from '@nestjs/common';
import { ComplianceMatrixService } from './compliance-matrix.service';
import { ComplianceService } from './compliance.service';
import { TenderService } from '../tender/tender.service';
import { FakeComplianceMatrixRepository } from '../repositories/fake/fake-compliance-matrix.repository';
import { FakeComplianceItemRepository } from '../repositories/fake/fake-compliance-item.repository';
import { FakeTenderRequirementRepository } from '../repositories/fake/fake-tender-requirement.repository';
import { FakeTenderRepository } from '../repositories/fake/fake-tender.repository';

describe('ComplianceMatrixService (persisting wrapper)', () => {
  const ORG = 'org-1';
  let svc: ComplianceMatrixService;
  let matrices: FakeComplianceMatrixRepository;
  let items: FakeComplianceItemRepository;
  let tenderReqs: FakeTenderRequirementRepository;
  let tenderRepo: FakeTenderRepository;
  let tenderId: string;

  beforeEach(async () => {
    matrices = new FakeComplianceMatrixRepository();
    items = new FakeComplianceItemRepository();
    tenderReqs = new FakeTenderRequirementRepository();
    tenderRepo = new FakeTenderRepository();
    const tenders = new TenderService(tenderRepo);
    svc = new ComplianceMatrixService(
      new ComplianceService(),
      tenders,
      matrices,
      items,
      tenderReqs,
    );
    const t = await tenderRepo.create({
      title: 'T',
      organizationId: ORG,
      clientCompanyId: 'cc-1',
    });
    tenderId = t.id;
  });

  it('first generate creates matrix v1 and persists every item', async () => {
    const { matrix, items: created } = await svc.generateAndPersist(
      tenderId,
      ORG,
      [
        { id: 'r1', text: 'Valid CR', category: 'legal', critical: true },
        { id: 'r2', text: 'Bid bond', category: 'financial', critical: true },
      ],
      [],
    );
    expect(matrix.version).toBe(1);
    expect(matrix.tenderId).toBe(tenderId);
    expect(matrix.organizationId).toBe(ORG);
    expect(matrix.status).toBe('draft');
    expect(created).toHaveLength(2);
    const fetched = await matrices.findAllForTender(tenderId, ORG);
    expect(fetched.map((m) => m.version)).toEqual([1]);
  });

  it('subsequent generate increments version monotonically per tender', async () => {
    const reqs = [
      { id: 'r1', text: 'X', category: 'legal', critical: true },
    ];
    const a = await svc.generateAndPersist(tenderId, ORG, reqs, []);
    const b = await svc.generateAndPersist(tenderId, ORG, reqs, []);
    const c = await svc.generateAndPersist(tenderId, ORG, reqs, []);
    expect([a.matrix.version, b.matrix.version, c.matrix.version]).toEqual([
      1, 2, 3,
    ]);
    const all = await matrices.findAllForTender(tenderId, ORG);
    expect(all.map((m) => m.version)).toEqual([3, 2, 1]);
  });

  it('refuses cross-tenant generate (tenant guard via TenderService)', async () => {
    await expect(
      svc.generateAndPersist(tenderId, 'org-other', [], []),
    ).rejects.toThrow();
  });

  it('getByVersion returns matrix + its items, scoped to org', async () => {
    await svc.generateAndPersist(
      tenderId,
      ORG,
      [{ id: 'r1', text: 'Valid CR', category: 'legal', critical: true }],
      [],
    );
    const got = await svc.getByVersion(tenderId, 1, ORG);
    expect(got.matrix.version).toBe(1);
    expect(got.items).toHaveLength(1);
    expect(got.items[0].requirementText).toBe('Valid CR');

    await expect(svc.getByVersion(tenderId, 99, ORG)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateItem mutates status/owner and is tenant-scoped', async () => {
    const result = await svc.generateAndPersist(
      tenderId,
      ORG,
      [{ id: 'r1', text: 'X', category: 'legal', critical: true }],
      [],
    );
    const item = result.items[0];
    const updated = await svc.updateItem(item.id, ORG, {
      owner: 'Owner',
      status: 'overridden',
    });
    expect(updated.owner).toBe('Owner');
    expect(updated.status).toBe('overridden');

    await expect(
      svc.updateItem(item.id, 'org-other', { status: 'satisfied' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('listForTender returns versions newest-first', async () => {
    await svc.generateAndPersist(
      tenderId,
      ORG,
      [{ id: 'r1', text: 'r', category: 'legal', critical: false }],
      [],
    );
    await svc.generateAndPersist(
      tenderId,
      ORG,
      [{ id: 'r1', text: 'r', category: 'legal', critical: false }],
      [],
    );
    const list = await svc.listForTender(tenderId, ORG);
    expect(list.map((m) => m.version)).toEqual([2, 1]);
  });

  it('auto-loads persisted TenderRequirement rows when input is empty', async () => {
    await tenderReqs.create({
      tenderId,
      organizationId: ORG,
      category: 'legal',
      text: 'Valid CR',
      risk: 'critical',
    });
    await tenderReqs.create({
      tenderId,
      organizationId: ORG,
      category: 'financial',
      text: 'Bid bond',
      risk: 'critical',
    });
    const { matrix, items: created } = await svc.generateAndPersist(
      tenderId,
      ORG,
      [], // empty → fall back to persisted rows
      [],
    );
    expect(matrix.version).toBe(1);
    expect(created).toHaveLength(2);
    const texts = created.map((i) => i.requirementText).sort();
    expect(texts).toEqual(['Bid bond', 'Valid CR']);
  });

  it('explicit requirements still win over persisted rows', async () => {
    await tenderReqs.create({
      tenderId,
      organizationId: ORG,
      category: 'legal',
      text: 'Persistent one',
    });
    const { items: created } = await svc.generateAndPersist(
      tenderId,
      ORG,
      [
        {
          id: 'r-adhoc',
          text: 'Ad-hoc requirement',
          category: 'technical',
          critical: false,
        },
      ],
      [],
    );
    expect(created).toHaveLength(1);
    expect(created[0].requirementText).toBe('Ad-hoc requirement');
  });
});
