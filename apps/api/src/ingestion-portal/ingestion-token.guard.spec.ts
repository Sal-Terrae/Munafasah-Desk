import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { IngestionTokenGuard } from './ingestion-token.guard';

function mockExec(headers: Record<string, string>): {
  ctx: ExecutionContext;
  req: { headers: Record<string, string>; ingestion?: { organizationId: string } };
} {
  const req = { headers } as {
    headers: Record<string, string>;
    ingestion?: { organizationId: string };
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

  afterEach(() => {
    if (prevKey === undefined) delete process.env.INGESTION_API_KEY;
    else process.env.INGESTION_API_KEY = prevKey;
    if (prevOrg === undefined) delete process.env.INGESTION_TARGET_ORG_ID;
    else process.env.INGESTION_TARGET_ORG_ID = prevOrg;
  });

  it('rejects when neither env is set', () => {
    delete process.env.INGESTION_API_KEY;
    delete process.env.INGESTION_TARGET_ORG_ID;
    const g = new IngestionTokenGuard();
    const { ctx } = mockExec({ authorization: 'Bearer x' });
    expect(() => g.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects when bearer token does not match', () => {
    process.env.INGESTION_API_KEY = 'expected';
    process.env.INGESTION_TARGET_ORG_ID = 'org-1';
    const g = new IngestionTokenGuard();
    const { ctx } = mockExec({ authorization: 'Bearer not-the-token' });
    expect(() => g.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects when authorization header is missing', () => {
    process.env.INGESTION_API_KEY = 'expected';
    process.env.INGESTION_TARGET_ORG_ID = 'org-1';
    const g = new IngestionTokenGuard();
    const { ctx } = mockExec({});
    expect(() => g.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('attaches ingestion.organizationId on success', () => {
    process.env.INGESTION_API_KEY = 'expected';
    process.env.INGESTION_TARGET_ORG_ID = 'org-target';
    const g = new IngestionTokenGuard();
    const { ctx, req } = mockExec({ authorization: 'Bearer expected' });
    expect(g.canActivate(ctx)).toBe(true);
    expect(req.ingestion?.organizationId).toBe('org-target');
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
