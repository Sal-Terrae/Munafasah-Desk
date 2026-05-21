import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsDateString,
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
import { Audited } from '../audit/audit.decorator';
import {
  DpoTrainingService,
  TrainingExpiryStatus,
} from './dpo-training.service';

const STATUS_FILTER_VALUES = [
  'all',
  'no-expiry',
  'active',
  'expiring',
  'expired',
] as const;

class TrainingListQuery {
  @IsOptional()
  @IsIn(STATUS_FILTER_VALUES)
  status?: (typeof STATUS_FILTER_VALUES)[number];
}

class CreateTrainingRecordBody {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  userId?: string;

  @IsString()
  @MaxLength(200)
  subjectName!: string;

  @IsEmail()
  @MaxLength(254)
  subjectEmail!: string;

  @IsString()
  @MaxLength(200)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @IsDateString()
  completedAt!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  evidenceDocumentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

class UpdateTrainingRecordBody {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subjectName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  subjectEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string | null;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceRef?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  evidenceDocumentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training-records')
export class DpoTrainingController {
  constructor(private readonly svc: DpoTrainingService) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Get()
  @Roles(UserRole.Owner)
  list(
    @Query() q: TrainingListQuery,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.list(this.orgId(req), {
      status: q.status as TrainingExpiryStatus | 'all' | undefined,
    });
  }

  @Get('summary')
  @Roles(UserRole.Owner)
  summary(@Req() req: { user?: { organizationId: string } }) {
    return this.svc.summary(this.orgId(req));
  }

  @Get(':id')
  @Roles(UserRole.Owner)
  get(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.get(id, this.orgId(req));
  }

  @Post()
  @Roles(UserRole.Owner)
  @Audited({
    action: 'dpo_training.create',
    entityType: 'DpoTrainingRecord',
    entityIdFrom: 'response',
    entityIdKey: 'id',
    detailsFrom: ['subjectEmail', 'topic', 'provider'],
  })
  create(
    @Body() body: CreateTrainingRecordBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.create(this.orgId(req), req.user!.userId, {
      userId: body.userId ?? null,
      subjectName: body.subjectName,
      subjectEmail: body.subjectEmail,
      topic: body.topic,
      provider: body.provider ?? null,
      completedAt: new Date(body.completedAt),
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      evidenceRef: body.evidenceRef ?? null,
      evidenceDocumentId: body.evidenceDocumentId ?? null,
      notes: body.notes ?? null,
    });
  }

  @Patch(':id')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'dpo_training.update',
    entityType: 'DpoTrainingRecord',
    entityIdFrom: 'param',
    entityIdKey: 'id',
    detailsFrom: ['topic', 'validUntil', 'provider'],
  })
  update(
    @Param('id') id: string,
    @Body() body: UpdateTrainingRecordBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.update(id, this.orgId(req), {
      ...(body.subjectName !== undefined && { subjectName: body.subjectName }),
      ...(body.subjectEmail !== undefined && {
        subjectEmail: body.subjectEmail,
      }),
      ...(body.topic !== undefined && { topic: body.topic }),
      ...(body.provider !== undefined && { provider: body.provider }),
      ...(body.completedAt !== undefined && {
        completedAt: new Date(body.completedAt),
      }),
      ...(body.validUntil !== undefined && {
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      }),
      ...(body.evidenceRef !== undefined && { evidenceRef: body.evidenceRef }),
      ...(body.evidenceDocumentId !== undefined && {
        evidenceDocumentId: body.evidenceDocumentId,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.Owner)
  @Audited({
    action: 'dpo_training.delete',
    entityType: 'DpoTrainingRecord',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ): Promise<void> {
    await this.svc.remove(id, this.orgId(req));
  }
}
