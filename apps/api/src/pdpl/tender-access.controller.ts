import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenderAccessService } from './tender-access.service';
import { TenderAccessRole } from '../repositories/types';

const ROLES = ['Owner', 'Editor', 'Reviewer', 'Viewer'] as const;

export class GrantBody {
  @IsString()
  userId!: string;

  @IsIn(ROLES)
  role!: (typeof ROLES)[number];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenders/:tenderId/access')
export class TenderAccessController {
  constructor(private readonly svc: TenderAccessService) {}

  @Get()
  list(
    @Param('tenderId') tenderId: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.listForTender(req.user!.organizationId, tenderId);
  }

  @Post()
  @Roles(UserRole.Owner)
  grant(
    @Param('tenderId') tenderId: string,
    @Body() body: GrantBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.grant(
      req.user!.organizationId,
      body.userId,
      tenderId,
      body.role as TenderAccessRole,
      req.user!.userId,
    );
  }

  @Delete(':userId')
  @Roles(UserRole.Owner)
  revoke(
    @Param('tenderId') tenderId: string,
    @Param('userId') userId: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.revoke(
      req.user!.organizationId,
      userId,
      tenderId,
      req.user!.userId,
    );
  }
}
