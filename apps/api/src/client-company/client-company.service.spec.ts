import { ClientCompanyService } from './client-company.service';
import { FakeClientCompanyRepository } from '../repositories/fake/fake-client-company.repository';

describe('ClientCompanyService (tenant-scoped CRUD)', () => {
  let repo: FakeClientCompanyRepository;
  let svc: ClientCompanyService;

  beforeEach(() => {
    repo = new FakeClientCompanyRepository();
    svc = new ClientCompanyService(repo);
  });

  it('creates and lists only within the caller organization', async () => {
    await svc.create('Acme', 'org-1');
    await svc.create('Other', 'org-2');
    const org1 = await svc.list('org-1');
    expect(org1).toHaveLength(1);
    expect(org1[0].name).toBe('Acme');
  });

  it('get + update work within the organization', async () => {
    const c = await svc.create('Acme', 'org-1');
    await svc.update(c.id, 'org-1', 'Acme Renamed');
    expect((await svc.get(c.id, 'org-1')).name).toBe('Acme Renamed');
  });

  it('denies cross-tenant get', async () => {
    const c = await svc.create('Acme', 'org-1');
    await expect(svc.get(c.id, 'org-2')).rejects.toThrow();
  });

  it('denies cross-tenant delete and keeps the row', async () => {
    const c = await svc.create('Acme', 'org-1');
    expect(await svc.remove(c.id, 'org-2')).toBe(false);
    expect((await svc.get(c.id, 'org-1')).id).toBe(c.id);
  });
});
