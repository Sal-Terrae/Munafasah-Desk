import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  assertTenancy,
  isStrictTenancyMode,
  TENANT_SCOPED_MODELS,
} from './common/tenancy';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(PrismaService.name);

  constructor() {
    super();
    this.installTenancyGuard();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Defense-in-depth tenant scope check via Prisma's `$use` middleware
   * (Prisma 5.x still supports it; the newer Client extension API
   * exists but $use is friendlier to existing service code because it
   * doesn't re-type the client). Logs in default mode; throws when
   * TENANCY_STRICT_MODE=true.
   *
   * The check is deliberately additive: it never modifies the query,
   * only inspects the `args.where` and surfaces a warning/error when a
   * tenant-scoped model is queried without an organizationId
   * constraint or a known safe-bypass key.
   */
  private installTenancyGuard(): void {
    const strict = isStrictTenancyMode();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    this.$use(async (params, next) => {
      if (params.model && TENANT_SCOPED_MODELS.has(params.model)) {
        assertTenancy(params.model, params.action, params.args, {
          strict,
          log: (msg) => this.log.warn(msg),
        });
      }
      return next(params);
    });
  }
}
