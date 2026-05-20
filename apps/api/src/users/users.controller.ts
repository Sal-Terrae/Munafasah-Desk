import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  /**
   * Roster of users in the caller's org. Owner-only — user listings
   * are inherently PII-shaped (names + emails), so the same admin
   * gate we use for the audit log applies here.
   */
  @Get()
  @Roles(UserRole.Owner)
  list(@Req() req: { user?: { organizationId: string } }) {
    return this.svc.list(req.user!.organizationId);
  }
}
