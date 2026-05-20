import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IUserRepository } from '../repositories/interfaces/user.repository.interface';
import { AuditService } from '../audit/audit.service';
import { logEvent } from '../observability/logger';
import { USER_REPOSITORY } from '../repositories/tokens';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user: PublicUser }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      await this.recordLoginFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }
    const access_token = await this.jwt.signAsync({
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    });
    await this.recordLoginSuccess(user);
    return { access_token, user: toPublic(user) };
  }

  async logoutAudit(principal: {
    userId: string;
    organizationId: string;
  }): Promise<void> {
    try {
      await this.audit.record({
        action: 'auth.logout',
        entityType: 'User',
        entityId: principal.userId,
        userId: principal.userId,
        organizationId: principal.organizationId,
      });
    } catch (err) {
      logEvent('error', 'audit_write_failed', {
        action: 'auth.logout',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async recordLoginSuccess(user: User): Promise<void> {
    try {
      await this.audit.record({
        action: 'auth.login.success',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        organizationId: user.organizationId,
      });
    } catch (err) {
      logEvent('error', 'audit_write_failed', {
        action: 'auth.login.success',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Failed-login audit: only emitted when we can resolve the
   * organisation (the email matched a real user), otherwise the
   * structured logger captures the event without leaking PII.
   */
  private async recordLoginFailure(email: string): Promise<void> {
    try {
      const user = await this.users.findByEmail(email);
      if (!user) {
        logEvent('warn', 'auth_login_unknown_email');
        return;
      }
      await this.audit.record({
        action: 'auth.login.failure',
        entityType: 'User',
        entityId: user.id,
        userId: null,
        organizationId: user.organizationId,
        details: { reason: 'invalid_password' },
      });
    } catch (err) {
      logEvent('error', 'audit_write_failed', {
        action: 'auth.login.failure',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async me(
    userId: string,
    organizationId: string,
  ): Promise<PublicUser | null> {
    const user = await this.users.findById(userId, organizationId);
    return user ? toPublic(user) : null;
  }
}
