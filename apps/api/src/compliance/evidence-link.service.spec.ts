import { NotFoundException } from '@nestjs/common';
import { EvidenceLinkService } from './evidence-link.service';
import { FakeEvidenceLinkRepository } from '../repositories/fake/fake-evidence-link.repository';
import { FakeComplianceItemRepository } from '../repositories/fake/fake-compliance-item.repository';
import { FakeClientDocumentRepository } from '../repositories/fake/fake-client-document.repository';

describe('EvidenceLinkService', () => {
  const ORG = 'org-1';
  let svc: EvidenceLinkService;
  let links: FakeEvidenceLinkRepository;
  let items: FakeComplianceItemRepository;
  let docs: FakeClientDocumentRepository;

  beforeEach(async () => {
    links = new FakeEvidenceLinkRepository();
    items = new FakeComplianceItemRepository();
    docs = new FakeClientDocumentRepository();
    svc = new EvidenceLinkService(links, items, docs);
  });

  async function seedItemAndDoc(org = ORG) {
    const item = await items.create({
      matrixId: 'm-1',
      organizationId: org,
      requirementId: 'r1',
      requirementText: 'Valid CR',
      category: 'legal',
      owner: 'DocController',
      risk: 'low',
      status: 'missing',
    });
    const doc = await docs.create({
      filename: 'cr.pdf',
      clientCompanyId: 'cc-1',
      organizationId: org,
      documentType: 'legal',
    });
    return { item, doc };
  }

  it('links a document to an item and lists it', async () => {
    const { item, doc } = await seedItemAndDoc();
    const link = await svc.link(item.id, doc.id, ORG, 'CR scan');
    expect(link.complianceItemId).toBe(item.id);
    expect(link.documentId).toBe(doc.id);
    expect(link.note).toBe('CR scan');
    const list = await svc.listForItem(item.id, ORG);
    expect(list).toHaveLength(1);
  });

  it('refuses to link across tenants (item lookup misses)', async () => {
    const { item, doc } = await seedItemAndDoc();
    await expect(
      svc.link(item.id, doc.id, 'org-other'),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses to link a doc from a different org to an item', async () => {
    const item = (await seedItemAndDoc()).item;
    const otherOrgDoc = await docs.create({
      filename: 'leak.pdf',
      clientCompanyId: 'cc-other',
      organizationId: 'org-other',
      documentType: 'legal',
    });
    await expect(svc.link(item.id, otherOrgDoc.id, ORG)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('unlink is idempotent — removed=false when the pair was not linked', async () => {
    const { item, doc } = await seedItemAndDoc();
    expect(await svc.unlink(item.id, doc.id, ORG)).toEqual({ removed: false });
    await svc.link(item.id, doc.id, ORG);
    expect(await svc.unlink(item.id, doc.id, ORG)).toEqual({ removed: true });
    expect(await svc.unlink(item.id, doc.id, ORG)).toEqual({ removed: false });
  });

  it('refuses double-link (the @@unique constraint)', async () => {
    const { item, doc } = await seedItemAndDoc();
    await svc.link(item.id, doc.id, ORG);
    await expect(svc.link(item.id, doc.id, ORG)).rejects.toThrow(
      /already exists/i,
    );
  });
});
