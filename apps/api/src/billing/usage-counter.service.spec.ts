import { UsageCounterService } from './usage-counter.service';
import { FakeUsageCounterRepository } from '../repositories/fake/fake-usage-counter.repository';

describe('UsageCounterService', () => {
  let repo: FakeUsageCounterRepository;
  let svc: UsageCounterService;

  beforeEach(() => {
    repo = new FakeUsageCounterRepository();
    svc = new UsageCounterService(repo);
  });

  it('bumps a metric by 1 by default, returning the new total', async () => {
    const a = await svc.bump('org-1', 'llm_requests');
    const b = await svc.bump('org-1', 'llm_requests');
    expect(Number(a)).toBe(1);
    expect(Number(b)).toBe(2);
  });

  it('supports custom delta on bump', async () => {
    const t = await svc.bump('org-1', 'llm_tokens', 1500);
    expect(Number(t)).toBe(1500);
  });

  it('today() returns per-metric counts for the UTC day', async () => {
    const t0 = new Date('2026-05-21T05:00:00Z');
    await svc.bump('org-1', 'llm_requests', 3, t0);
    await svc.bump('org-1', 'documents_created', 1, t0);
    const today = await svc.today('org-1', t0);
    expect(today.date).toBe('2026-05-21');
    expect(today.byMetric).toEqual({
      llm_requests: 3,
      documents_created: 1,
    });
  });

  it('sumRange aggregates across days within window', async () => {
    await svc.bump('org-1', 'llm_requests', 2, new Date('2026-05-19T00:00:00Z'));
    await svc.bump('org-1', 'llm_requests', 4, new Date('2026-05-20T00:00:00Z'));
    await svc.bump('org-1', 'llm_requests', 9, new Date('2026-05-21T00:00:00Z'));
    const sums = await svc.sumRange(
      'org-1',
      new Date('2026-05-20T00:00:00Z'),
      new Date('2026-05-22T00:00:00Z'),
    );
    expect(sums.llm_requests).toBe(13);
  });

  it('is tenant-isolated', async () => {
    await svc.bump('org-1', 'llm_requests', 5);
    await svc.bump('org-2', 'llm_requests', 100);
    const t1 = await svc.today('org-1');
    expect(t1.byMetric.llm_requests).toBe(5);
  });
});
