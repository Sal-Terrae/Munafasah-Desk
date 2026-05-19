import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { requireJwtSecret } from '../common/jwt-secret';

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: string;
}

export const SESSION_COOKIE_NAME = 'bidready_session';

function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, unknown> })
    .cookies;
  const raw = cookies?.[SESSION_COOKIE_NAME];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };
  }
}
