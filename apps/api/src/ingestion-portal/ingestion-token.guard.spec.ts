import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { IngestionTokenGuard } from './ingestion-token.guard';
import { IngestionApiKeyService } from './ingestion-api-key.service';
import { FakeIngestionApiKeyRepository } from '../repositories/fake/fake-ingestion-api-key.repository';

function mockExec(headers: Record<string, string>): {
  ctx: ExecutionContext;
  req: {
    headers: Record<string, string>;
    ingestion?: { organizationId: string; keyId?: string };
  };
} {
  const req = { headers } as {
    headers: Record<string, string>;
    ingestion?: { organizationId: string; keyId?: string };
  };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('IngestionTokenGuard', () => {
  const prevKey = process.env.INGESTION_API_KEY;
  const prevOrg = process.env.INGESTION_TARGET_ORG_ID;
  let repo: FakeIngestionApiKeyRepository;
  let keys: IngestionApiKeyService;
  let guard: IngestionTokenGuard;

  beforeEach(() => {
    repo = new FakeIngestionApiKeyRepository();
    keys = new IngestionApiKeyService(repo);
    guard = new IngestionTokenGuard(keys);
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.INGESTION_API_KEY;
    else process.env.INGESTION_API_KEY = prevKey;
    if (prevOrg === undefined) delete process.env.INGESTION_TARGET_ORG_ID;
    else process.env.INGESTION_TARGET_ORG_ID = prevOrg;
  });

  it('rejects when authorization header is missing', async () => {
    const { ctx } = mockExec({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when no env fallback + no DB key matches', async () => {
    delete process.env.INGESTION_API_KEY;
    delete process.env.INGESTION_TARGET_ORG_ID;
    const { ctx } = mockExec({ authorization: 'Bearer no-match-anywhere' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts the env-fallback bearer + sets organizationId from env', async () => {
    process.env.INGESTION_API_KEY = 'expected';
    process.env.INGESTION_TARGET_ORG_ID = 'org-env';
    const { ctx, req } = mockExec({ authorization: 'Bearer expected' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.ingestion?.organizationId).toBe('org-env');
    // No DB key was used; keyId should be undefined.
    expect(req.ingestion?.keyId).toBeUndefined();
  });

  it('rejects when env bearer mismatches AND no DB key matches', async () => {
    process.env.INGESTION_API_KEY = 'expected';
    process.env.INGESTION_TARGET_ORG_ID = 'org-env';
    const { ctx } = mockExec({ authorization: 'Bearer not-the-token' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts a DB-minted key + sets organizationId + keyId from the row', async () => {
    const minted = await keys.mint('org-db', 'admin-1', 'etimad-prod');
    const { ctx, req } = mockExec({
      authorization: `Bearer ${minted.rawKey}`,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.ingestion?.organizationId).toBe('org-db');
    expect(req.ingestion?.keyId).toBe(minted.key.id);
  });

  it('rejects a revoked DB key', async () => {
    const minted = await keys.mint('org-db', 'admin-1', 'etimad-prod');
    await keys.revoke(minted.key.id, 'org-db');
    const { ctx } = mockExec({
      authorization: `Bearer ${minted.rawKey}`,
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('prefers DB key over env fallback when both could match', async () => {
    process.env.INGESTION_API_KEY = 'env-fallback';
    process.env.INGESTION_TARGET_ORG_ID = 'org-env';
    const minted = await keys.mint('org-db', 'admin-1', 'etimad-prod');
    const { ctx, req } = mockExec({
      authorization: `Bearer ${minted.rawKey}`,
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.ingestion?.organizationId).toBe('org-db');
    expect(req.ingestion?.keyId).toBe(minted.key.id);
  });

  describe('constantTimeEqual', () => {
    it('matches identical strings', () => {
      expect(IngestionTokenGuard.constantTimeEqual('abc', 'abc')).toBe(true);
    });
    it('rejects different lengths without throwing', () => {
      expect(IngestionTokenGuard.constantTimeEqual('abc', 'abcd')).toBe(false);
    });
    it('rejects mismatched same-length strings', () => {
      expect(IngestionTokenGuard.constantTimeEqual('abc', 'xyz')).toBe(false);
    });
  });
});
