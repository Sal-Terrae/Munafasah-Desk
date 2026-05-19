import { TenderService } from './tender.service';
import { FakeTenderRepository } from '../repositories/fake/fake-tender.repository';

describe('TenderService (intake, tenant-scoped)', () => {
  let repo: FakeTenderRepository;
  let svc: TenderService;

  beforeEach(() => {
    repo = new FakeTenderRepository();
    svc = new TenderService(repo);
  });

  it('intake creates a tender with source + status=intake', async () => {
    const t = await svc.intake('RFP-1', 'cc-1', 'org-1', 'email');
    expect(t.title).toBe('RFP-1');
    expect(t.source).toBe('email');
    expect(t.status).toBe('intake');
    expect(t.organizationId).toBe('org-1');
  });

  it('lists only within the organization', async () => {
    await svc.intake('A', 'cc-1', 'org-1');
    await svc.intake('B', 'cc-2', 'org-2');
    const org1 = await svc.list('org-1');
    expect(org1).toHaveLength(1);
    expect(org1[0].title).toBe('A');
  });

  it('updates status within the organization', async () => {
    const t = await svc.intake('A', 'cc-1', 'org-1');
    await svc.updateStatus(t.id, 'org-1', 'review');
    expect((await svc.get(t.id, 'org-1')).status).toBe('review');
  });

  it('denies cross-tenant get', async () => {
    const t = await svc.intake('A', 'cc-1', 'org-1');
    await expect(svc.get(t.id, 'org-2')).rejects.toThrow();
  });
});
