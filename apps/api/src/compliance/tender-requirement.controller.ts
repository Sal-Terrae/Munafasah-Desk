import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audited } from '../audit/audit.decorator';
import { ITenderRequirementRepository } from '../repositories/interfaces/tender-requirement.repository.interface';
import { TenderService } from '../tender/tender.service';
import { TENDER_REQUIREMENT_REPOSITORY } from '../repositories/tokens';

const RISKS = ['low', 'medium', 'high', 'critical'] as const;

export class RequirementInput {
  @IsString()
  @MaxLength(120)
  category!: string;

  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsOptional()
  @IsIn(RISKS)
  risk?: (typeof RISKS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  owner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}

export class CreateRequirementsBody {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementInput)
  requirements!: RequirementInput[];
}

@UseGuards(JwtAuthGuard)
@Controller('tenders/:id/requirements')
export class TenderRequirementController {
  constructor(
    @Inject(TENDER_REQUIREMENT_REPOSITORY)
    private readonly repo: ITenderRequirementRepository,
    private readonly tenders: TenderService,
  ) {}

  private async assertTenant(
    tenderId: string,
    organizationId: string,
  ): Promise<void> {
    await this.tenders.get(tenderId, organizationId);
  }

  @Get()
  async list(
    @Param('id') tenderId: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    const organizationId = req.user!.organizationId;
    await this.assertTenant(tenderId, organizationId);
    return this.repo.findAllForTender(tenderId, organizationId);
  }

  @Post()
  @Audited({
    action: 'tender_requirement.create_bulk',
    entityType: 'Tender',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  async createBulk(
    @Param('id') tenderId: string,
    @Body() body: CreateRequirementsBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    const organizationId = req.user!.organizationId;
    await this.assertTenant(tenderId, organizationId);
    return this.repo.createMany(
      body.requirements.map((r) => ({
        tenderId,
        organizationId,
        category: r.category,
        text: r.text,
        risk: r.risk ?? 'medium',
        owner: r.owner ?? null,
        source: r.source ?? 'manual',
      })),
    );
  }
}
