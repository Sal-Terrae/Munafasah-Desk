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
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DataSubjectService } from './data-subject.service';
import { DataSubjectRequestStatus } from '../repositories/types';

const TYPES = ['access', 'erasure', 'rectification'] as const;

export class CreateDataSubjectRequestBody {
  @IsIn(TYPES)
  type!: (typeof TYPES)[number];

  @IsEmail()
  @MaxLength(254)
  subjectEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class DenyRequestBody {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data-subject-requests')
export class DataSubjectController {
  constructor(private readonly svc: DataSubjectService) {}

  private context(req: {
    user?: { userId: string; organizationId: string };
  }) {
    return {
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
    };
  }

  @Post()
  create(
    @Body() body: CreateDataSubjectRequestBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    const { userId, organizationId } = this.context(req);
    return this.svc.createRequest(
      organizationId,
      body.type,
      body.subjectEmail,
      userId,
      body.notes ?? null,
    );
  }

  @Get()
  list(
    @Query('status') status: DataSubjectRequestStatus | undefined,
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

  // Approval/denial/execution are admin-only.
  @Post(':id/approve')
  @Roles(UserRole.Owner)
  approve(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    const { userId, organizationId } = this.context(req);
    return this.svc.approve(id, organizationId, userId);
  }

  @Post(':id/deny')
  @Roles(UserRole.Owner)
  deny(
    @Param('id') id: string,
    @Body() body: DenyRequestBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    const { userId, organizationId } = this.context(req);
    return this.svc.deny(id, organizationId, userId, body.notes);
  }

  @Post(':id/execute')
  @Roles(UserRole.Owner)
  execute(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    const { userId, organizationId } = this.context(req);
    return this.svc.execute(id, organizationId, userId);
  }
}
