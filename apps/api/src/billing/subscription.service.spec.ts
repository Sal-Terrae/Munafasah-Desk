import { SubscriptionService } from './subscription.service';
import { FakeSubscriptionRepository } from '../repositories/fake/fake-subscription.repository';

describe('SubscriptionService', () => {
  let repo: FakeSubscriptionRepository;
  let svc: SubscriptionService;

  beforeEach(() => {
    repo = new FakeSubscriptionRepository();
    svc = new SubscriptionService(repo);
  });

  it('synthesises an implicit free subscription when none exists', async () => {
    const v = await svc.forOrg('org-new');
    expect(v.subscription.planCode).toBe('free');
    expect(v.subscription.id).toBe('implicit-free');
    expect(v.plan.code).toBe('free');
    // No row was persisted.
    expect(await repo.findByOrg('org-new')).toBeNull();
  });

  it('returns the persisted subscription when one exists', async () => {
    await svc.upsert({
      organizationId: 'org-1',
      planCode: 'pro',
      status: 'active',
      stripeCustomerId: 'cus_X',
      stripeSubscriptionId: 'sub_X',
    });
    const v = await svc.forOrg('org-1');
    expect(v.subscription.planCode).toBe('pro');
    expect(v.subscription.id).not.toBe('implicit-free');
    expect(v.plan.code).toBe('pro');
  });

  it('upsert replaces previous row for the org', async () => {
    const first = await svc.upsert({
      organizationId: 'org-1',
      planCode: 'basic',
      status: 'active',
    });
    const second = await svc.upsert({
      organizationId: 'org-1',
      planCode: 'pro',
      status: 'past_due',
    });
    expect(second.id).toBe(first.id);
    expect(second.planCode).toBe('pro');
    expect(second.status).toBe('past_due');
  });

  it('falls back to free plan when planCode is unknown', async () => {
    await svc.upsert({
      organizationId: 'org-1',
      planCode: 'enterprise', // not in catalog
      status: 'active',
    });
    const v = await svc.forOrg('org-1');
    expect(v.subscription.planCode).toBe('enterprise');
    expect(v.plan.code).toBe('free'); // fallback
  });
});
