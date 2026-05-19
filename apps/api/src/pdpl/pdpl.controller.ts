import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PROCESSING_INVENTORY } from './processing-inventory';
import { readResidencyMode } from './residency';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pdpl')
export class PdplController {
  @Get('processing-inventory')
  @Roles(UserRole.Owner, UserRole.DocController)
  inventory() {
    return { items: PROCESSING_INVENTORY };
  }

  @Get('residency')
  @Roles(UserRole.Owner, UserRole.DocController)
  residency() {
    return readResidencyMode();
  }
}
