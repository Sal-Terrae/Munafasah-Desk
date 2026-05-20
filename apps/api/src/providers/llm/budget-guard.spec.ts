import { BudgetGuardService } from './budget-guard.service';
import { BudgetExceededException } from './budget-exceeded.exception';
import { FakeLlmUsageLogRepository } from '../../repositories/fake/fake-llm-usage-log.repository';

describe('BudgetGuardService', () => {
  let repo: FakeLlmUsageLogRepository;
  let guard: BudgetGuardService;

  beforeEach(() => {
    process.env.LLM_DAILY_MAX_REQUESTS = '3';
    process.env.LLM_DAILY_MAX_COST_USD = '0.50';
    repo = new FakeLlmUsageLogRepository();
    guard = new BudgetGuardService(repo);
  });

  afterAll(() => {
    delete process.env.LLM_DAILY_MAX_REQUESTS;
    delete process.env.LLM_DAILY_MAX_COST_USD;
  });

  it('passes when usage is below caps', async () => {
    await repo.create({
      organizationId: 'org-1',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      totalTokens: 100,
      estimatedCost: 0.001,
    });
    await expect(guard.assertCanSpend('org-1')).resolves.toBeUndefined();
  });

  it('fails closed when request count cap is reached', async () => {
    for (let i = 0; i < 3; i++) {
      await repo.create({
        organizationId: 'org-1',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        totalTokens: 1,
        estimatedCost: 0.0001,
      });
    }
    await expect(guard.assertCanSpend('org-1')).rejects.toBeInstanceOf(
      BudgetExceededException,
    );
  });

  it('fails closed when cost cap is reached', async () => {
    await repo.create({
      organizationId: 'org-1',
      provider: 'deepseek',
      model: 'deepseek-v4-pro',
      totalTokens: 50_000,
      estimatedCost: 0.60,
    });
    await expect(guard.assertCanSpend('org-1')).rejects.toBeInstanceOf(
      BudgetExceededException,
    );
  });

  it('does not count budget_blocked rows toward the cap', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.create({
        organizationId: 'org-1',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        totalTokens: 1,
        estimatedCost: 0.0001,
        status: 'budget_blocked',
      });
    }
    await expect(guard.assertCanSpend('org-1')).resolves.toBeUndefined();
  });

  it('is tenant-isolated', async () => {
    for (let i = 0; i < 3; i++) {
      await repo.create({
        organizationId: 'org-1',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        totalTokens: 1,
        estimatedCost: 0.0001,
      });
    }
    // org-1 is over the request cap, org-2 is fresh.
    await expect(guard.assertCanSpend('org-1')).rejects.toBeInstanceOf(
      BudgetExceededException,
    );
    await expect(guard.assertCanSpend('org-2')).resolves.toBeUndefined();
  });
});
