import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import { IngestionTokenGuard } from './ingestion-token.guard';
import {
  IngestionPortalService,
  IngestionTenderInput,
} from './ingestion-portal.service';

class IngestionRequirementBody {
  @IsString() @MaxLength(40) category!: string;
  @IsString() @MaxLength(4000) text!: string;
  @IsOptional() @IsBoolean() mandatory?: boolean | null;
  @IsOptional() @IsNumber() @Min(0) @Max(1) confidence?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) source_page?: number | null;
  @IsOptional() @IsString() @MaxLength(2000) source_text?: string | null;
}

class IngestionEnrichmentBody {
  @IsOptional() @IsObject() summary?: { ar?: string | null; en?: string | null };
  @IsOptional() @IsString() sector?: string | null;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsObject() buyer?: { name?: string | null; type?: string | null };
  @IsOptional() @IsArray() deadlines?: Array<{
    type: string;
    date: string | null;
    confidence: number;
    source_text?: string | null;
  }>;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestionRequirementBody)
  requirements?: IngestionRequirementBody[];
  @IsOptional() @IsArray() red_flags?: Array<{
    type: string;
    severity: string;
    note: string;
  }>;
  @IsOptional() @IsNumber() @Min(0) @Max(1) extraction_confidence?: number;
}

class IngestionTenderBody {
  @IsOptional() @IsString() @MaxLength(200) externalId?: string | null;
  @IsString() @MaxLength(80) sourceCode!: string;
  @IsString() @MaxLength(1000) title!: string;
  @IsOptional() @IsString() @MaxLength(400) buyerName?: string | null;
  @IsOptional() @IsDateString() publishedAt?: string | null;
  @IsOptional() @IsDateString() submissionDeadline?: string | null;
  @IsOptional() @IsString() @MaxLength(80) sectorCode?: string | null;
  @IsNumber() @Min(0) @Max(1) confidence!: number;
  @IsString() rawText!: string;
  @ValidateNested() @Type(() => IngestionEnrichmentBody) enrichment!: IngestionEnrichmentBody;
}

interface RequestWithIngestion extends Request {
  ingestion?: { organizationId: string };
}

@UseGuards(IngestionTokenGuard)
@Controller('ingestion')
export class IngestionPortalController {
  constructor(private readonly svc: IngestionPortalService) {}

  @Post('tenders')
  async create(
    @Body() body: IngestionTenderBody,
    @Req() req: RequestWithIngestion,
  ) {
    const organizationId = req.ingestion!.organizationId;
    const input: IngestionTenderInput = {
      externalId: body.externalId ?? null,
      sourceCode: body.sourceCode,
      title: body.title,
      buyerName: body.buyerName ?? null,
      publishedAt: body.publishedAt ?? null,
      submissionDeadline: body.submissionDeadline ?? null,
      sectorCode: body.sectorCode ?? null,
      confidence: body.confidence,
      rawText: body.rawText,
      enrichment: body.enrichment,
    };
    const result = await this.svc.ingest(organizationId, input);
    return {
      id: result.tender.id,
      clientCompanyId: result.clientCompany.id,
      requirementsCreated: result.requirementsCreated,
    };
  }
}
