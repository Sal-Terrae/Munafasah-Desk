import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

interface RequestWithIngestionAuth extends Request {
  ingestion?: { organizationId: string };
}

/**
 * Bearer auth for the server-to-server ingestion endpoint. The
 * expected token is read from INGESTION_API_KEY (env). The target
 * organization is read from INGESTION_TARGET_ORG_ID (env) — this is
 * the MVP single-tenant routing; per-org keys can land later when a
 * second customer exists.
 *
 * Both env vars must be set in production. In tests they're set per-
 * spec.
 */
@Injectable()
export class IngestionTokenGuard implements CanActivate {
  private readonly log = new Logger(IngestionTokenGuard.name);

  canActivate(ctx: ExecutionContext): boolean {
    const expected = process.env.INGESTION_API_KEY ?? '';
    const orgId = process.env.INGESTION_TARGET_ORG_ID ?? '';
    if (!expected || !orgId) {
      this.log.warn(
        'INGESTION_API_KEY or INGESTION_TARGET_ORG_ID not set — endpoint is locked down',
      );
      throw new UnauthorizedException(
        'ingestion endpoint not configured',
      );
    }
    const req = ctx.switchToHttp().getRequest<RequestWithIngestionAuth>();
    const got = (req.headers.authorization ?? '').replace(
      /^Bearer\s+/i,
      '',
    );
    if (!IngestionTokenGuard.constantTimeEqual(got, expected)) {
      throw new UnauthorizedException('invalid ingestion api key');
    }
    req.ingestion = { organizationId: orgId };
    return true;
  }

  /** Constant-time string compare for arbitrary-length tokens. */
  static constantTimeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
      // Run one timingSafeEqual against equal-length copies anyway so
      // the comparison time stays close to the equal-length path. The
      // result is irrelevant — we already know they don't match.
      const pad = Buffer.alloc(Math.max(aBuf.length, bBuf.length));
      try {
        timingSafeEqual(pad, pad);
      } catch {
        /* unreachable: same buffer compares cleanly */
      }
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  }
}
