import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Delete,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audited } from '../audit/audit.decorator';
import { ComplianceMatrixService } from './compliance-matrix.service';
import { EvidenceLinkService } from './evidence-link.service';

const ALLOWED_STATUSES = [
  'missing',
  'partial',
  'satisfied',
  'overridden',
] as const;
const ALLOWED_RISKS = ['low', 'medium', 'high', 'critical'] as const;

export class UpdateComplianceItemBody {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  owner?: string;

  @IsOptional()
  @IsIn(ALLOWED_STATUSES)
  status?: (typeof ALLOWED_STATUSES)[number];

  @IsOptional()
  @IsIn(ALLOWED_RISKS)
  risk?: (typeof ALLOWED_RISKS)[number];

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class CreateEvidenceLinkBody {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('compliance-items')
export class ComplianceItemController {
  constructor(
    private readonly matrices: ComplianceMatrixService,
    private readonly links: EvidenceLinkService,
  ) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Patch(':id')
  @Audited({
    action: 'compliance_item.update',
    entityType: 'ComplianceItem',
    entityIdFrom: 'param',
    entityIdKey: 'id',
    detailsFrom: ['status', 'owner', 'risk', 'dueDate'],
  })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateComplianceItemBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.matrices.updateItem(id, this.orgId(req), {
      owner: body.owner,
      status: body.status,
      risk: body.risk,
      dueDate:
        body.dueDate === undefined
          ? undefined
          : body.dueDate === null
            ? null
            : new Date(body.dueDate),
    });
  }

  @Get(':id/evidence-links')
  async list(
    @Param('id') itemId: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.links.listForItem(itemId, this.orgId(req));
  }

  @Post(':id/evidence-links')
  @Audited({
    action: 'evidence_link.create',
    entityType: 'ComplianceItem',
    entityIdFrom: 'param',
    entityIdKey: 'id',
    detailsFrom: ['documentId'],
  })
  async link(
    @Param('id') itemId: string,
    @Body() body: CreateEvidenceLinkBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.links.link(
      itemId,
      body.documentId,
      this.orgId(req),
      body.note ?? null,
    );
  }

  @Delete(':id/evidence-links/:documentId')
  @Audited({
    action: 'evidence_link.delete',
    entityType: 'ComplianceItem',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  async unlink(
    @Param('id') itemId: string,
    @Param('documentId') documentId: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.links.unlink(itemId, documentId, this.orgId(req));
  }
}
