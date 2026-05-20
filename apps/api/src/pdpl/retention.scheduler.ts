import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IOrganizationRepository } from '../repositories/interfaces/organization.repository.interface';
import { RetentionActionPersistenceService } from './retention-action.service';
import { ORGANIZATION_REPOSITORY } from '../repositories/tokens';

/**
 * Daily retention sweep. Runs at 02:00 in the API instance's local time.
 * Cloud Run sleeps idle instances, so for production deployments this
 * should be augmented by a Cloud Scheduler trigger that hits the manual
 * `/retention-actions/sweep` endpoint at the same cadence. The
 * in-process cron is the dev-friendly fallback (and a sanity check).
 */
@Injectable()
export class RetentionScheduler {
  private readonly log = new Logger(RetentionScheduler.name);
  private readonly systemUserId = 'system:retention-scheduler';

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgs: IOrganizationRepository,
    private readonly svc: RetentionActionPersistenceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'retention-sweep',
    timeZone: 'Asia/Riyadh',
  })
  async runDaily(): Promise<void> {
    if (process.env.RETENTION_SCHEDULER_ENABLED !== 'true') {
      return; // opt-in to avoid duplicate writes in dev / test
    }
    const orgs = await this.orgs.findAll();
    for (const org of orgs) {
      try {
        const result = await this.svc.sweep(org.id, this.systemUserId);
        this.log.log(
          `retention sweep org=${org.id} scanned=${result.docsScanned} created=${result.created}`,
        );
      } catch (err) {
        this.log.error(
          `retention sweep failed for org=${org.id}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
  }
}
