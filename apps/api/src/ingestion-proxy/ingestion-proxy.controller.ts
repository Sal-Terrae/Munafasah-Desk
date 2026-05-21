import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audited } from '../audit/audit.decorator';
import { IngestionProxyService } from './ingestion-proxy.service';

class ListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

class TriggerBody {
  @IsString() @MaxLength(100) sourceCode!: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) maxPages?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) maxItems?: number;
  @IsOptional() @IsBoolean() syncToAdmin?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/ingestion')
export class IngestionProxyController {
  constructor(private readonly svc: IngestionProxyService) {}

  @Get('runs')
  @Roles(UserRole.Owner)
  list(@Query() q: ListQuery) {
    return this.svc.listRecent(q.limit ?? 20);
  }

  @Post('runs')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'ingestion.run_triggered',
    entityType: 'IngestionRun',
    entityIdFrom: 'response',
    entityIdKey: 'runId',
    detailsFrom: ['sourceCode', 'maxPages', 'maxItems', 'syncToAdmin'],
  })
  trigger(@Body() body: TriggerBody) {
    return this.svc.trigger(body);
  }
}
