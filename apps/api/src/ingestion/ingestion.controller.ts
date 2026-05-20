import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audited } from '../audit/audit.decorator';
import { IngestionService } from './ingestion.service';
import {
  SharedToken,
  SharedTokenGuard,
} from './shared-token.guard';
import {
  IngestionKind,
  IngestionStatus,
} from '../repositories/types';

const KINDS = ['etimad', 'upload', 'email', 'link'] as const;

export class EnqueueIngestionBody {
  @IsIn(KINDS)
  kind!: (typeof KINDS)[number];

  @IsObject()
  payload!: Record<string, unknown>;
}

export class InboundEmailBody {
  @IsString()
  @MaxLength(254)
  from!: string;

  @IsString()
  @MaxLength(500)
  subject!: string;

  @IsString()
  @MaxLength(200000)
  body!: string;

  @IsString()
  organizationId!: string;
}

export class CompleteJobBody {
  @IsObject()
  result!: Record<string, unknown>;
}

export class FailJobBody {
  @IsString()
  @MaxLength(2000)
  errorMessage!: string;
}

@Controller('ingestions')
export class IngestionController {
  constructor(private readonly svc: IngestionService) {}

  // ---------- User-driven enqueue (authenticated) ----------

  @Post()
  @UseGuards(JwtAuthGuard)
  @Audited({
    action: 'ingestion.enqueue.user',
    entityType: 'IngestionJob',
    detailsFrom: ['kind'],
  })
  enqueue(
    @Body() body: EnqueueIngestionBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.enqueue({
      organizationId: req.user!.organizationId,
      kind: body.kind as IngestionKind,
      payload: body.payload as never,
      createdBy: req.user!.userId,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Query('status') status: IngestionStatus | undefined,
    @Query('kind') kind: IngestionKind | undefined,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.list(req.user!.organizationId, status, kind);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  get(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.get(id, req.user!.organizationId);
  }

  // ---------- Worker channel (shared-token gated) ----------

  @Get('next-job')
  @UseGuards(SharedTokenGuard)
  @SharedToken('WORKER_API_TOKEN')
  async claimNext(
    @Query('kind') kind: IngestionKind | undefined,
    @Req() req: { headers: Record<string, string> },
  ) {
    const workerId = req.headers['x-worker-id'] ?? 'worker-unknown';
    return this.svc.claimNext(workerId, kind);
  }

  @Post(':id/complete')
  @UseGuards(SharedTokenGuard)
  @SharedToken('WORKER_API_TOKEN')
  async complete(
    @Param('id') id: string,
    @Body() body: CompleteJobBody,
    @Query('organizationId') organizationId: string | undefined,
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId query param required');
    }
    return this.svc.complete(id, organizationId, body.result as never);
  }

  @Post(':id/fail')
  @UseGuards(SharedTokenGuard)
  @SharedToken('WORKER_API_TOKEN')
  async fail(
    @Param('id') id: string,
    @Body() body: FailJobBody,
    @Query('organizationId') organizationId: string | undefined,
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId query param required');
    }
    return this.svc.fail(id, organizationId, body.errorMessage);
  }
}

@Controller('webhooks/inbound')
export class WebhookController {
  constructor(private readonly svc: IngestionService) {}

  @Post('email')
  @UseGuards(SharedTokenGuard)
  @SharedToken('WEBHOOK_INBOUND_EMAIL_TOKEN')
  async inboundEmail(@Body() body: InboundEmailBody) {
    // Webhook is a tenant boundary too — the inbound mail provider has
    // to know the target org and we trust the shared secret to gate
    // that. Each tenant gets a unique token rotation.
    return this.svc.enqueue({
      organizationId: body.organizationId,
      kind: 'email',
      payload: {
        from: body.from,
        subject: body.subject,
        body: body.body,
      } as never,
      createdBy: null,
    });
  }
}
