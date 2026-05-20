import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SchedulerOidcGuard } from './scheduler-oidc.guard';

function ctxFor(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('SchedulerOidcGuard', () => {
  const AUDIENCE = 'https://api.example.test/retention-actions/sweep-scheduled';
  const EMAIL = 'bidready-scheduler@bidready-ksa.iam.gserviceaccount.com';

  let originalAudience: string | undefined;
  let originalEmail: string | undefined;

  beforeEach(() => {
    originalAudience = process.env.SCHEDULER_OIDC_AUDIENCE;
    originalEmail = process.env.SCHEDULER_SA_EMAIL;
  });
  afterEach(() => {
    process.env.SCHEDULER_OIDC_AUDIENCE = originalAudience;
    process.env.SCHEDULER_SA_EMAIL = originalEmail;
    jest.restoreAllMocks();
  });

  it('fails closed when SCHEDULER_OIDC_AUDIENCE is missing', async () => {
    delete process.env.SCHEDULER_OIDC_AUDIENCE;
    process.env.SCHEDULER_SA_EMAIL = EMAIL;
    const g = new SchedulerOidcGuard();
    await expect(
      g.canActivate(ctxFor({ authorization: 'Bearer x' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('fails closed when SCHEDULER_SA_EMAIL is missing', async () => {
    process.env.SCHEDULER_OIDC_AUDIENCE = AUDIENCE;
    delete process.env.SCHEDULER_SA_EMAIL;
    const g = new SchedulerOidcGuard();
    await expect(
      g.canActivate(ctxFor({ authorization: 'Bearer x' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when no Authorization header is present', async () => {
    process.env.SCHEDULER_OIDC_AUDIENCE = AUDIENCE;
    process.env.SCHEDULER_SA_EMAIL = EMAIL;
    const g = new SchedulerOidcGuard();
    await expect(g.canActivate(ctxFor({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when the OAuth2 verifier throws', async () => {
    process.env.SCHEDULER_OIDC_AUDIENCE = AUDIENCE;
    process.env.SCHEDULER_SA_EMAIL = EMAIL;
    const g = new SchedulerOidcGuard();
    jest
      .spyOn(
        (g as unknown as { client: { verifyIdToken: jest.Mock } }).client,
        'verifyIdToken',
      )
      .mockRejectedValue(new Error('bad sig'));
    await expect(
      g.canActivate(ctxFor({ authorization: 'Bearer x' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects on wrong issuer', async () => {
    process.env.SCHEDULER_OIDC_AUDIENCE = AUDIENCE;
    process.env.SCHEDULER_SA_EMAIL = EMAIL;
    const g = new SchedulerOidcGuard();
    jest
      .spyOn(
        (g as unknown as { client: { verifyIdToken: jest.Mock } }).client,
        'verifyIdToken',
      )
      .mockResolvedValue({
        getPayload: () => ({
          iss: 'https://accounts.evil.test',
          aud: AUDIENCE,
          email: EMAIL,
          email_verified: true,
        }),
      } as never);
    await expect(
      g.canActivate(ctxFor({ authorization: 'Bearer x' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the email claim does not match SCHEDULER_SA_EMAIL', async () => {
    process.env.SCHEDULER_OIDC_AUDIENCE = AUDIENCE;
    process.env.SCHEDULER_SA_EMAIL = EMAIL;
    const g = new SchedulerOidcGuard();
    jest
      .spyOn(
        (g as unknown as { client: { verifyIdToken: jest.Mock } }).client,
        'verifyIdToken',
      )
      .mockResolvedValue({
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          aud: AUDIENCE,
          email: 'someone-else@example.test',
          email_verified: true,
        }),
      } as never);
    await expect(
      g.canActivate(ctxFor({ authorization: 'Bearer x' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a verified token with the right issuer + email', async () => {
    process.env.SCHEDULER_OIDC_AUDIENCE = AUDIENCE;
    process.env.SCHEDULER_SA_EMAIL = EMAIL;
    const g = new SchedulerOidcGuard();
    jest
      .spyOn(
        (g as unknown as { client: { verifyIdToken: jest.Mock } }).client,
        'verifyIdToken',
      )
      .mockResolvedValue({
        getPayload: () => ({
          iss: 'https://accounts.google.com',
          aud: AUDIENCE,
          email: EMAIL,
          email_verified: true,
        }),
      } as never);
    await expect(
      g.canActivate(ctxFor({ authorization: 'Bearer xyz' })),
    ).resolves.toBe(true);
  });
});
