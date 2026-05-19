import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenderService, TenderSource } from './tender.service';

interface IntakeBody {
  title: string;
  clientCompanyId: string;
  source?: TenderSource;
}

@UseGuards(JwtAuthGuard)
@Controller('tenders')
export class TenderController {
  constructor(private readonly svc: TenderService) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Post()
  intake(
    @Body() body: IntakeBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.intake(
      body.title,
      body.clientCompanyId,
      this.orgId(req),
      body.source ?? 'manual',
    );
  }

  @Get()
  list(@Req() req: { user?: { organizationId: string } }) {
    return this.svc.list(this.orgId(req));
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.get(id, this.orgId(req));
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.updateStatus(id, this.orgId(req), body.status);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.remove(id, this.orgId(req));
  }
}
