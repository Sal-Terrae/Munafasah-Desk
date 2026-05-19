import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DocumentVaultService,
  RegisterDocumentInput,
} from './document-vault.service';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentVaultController {
  constructor(private readonly svc: DocumentVaultService) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Post()
  register(
    @Body() body: RegisterDocumentInput,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.register(body, this.orgId(req));
  }

  @Get()
  list(@Req() req: { user?: { organizationId: string } }) {
    return this.svc.list(this.orgId(req));
  }

  @Get('expiring')
  expiring(
    @Query('before') before: string | undefined,
    @Req() req: { user?: { organizationId: string } },
  ) {
    const cutoff = before ? new Date(before) : new Date();
    return this.svc.listExpiring(this.orgId(req), cutoff);
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.get(id, this.orgId(req));
  }

  @Patch(':id/state')
  setState(
    @Param('id') id: string,
    @Body()
    body: {
      state: 'active' | 'expiring' | 'restricted' | 'archived';
    },
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.setState(id, this.orgId(req), body.state);
  }
}
