import {
  CallHandler,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';
import { AUDITED_KEY, AuditMetadata } from './audit.decorator';

function makeCtx({
  meta,
  user,
  params = {},
  body = {},
  url = '/x',
  method = 'POST',
}: {
  meta: AuditMetadata | undefined;
  user?: { userId: string; organizationId: string };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  url?: string;
  method?: string;
}): { ctx: ExecutionContext; reflector: Reflector } {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'get')
    .mockImplementation((key) => (key === AUDITED_KEY ? meta : undefined));
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user, params, body, url, originalUrl: url, method }),
    }),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
  return { ctx, reflector };
}

describe('AuditInterceptor', () => {
  let repo: FakeAuditEventRepository;
  let audit: AuditService;

  beforeEach(() => {
    repo = new FakeAuditEventRepository();
    audit = new AuditService(repo);
  });

  it('is a no-op for handlers without @Audited metadata', async () => {
    const { ctx, reflector } = makeCtx({ meta: undefined });
    const interceptor = new AuditInterceptor(reflector, audit);
    const next: CallHandler = { handle: () => of({ id: 't-1' }) };
    await firstValueFrom(interceptor.intercept(ctx, next));
    expect(await repo.findForUser('u-1', 'org-1')).toHaveLength(0);
  });

  it('writes one audit event after a successful handler, reading entity id from a param', async () => {
    const meta: AuditMetadata = {
      action: 'tender.update_status',
      entityType: 'Tender',
      entityIdFrom: 'param',
      entityIdKey: 'id',
      detailsFrom: ['status'],
    };
    const { ctx, reflector } = makeCtx({
      meta,
      user: { userId: 'u-1', organizationId: 'org-1' },
      params: { id: 't-1' },
      body: { status: 'review', secret: 'should-redact' },
    });
    const interceptor = new AuditInterceptor(reflector, audit);
    const next: CallHandler = { handle: () => of({ ok: true }) };
    await firstValueFrom(interceptor.intercept(ctx, next));
    // tap is synchronous from a Promise pov but record() is async — yield a tick.
    await new Promise<void>((r) => setImmediate(r));
    const events = await repo.findForUser('u-1', 'org-1');
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe('tender.update_status');
    expect(events[0].entityType).toBe('Tender');
    expect(events[0].entityId).toBe('t-1');
    expect((events[0].details as Record<string, unknown>).status).toBe(
      'review',
    );
    // body keys NOT listed in detailsFrom must NOT leak
    expect(
      (events[0].details as Record<string, unknown>).secret,
    ).toBeUndefined();
  });

  it('reads entity id from response by default', async () => {
    const meta: AuditMetadata = {
      action: 'tender.create',
      entityType: 'Tender',
    };
    const { ctx, reflector } = makeCtx({
      meta,
      user: { userId: 'u-1', organizationId: 'org-1' },
    });
    const interceptor = new AuditInterceptor(reflector, audit);
    const next: CallHandler = { handle: () => of({ id: 't-new' }) };
    await firstValueFrom(interceptor.intercept(ctx, next));
    await new Promise<void>((r) => setImmediate(r));
    const events = await repo.findForUser('u-1', 'org-1');
    expect(events[0].entityId).toBe('t-new');
  });

  it('does NOT write an audit event when the handler errors', async () => {
    const meta: AuditMetadata = {
      action: 'tender.delete',
      entityType: 'Tender',
      entityIdFrom: 'param',
      entityIdKey: 'id',
    };
    const { ctx, reflector } = makeCtx({
      meta,
      user: { userId: 'u-1', organizationId: 'org-1' },
      params: { id: 't-1' },
    });
    const interceptor = new AuditInterceptor(reflector, audit);
    const next: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };
    await expect(
      firstValueFrom(interceptor.intercept(ctx, next)),
    ).rejects.toThrow('boom');
    expect(await repo.findForUser('u-1', 'org-1')).toHaveLength(0);
  });

  it('skips silently when there is no authenticated principal', async () => {
    const meta: AuditMetadata = {
      action: 'x.y',
      entityType: 'X',
    };
    const { ctx, reflector } = makeCtx({ meta, user: undefined });
    const interceptor = new AuditInterceptor(reflector, audit);
    const next: CallHandler = { handle: () => of({ id: 'x-1' }) };
    await firstValueFrom(interceptor.intercept(ctx, next));
    expect(await repo.findForUser('any', 'any')).toHaveLength(0);
  });

  it('swallows audit-write failures without breaking the request', async () => {
    const failingRepo = {
      create: jest.fn().mockRejectedValue(new Error('db down')),
      findForUser: jest.fn().mockResolvedValue([]),
      anonymiseUser: jest.fn().mockResolvedValue(0),
    };
    const failingAudit = new AuditService(failingRepo as never);
    const meta: AuditMetadata = {
      action: 'x.y',
      entityType: 'X',
      entityIdFrom: 'param',
      entityIdKey: 'id',
    };
    const { ctx, reflector } = makeCtx({
      meta,
      user: { userId: 'u-1', organizationId: 'org-1' },
      params: { id: 'x-1' },
    });
    const interceptor = new AuditInterceptor(reflector, failingAudit);
    const next: CallHandler = { handle: () => of({ ok: true }) };
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    await firstValueFrom(interceptor.intercept(ctx, next));
    await new Promise<void>((r) => setImmediate(r));
    // No throw, the handler's value still came through; logger may or
    // may not be called (we log via structured logger, not Nest Logger).
    expect(failingRepo.create).toHaveBeenCalled();
    spy.mockRestore();
  });
});
