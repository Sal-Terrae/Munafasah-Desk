import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { IngestionApiKeyService } from './ingestion-api-key.service';

interface RequestWithIngestionAuth extends Request {
  ingestion?: { organizationId: string; keyId?: string };
}

/**
 * Bearer auth for the server-to-server ingestion endpoint.
 *
 * Resolution order:
 *   1. DB-backed IngestionApiKey (prefix lookup + bcrypt verify).
 *      The matching key's organizationId becomes the tenant.
 *   2. Env fallback: INGESTION_API_KEY + INGESTION_TARGET_ORG_ID.
 *      Preserved as a transition window — operators rotate to
 *      DB-minted keys, then clear the env. Compare is constant-time.
 *
 * Both fail closed when nothing matches.
 */
@Injectable()
export class IngestionTokenGuard implements CanActivate {
  private readonly log = new Logger(IngestionTokenGuard.name);

  constructor(private readonly keys: IngestionApiKeyService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithIngestionAuth>();
    const raw = (req.headers.authorization ?? '').replace(
      /^Bearer\s+/i,
      '',
    );
    if (!raw) {
      throw new UnauthorizedException('missing bearer token');
    }

    // 1. DB-backed key.
    const dbKey = await this.keys.verify(raw);
    if (dbKey) {
      req.ingestion = {
        organizationId: dbKey.organizationId,
        keyId: dbKey.id,
      };
      return true;
    }

    // 2. Env fallback (transition window). Both env vars must be set.
    const expected = process.env.INGESTION_API_KEY ?? '';
    const orgId = process.env.INGESTION_TARGET_ORG_ID ?? '';
    if (
      expected &&
      orgId &&
      IngestionTokenGuard.constantTimeEqual(raw, expected)
    ) {
      req.ingestion = { organizationId: orgId };
      return true;
    }

    throw new UnauthorizedException('invalid ingestion api key');
  }

  /** Constant-time string compare for arbitrary-length tokens. */
  static constantTimeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
      // Equal-length compare against padding so the reject path stays
      // close to the accept path in timing.
      const pad = Buffer.alloc(Math.max(aBuf.length, bBuf.length));
      try {
        timingSafeEqual(pad, pad);
      } catch {
        /* unreachable */
      }
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  }
}
