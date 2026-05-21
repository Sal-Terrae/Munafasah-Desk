import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Audited } from '../audit/audit.decorator';
import { WebhookSubscriptionService } from './webhook-subscription.service';

class CreateWebhookBody {
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  eventTypes!: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

class UpdateWebhookBody {
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  eventTypes?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('webhook-subscriptions')
export class WebhookSubscriptionController {
  constructor(private readonly svc: WebhookSubscriptionService) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  @Get()
  @Roles(UserRole.Owner)
  list(@Req() req: { user?: { organizationId: string } }) {
    return this.svc.list(this.orgId(req));
  }

  @Get(':id')
  @Roles(UserRole.Owner)
  get(
    @Param('id') id: string,
    @Req() req: { user?: { organizationId: string } },
  ) {
    return this.svc.get(id, this.orgId(req));
  }

  @Post()
  @Roles(UserRole.Owner)
  @Audited({
    action: 'webhook.subscription.created',
    entityType: 'WebhookSubscription',
    entityIdFrom: 'response',
    entityIdKey: 'id',
    detailsFrom: ['url', 'eventTypes', 'active'],
  })
  async create(
    @Body() body: CreateWebhookBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    const result = await this.svc.create(
      this.orgId(req),
      req.user!.userId,
      {
        url: body.url,
        eventTypes: body.eventTypes,
        active: body.active,
        description: body.description,
      },
    );
    // Audit interceptor reads entityIdKey='id' from the spread
    // result.subscription. Secret is appended outside the spread so
    // the operator UI can show it once and warn it won't be shown again.
    return {
      ...result.subscription,
      secret: result.secret,
      secretReturnedOnce: true,
    };
  }

  @Patch(':id')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'webhook.subscription.updated',
    entityType: 'WebhookSubscription',
    entityIdFrom: 'param',
    entityIdKey: 'id',
    detailsFrom: ['url', 'eventTypes', 'active'],
  })
  update(
    @Param('id') id: string,
    @Body() body: UpdateWebhookBody,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    return this.svc.update(id, this.orgId(req), req.user!.userId, body);
  }

  @Post(':id/rotate-secret')
  @Roles(UserRole.Owner)
  @Audited({
    action: 'webhook.subscription.secret_rotated',
    entityType: 'WebhookSubscription',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  async rotate(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ) {
    const result = await this.svc.rotateSecret(
      id,
      this.orgId(req),
      req.user!.userId,
    );
    return {
      ...result.subscription,
      secret: result.secret,
      secretReturnedOnce: true,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.Owner)
  @Audited({
    action: 'webhook.subscription.deleted',
    entityType: 'WebhookSubscription',
    entityIdFrom: 'param',
    entityIdKey: 'id',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string; organizationId: string } },
  ): Promise<void> {
    await this.svc.remove(id, this.orgId(req), req.user!.userId);
  }
}
