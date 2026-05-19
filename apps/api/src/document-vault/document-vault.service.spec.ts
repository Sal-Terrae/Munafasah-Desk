import { DocumentVaultService } from './document-vault.service';
import { FakeClientDocumentRepository } from '../repositories/fake/fake-client-document.repository';

describe('DocumentVaultService', () => {
  let repo: FakeClientDocumentRepository;
  let svc: DocumentVaultService;

  beforeEach(() => {
    repo = new FakeClientDocumentRepository();
    svc = new DocumentVaultService(repo);
  });

  it('registers a document with metadata, state=active', async () => {
    const d = await svc.register(
      {
        filename: 'cr.pdf',
        tenderId: 't-1',
        documentType: 'legal',
        sensitivity: 'high',
      },
      'org-1',
    );
    expect(d.filename).toBe('cr.pdf');
    expect(d.documentType).toBe('legal');
    expect(d.sensitivity).toBe('high');
    expect(d.state).toBe('active');
  });

  it('denies cross-tenant get', async () => {
    const d = await svc.register(
      { filename: 'a.pdf', tenderId: 't-1' },
      'org-1',
    );
    await expect(svc.get(d.id, 'org-2')).rejects.toThrow();
  });

  it('transitions state within the organization', async () => {
    const d = await svc.register(
      { filename: 'a.pdf', tenderId: 't-1' },
      'org-1',
    );
    await svc.setState(d.id, 'org-1', 'archived');
    expect((await svc.get(d.id, 'org-1')).state).toBe('archived');
  });

  it('listExpiring returns non-archived docs expiring on/before the cutoff', async () => {
    const past = new Date('2025-01-01');
    const future = new Date('2999-01-01');
    await svc.register(
      { filename: 'soon.pdf', tenderId: 't-1', expiresAt: past },
      'org-1',
    );
    await svc.register(
      { filename: 'later.pdf', tenderId: 't-1', expiresAt: future },
      'org-1',
    );
    const archived = await svc.register(
      { filename: 'old.pdf', tenderId: 't-1', expiresAt: past },
      'org-1',
    );
    await svc.setState(archived.id, 'org-1', 'archived');

    const expiring = await svc.listExpiring('org-1', new Date('2026-01-01'));
    expect(expiring.map((d) => d.filename)).toEqual(['soon.pdf']);
  });
});
