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
import { ClientCompanyService } from './client-company.service';

interface NameBody {
  name: string;
}

@UseGuards(JwtAuthGuard)
@Controller('client-companies')
export class ClientCompanyController {
  constructor(private readonly svc: ClientCompanyService) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
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

  @Post()
  create(
    @Body() body: NameBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.create(body.name, this.orgId(req));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: NameBody,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.update(id, this.orgId(req), body.name);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.remove(id, this.orgId(req));
  }
}
