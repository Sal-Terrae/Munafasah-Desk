import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audited } from '../audit/audit.decorator';
import { DpoContactService } from './dpo-contact.service';

export class UpsertDpoContactBody {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsEmail()
  @MaxLength(254)
  authorityEmail!: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(36500) // 100 years upper bound
  retentionPolicyDays?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dpo-contact')
export class DpoContactController {
  constructor(private readonly svc: DpoContactService) {}

  @Get()
  get(@Req() req: { user?: { organizationId: string } }) {
    return this.svc.get(req.user!.organizationId);
  }

  @Put()
  @Roles(UserRole.Owner)
  @Audited({
    action: 'dpo_contact.upsert',
    entityType: 'DpoContact',
    entityIdFrom: 'response',
    entityIdKey: 'id',
    detailsFrom: ['name', 'email', 'authorityEmail', 'retentionPolicyDays'],
  })
  upsert(
    @Body() body: UpsertDpoContactBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.upsert(
      req.user!.organizationId,
      {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        authorityEmail: body.authorityEmail,
        retentionPolicyDays: body.retentionPolicyDays,
      },
      req.user!.userId,
    );
  }
}
