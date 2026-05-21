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
import { IsString, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audited } from '../audit/audit.decorator';
import { IngestionApiKeyService } from './ingestion-api-key.service';

class MintBody {
  @IsString() @MaxLength(80) name!: string;
}

interface OwnerReq {
  user?: { userId: string; organizationId: string };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/ingestion-keys')
export class IngestionApiKeyController {
  constructor(private readonly svc: IngestionApiKeyService) {}

  @Get()
  @Roles(UserRole.Owner)
  async list(@Req() req: OwnerReq) {
    const rows = await this.svc.list(req.user!.organizationId);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      keyPrefix: r.keyPrefix,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt,
      revokedAt: r.revokedAt,
    }));
  }

  @Post()
  @Roles(UserRole.Owner)
  @Audited({
    action: 'ingestion_api_key.minted',
    entityType: 'IngestionApiKey',
    entityIdFrom: 'response',
    entityIdKey: 'id',
    detailsFrom: ['name', 'keyPrefix'],
  })
  async mint(@Body() body: MintBody, @Req() req: OwnerReq) {
    const r = await this.svc.mint(
      req.user!.organizationId,
      req.user!.userId,
      body.name,
    );
    return {
      id: r.key.id,
      name: r.key.name,
      keyPrefix: r.key.keyPrefix,
      createdAt: r.key.createdAt,
      // Raw key is the ONE thing the caller will never see again.
      rawKey: r.rawKey,
      rawKeyReturnedOnce: true,
    };
  }

  @Delete(':id')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'ingestion_api_key.revoked',
    entityType: 'IngestionApiKey',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  async revoke(@Param('id') id: string, @Req() req: OwnerReq) {
    const r = await this.svc.revoke(id, req.user!.organizationId);
    return {
      id: r.id,
      revokedAt: r.revokedAt,
    };
  }
}
