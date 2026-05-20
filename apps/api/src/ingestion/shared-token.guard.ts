import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

export const SHARED_TOKEN_KEY = 'shared-token:env';
/**
 * Decorate a route with the env var name that holds the expected token.
 * The guard compares it against `X-Worker-Token` (or `X-Webhook-Token`)
 * using `crypto.timingSafeEqual`.
 */
export const SharedToken = (envName: string) =>
  SetMetadata(SHARED_TOKEN_KEY, envName);

export const SHARED_TOKEN_ORG_KEY = 'shared-token:org-env';
/**
 * For shared-token routes that don't carry a JWT principal, the org id
 * comes from this env var. The decorator captures the env name.
 */
export const SharedTokenOrgFromEnv = (envName: string) =>
  SetMetadata(SHARED_TOKEN_ORG_KEY, envName);

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Run the compare anyway to keep timing constant.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

@Injectable()
export class SharedTokenGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const envName = this.reflector.get<string | undefined>(
      SHARED_TOKEN_KEY,
      context.getHandler(),
    );
    if (!envName) return true;
    const expected = process.env[envName];
    if (!expected) {
      // Fail-closed: a route that requires a token but has no env value
      // configured must refuse every request rather than silently allow.
      throw new UnauthorizedException();
    }
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const headerName =
      envName.toLowerCase() === 'worker_api_token'
        ? 'x-worker-token'
        : 'x-webhook-token';
    const raw = req.headers[headerName];
    const presented = Array.isArray(raw) ? raw[0] : raw;
    if (!presented || !constantTimeEquals(presented, expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
