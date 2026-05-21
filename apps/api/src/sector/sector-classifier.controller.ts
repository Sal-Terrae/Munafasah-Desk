import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsNumber,
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
import { SectorClassifierService } from './sector-classifier.service';
import { SECTORS } from './sector-catalog';

class ClassifyBody {
  @IsOptional()
  forceRerun?: boolean;
}

class OverrideBody {
  @IsIn(SECTORS as unknown as string[])
  sector!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenders/:id/sector')
export class SectorClassifierController {
  constructor(private readonly svc: SectorClassifierService) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  /** Run (or rerun, with forceRerun=true) the LLM classifier. */
  @Post('classify')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'tender.sector.classified',
    entityType: 'Tender',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  classify(
    @Param('id') id: string,
    @Body() body: ClassifyBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.classify(id, this.orgId(req), req.user!.userId, {
      forceRerun: Boolean(body.forceRerun),
    });
  }

  /** Manual override (e.g. operator disagrees with the model). */
  @Patch()
  @Roles(UserRole.Owner)
  @Audited({
    action: 'tender.sector.override',
    entityType: 'Tender',
    entityIdFrom: 'param',
    entityIdKey: 'id',
    detailsFrom: ['sector', 'category', 'confidence'],
  })
  override(
    @Param('id') id: string,
    @Body() body: OverrideBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.override(id, this.orgId(req), req.user!.userId, {
      sector: body.sector as (typeof SECTORS)[number],
      category: body.category ?? null,
      confidence: body.confidence ?? null,
    });
  }
}
