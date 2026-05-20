import { LlmUsageService } from './llm-usage.service';
import { FakeLlmUsageLogRepository } from '../../repositories/fake/fake-llm-usage-log.repository';

describe('LlmUsageService', () => {
  let repo: FakeLlmUsageLogRepository;
  let svc: LlmUsageService;

  beforeEach(() => {
    repo = new FakeLlmUsageLogRepository();
    svc = new LlmUsageService(repo);
  });

  it('records ok with computed deepseek-flash cost', async () => {
    await svc.recordOk({
      organizationId: 'org-1',
      jobType: 'enrich',
      result: {
        output: '',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        usage: {
          inputTokens: 1000,
          outputTokens: 1000,
          totalTokens: 2000,
        },
      },
    });
    expect(repo.rows).toHaveLength(1);
    const row = repo.rows[0];
    expect(row.provider).toBe('deepseek');
    expect(row.status).toBe('ok');
    // 1000/1000 * 0.00014 + 1000/1000 * 0.00028 = 0.00042
    expect(Number(row.estimatedCost)).toBeCloseTo(0.00042, 5);
  });

  it('records zero cost for mock provider', async () => {
    await svc.recordOk({
      organizationId: 'org-1',
      result: {
        output: '',
        provider: 'mock',
        model: 'mock-json',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    });
    expect(repo.rows[0].estimatedCost).toBeNull();
  });

  it('uses pro rate when model contains "pro"', async () => {
    await svc.recordOk({
      organizationId: 'org-1',
      result: {
        output: '',
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        usage: { inputTokens: 1000, outputTokens: 1000, totalTokens: 2000 },
      },
    });
    // 1000/1000 * 0.0014 + 1000/1000 * 0.0028 = 0.0042
    expect(Number(repo.rows[0].estimatedCost)).toBeCloseTo(0.0042, 4);
  });

  it('records budget_blocked status', async () => {
    await svc.recordBlocked(
      'org-1',
      'deepseek',
      'deepseek-v4-flash',
      'daily request cap',
    );
    expect(repo.rows[0].status).toBe('budget_blocked');
    expect(repo.rows[0].errorMessage).toBe('daily request cap');
  });

  it('truncates long error messages', async () => {
    const longMsg = 'x'.repeat(700);
    await svc.recordError('org-1', 'deepseek', 'deepseek-v4-flash', longMsg);
    expect(repo.rows[0].errorMessage?.length).toBe(500);
  });
});
