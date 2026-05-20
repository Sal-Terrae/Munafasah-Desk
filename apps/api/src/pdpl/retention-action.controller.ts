import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audited } from '../audit/audit.decorator';
import { RetentionActionPersistenceService } from './retention-action.service';
import {
  RetentionActionStatus,
  RetentionActionType,
} from '../repositories/types';

const ACTIONS = ['destroy', 'archive'] as const;

export class RequestRetentionBody {
  @IsString()
  documentId!: string;

  @IsIn(ACTIONS)
  action!: (typeof ACTIONS)[number];

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('retention-actions')
export class RetentionActionController {
  constructor(private readonly svc: RetentionActionPersistenceService) {}

  @Get()
  list(
    @Query('status') status: RetentionActionStatus | undefined,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.list(req.user!.organizationId, status);
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.get(id, req.user!.organizationId);
  }

  @Post()
  @Audited({
    action: 'retention.request',
    entityType: 'RetentionAction',
    entityIdFrom: 'response',
    entityIdKey: 'id',
    detailsFrom: ['documentId', 'action'],
  })
  request(
    @Body() body: RequestRetentionBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.request(
      req.user!.organizationId,
      body.documentId,
      body.action as RetentionActionType,
      body.reason,
      req.user!.userId,
    );
  }

  @Post(':id/approve')
  @Roles(UserRole.Owner, UserRole.DocController)
  approve(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.approve(id, req.user!.organizationId, req.user!.userId);
  }

  @Post(':id/deny')
  @Roles(UserRole.Owner, UserRole.DocController)
  deny(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.deny(id, req.user!.organizationId, req.user!.userId);
  }

  /**
   * Manual sweep trigger — admins fire this when they want to
   * collect-pending-destructions ad-hoc rather than wait for the
   * daily scheduler. The scheduler also calls the underlying svc.sweep
   * with a stable system user id.
   */
  @Post('sweep')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'retention.sweep.manual',
    entityType: 'Organization',
    entityIdFrom: 'principal',
  })
  sweep(
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.sweep(req.user!.organizationId, req.user!.userId);
  }
}
