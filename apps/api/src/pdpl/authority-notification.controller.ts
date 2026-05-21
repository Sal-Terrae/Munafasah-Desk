import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audited } from '../audit/audit.decorator';
import { AuthorityNotificationService } from './authority-notification.service';

/**
 * Manual operator trigger for the PDPL Art. 20 authority notification.
 * The auto-trigger flow (when an incident is created with severity≥
 * high) lives in the existing IncidentService and writes its own
 * audit row; this endpoint exists for retries and ops-driven sends.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('authority-notifications')
export class AuthorityNotificationController {
  constructor(private readonly svc: AuthorityNotificationService) {}

  @Post('incidents/:id')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'authority_notification.manual_trigger',
    entityType: 'Incident',
    entityIdFrom: 'param',
    entityIdKey: 'id',
    detailsFrom: ['delivered', 'driver'],
  })
  trigger(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.notifyForIncident(
      req.user!.organizationId,
      id,
      req.user!.userId,
    );
  }
}
