import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditService } from './audit.service';
import { AUDITED_KEY, AuditMetadata } from './audit.decorator';
import { logEvent } from '../observability/logger';

interface Principal {
  userId: string;
  organizationId: string;
  role?: string;
}

const SECRET_KEYS = /password|token|api[_-]?key|secret|authorization/i;

function redactDetails(
  body: Record<string, unknown> | undefined,
  keys: string[] | undefined,
): Record<string, unknown> {
  if (!body || !keys?.length) return {};
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (body[k] === undefined) continue;
    out[k] = SECRET_KEYS.test(k) ? '[redacted]' : body[k];
  }
  return out;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata | undefined>(
      AUDITED_KEY,
      ctx.getHandler(),
    );
    if (!meta) {
      return next.handle();
    }

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: Principal }>();

    return next.handle().pipe(
      tap((response: unknown) => {
        const principal = req.user;
        if (!principal?.organizationId) {
          return;
        }
        const entityId = this.extractEntityId(meta, req, principal, response);
        const details: Record<string, unknown> = {
          method: req.method,
          path: req.originalUrl ?? req.url,
          ...redactDetails(
            req.body as Record<string, unknown> | undefined,
            meta.detailsFrom,
          ),
        };
        void this.audit
          .record({
            action: meta.action,
            entityType: meta.entityType,
            entityId,
            userId: principal.userId,
            organizationId: principal.organizationId,
            details: details as unknown as Prisma.JsonValue,
          })
          .catch((err) => {
            // Never break a request because audit writing failed.
            logEvent('error', 'audit_write_failed', {
              action: meta.action,
              entityType: meta.entityType,
              entityId,
              error: err instanceof Error ? err.message : String(err),
            });
          });
      }),
    );
  }

  private extractEntityId(
    meta: AuditMetadata,
    req: Request,
    principal: Principal,
    response: unknown,
  ): string {
    const source = meta.entityIdFrom ?? 'response';
    const key = meta.entityIdKey ?? 'id';
    if (source === 'principal') {
      return principal.userId;
    }
    if (source === 'param') {
      const params = req.params as Record<string, unknown>;
      return typeof params[key] === 'string'
        ? (params[key] as string)
        : 'unknown';
    }
    if (source === 'body') {
      const body = req.body as Record<string, unknown> | undefined;
      return typeof body?.[key] === 'string' ? (body[key] as string) : 'unknown';
    }
    if (response && typeof response === 'object') {
      const value = (response as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : 'unknown';
    }
    return 'unknown';
  }
}
