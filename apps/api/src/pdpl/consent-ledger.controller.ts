import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentLedgerService } from './consent-ledger.service';

const STATES = ['granted', 'withdrawn'] as const;

export class RecordConsentBody {
  @IsEmail()
  @MaxLength(254)
  subjectEmail!: string;

  @IsString()
  @MaxLength(120)
  purpose!: string;

  @IsIn(STATES)
  state!: (typeof STATES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

@UseGuards(JwtAuthGuard)
@Controller('consent-events')
export class ConsentLedgerController {
  constructor(private readonly svc: ConsentLedgerService) {}

  @Post()
  create(
    @Body() body: RecordConsentBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.record(req.user!.organizationId, {
      subjectEmail: body.subjectEmail,
      purpose: body.purpose,
      state: body.state,
      source: body.source,
      recordedBy: req.user!.userId,
      details: body.details,
    });
  }

  @Get()
  list(
    @Query('subjectEmail') subjectEmail: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.listForSubject(req.user!.organizationId, subjectEmail);
  }

  @Get('check')
  async check(
    @Query('subjectEmail') subjectEmail: string,
    @Query('purpose') purpose: string,
    @Req() req: { user?: { organizationId: string } },
  ): Promise<{
    subjectEmail: string;
    purpose: string;
    state: 'granted' | 'withdrawn' | null;
  }> {
    const state = await this.svc.currentState(
      req.user!.organizationId,
      subjectEmail,
      purpose,
    );
    return { subjectEmail, purpose, state };
  }
}
