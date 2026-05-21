import {
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PLAN_CATALOG } from './plan-catalog';
import { SubscriptionService } from './subscription.service';
import { UsageCounterService } from './usage-counter.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller()
export class BillingController {
  constructor(
    private readonly subs: SubscriptionService,
    private readonly usage: UsageCounterService,
    private readonly stripe: StripeWebhookService,
  ) {}

  private orgId(req: { user?: { organizationId: string } }): string {
    return req.user!.organizationId;
  }

  /** Public-ish — the catalog is the same for everyone. JWT-gated anyway. */
  @UseGuards(JwtAuthGuard)
  @Get('plans')
  plans() {
    return PLAN_CATALOG;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('subscription')
  @Roles(UserRole.Owner)
  async mySubscription(
    @Req() req: { user?: { organizationId: string } },
  ) {
    const view = await this.subs.forOrg(this.orgId(req));
    return view;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('usage/today')
  @Roles(UserRole.Owner)
  todayUsage(@Req() req: { user?: { organizationId: string } }) {
    return this.usage.today(this.orgId(req));
  }

  /**
   * Stripe webhook receiver. Public (no JWT). The body comes in as a
   * parsed object via @nestjs/platform-express, but Stripe needs the
   * RAW body for HMAC. We rely on the caller (or a future raw-body
   * middleware) to send `rawBody` on req. If unavailable, falls back
   * to JSON.stringify of the parsed body — which won't match Stripe's
   * signature byte-for-byte and will be rejected. Operators wire a
   * raw-body parser (e.g. express.raw) on this route in real
   * deployments.
   */
  @Post('webhooks/stripe')
  async stripeReceive(
    @Headers('stripe-signature') sig: string,
    @Req() req: { rawBody?: Buffer; body?: unknown },
  ) {
    const raw =
      req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    return this.stripe.receive(raw, sig ?? '');
  }
}
