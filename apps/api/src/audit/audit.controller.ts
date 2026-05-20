import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-events')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  /** Recent events for the caller's org. Owner-only — audit content
   *  can include subject emails, override reasons, and other PII-shaped
   *  details that a non-admin role shouldn't see. */
  @Get()
  @Roles(UserRole.Owner)
  recent(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.recent(req.user!.organizationId, limit);
  }
}
