import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenderService } from '../tender/tender.service';
import { FitScoringService, FitSignals } from './fit-scoring.service';

interface OverrideBody extends FitSignals {
  overrideScore: number;
  reason: string;
}

@UseGuards(JwtAuthGuard)
@Controller('tenders/:id/fit-score')
export class FitScoringController {
  constructor(
    private readonly fit: FitScoringService,
    private readonly tenders: TenderService,
  ) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Post()
  async compute(
    @Param('id') id: string,
    @Body() signals: FitSignals,
    @Req() req: { user?: { organizationId: string } },
  ) {
    // Tenant guard: tender must exist within the caller organization.
    await this.tenders.get(id, this.orgId(req));
    return this.fit.score(signals);
  }

  @Post('override')
  async override(
    @Param('id') id: string,
    @Body() body: OverrideBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    await this.tenders.get(id, this.orgId(req));
    return this.fit.override(body, body.overrideScore, body.reason);
  }
}
