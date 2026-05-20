import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

/**
 * Verifies Google-signed OIDC ID tokens minted by Cloud Scheduler.
 *
 * Cloud Scheduler's HTTP target is configured (via Terraform) to send
 * an `Authorization: Bearer <id_token>` header with:
 *   - `iss == https://accounts.google.com`
 *   - `aud == SCHEDULER_OIDC_AUDIENCE` (we set it to the sweep URL)
 *   - `email == SCHEDULER_SA_EMAIL`
 *
 * The guard reuses Google's well-known JWKS via `OAuth2Client` (cached
 * per-instance) and rejects on any of: missing token, signature
 * mismatch, audience mismatch, issuer mismatch, or email mismatch.
 *
 * Fail-closed when the required env vars are not set.
 */
@Injectable()
export class SchedulerOidcGuard implements CanActivate {
  private readonly log = new Logger(SchedulerOidcGuard.name);
  private readonly client = new OAuth2Client();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const audience = process.env.SCHEDULER_OIDC_AUDIENCE;
    const expectedEmail = process.env.SCHEDULER_SA_EMAIL;
    if (!audience || !expectedEmail) {
      this.log.warn(
        'SCHEDULER_OIDC_AUDIENCE / SCHEDULER_SA_EMAIL not set — refusing',
      );
      throw new UnauthorizedException();
    }
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const auth = req.headers['authorization'];
    const header = Array.isArray(auth) ? auth[0] : auth;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException();
    }
    const token = header.slice('bearer '.length).trim();
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException();
    }
    if (!payload) throw new UnauthorizedException();
    const okIssuer =
      payload.iss === 'https://accounts.google.com' ||
      payload.iss === 'accounts.google.com';
    if (!okIssuer) throw new UnauthorizedException();
    if (payload.email !== expectedEmail) {
      throw new UnauthorizedException();
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
