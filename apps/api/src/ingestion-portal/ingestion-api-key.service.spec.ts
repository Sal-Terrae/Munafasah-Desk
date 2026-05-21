import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IngestionApiKeyService } from './ingestion-api-key.service';
import { FakeIngestionApiKeyRepository } from '../repositories/fake/fake-ingestion-api-key.repository';

describe('IngestionApiKeyService', () => {
  let repo: FakeIngestionApiKeyRepository;
  let svc: IngestionApiKeyService;

  beforeEach(() => {
    repo = new FakeIngestionApiKeyRepository();
    svc = new IngestionApiKeyService(repo);
  });

  it('mint generates a 64-char hex raw key + persists bcrypt hash', async () => {
    const r = await svc.mint('org-1', 'admin-1', 'etimad-prod');
    expect(r.rawKey).toMatch(/^[a-f0-9]{64}$/);
    expect(r.key.keyPrefix).toBe(r.rawKey.slice(0, 8));
    expect(r.key.keyHash).not.toContain(r.rawKey);
    expect(r.key.keyHash.startsWith('$2')).toBe(true);
    expect(r.key.organizationId).toBe('org-1');
    expect(r.key.createdBy).toBe('admin-1');
  });

  it('mint rejects blank name', async () => {
    await expect(
      svc.mint('org-1', 'admin-1', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verify(raw) matches a freshly minted key', async () => {
    const r = await svc.mint('org-1', 'admin-1', 'etimad-prod');
    const found = await svc.verify(r.rawKey);
    expect(found?.id).toBe(r.key.id);
    expect(found?.organizationId).toBe('org-1');
  });

  it('verify returns null for unknown raw', async () => {
    await svc.mint('org-1', 'admin-1', 'etimad-prod');
    expect(await svc.verify('deadbeef-no-match')).toBeNull();
  });

  it('verify returns null for short input (would underflow prefix)', async () => {
    expect(await svc.verify('abc')).toBeNull();
  });

  it('verify rejects revoked keys', async () => {
    const r = await svc.mint('org-1', 'admin-1', 'etimad-prod');
    await svc.revoke(r.key.id, 'org-1');
    expect(await svc.verify(r.rawKey)).toBeNull();
  });

  it('verify rejects a raw with the right prefix but wrong remainder', async () => {
    const r = await svc.mint('org-1', 'admin-1', 'etimad-prod');
    const tampered = r.rawKey.slice(0, 8) + 'f'.repeat(56);
    expect(await svc.verify(tampered)).toBeNull();
  });

  it('revoke denies cross-tenant + 404s a missing id', async () => {
    const r = await svc.mint('org-1', 'admin-1', 'etimad-prod');
    await expect(svc.revoke(r.key.id, 'org-other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.revoke('not-a-real-id', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('list returns rows tenant-scoped', async () => {
    await svc.mint('org-1', 'admin-1', 'a');
    await svc.mint('org-1', 'admin-1', 'b');
    await svc.mint('org-2', 'admin-2', 'c');
    const r1 = await svc.list('org-1');
    expect(r1).toHaveLength(2);
    expect(r1.every((k) => k.organizationId === 'org-1')).toBe(true);
  });
});
