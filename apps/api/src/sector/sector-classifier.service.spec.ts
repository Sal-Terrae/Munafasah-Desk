import { SectorClassifierService } from './sector-classifier.service';
import { TenderService } from '../tender/tender.service';
import { AuditService } from '../audit/audit.service';
import { BudgetGuardService } from '../providers/llm/budget-guard.service';
import { BudgetExceededException } from '../providers/llm/budget-exceeded.exception';
import { LlmUsageService } from '../providers/llm/llm-usage.service';
import { UsageCounterService } from '../billing/usage-counter.service';
import { MockLlmProvider } from '../providers/llm/mock.llm.provider';
import { FakeTenderRepository } from '../repositories/fake/fake-tender.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';
import { FakeLlmUsageLogRepository } from '../repositories/fake/fake-llm-usage-log.repository';
import { FakeUsageCounterRepository } from '../repositories/fake/fake-usage-counter.repository';

async function makeCtx(opts: {
  jsonResponse?: unknown;
  budgetCaps?: { requests: number; cost: number };
} = {}) {
  // Cap config is read by BudgetGuardService via env at construction.
  process.env.LLM_DAILY_MAX_REQUESTS = String(
    opts.budgetCaps?.requests ?? 1000,
  );
  process.env.LLM_DAILY_MAX_COST_USD = String(
    opts.budgetCaps?.cost ?? 10,
  );

  const tenderRepo = new FakeTenderRepository();
  const auditRepo = new FakeAuditEventRepository();
  const llmUsageRepo = new FakeLlmUsageLogRepository();
  const counterRepo = new FakeUsageCounterRepository();
  const tenders = new TenderService(tenderRepo);
  const audit = new AuditService(auditRepo);
  const llm = new MockLlmProvider({
    jsonResponse:
      opts.jsonResponse ?? {
        sector: 'construction',
        category: 'Warehouse construction',
        confidence: 0.92,
      },
  });
  const budget = new BudgetGuardService(llmUsageRepo);
  const usage = new LlmUsageService(llmUsageRepo);
  const counters = new UsageCounterService(counterRepo);
  const svc = new SectorClassifierService(
    tenders,
    audit,
    llm,
    budget,
    usage,
    counters,
  );
  const tender = await tenders.intake(
    'Construction of warehouse near KAFD',
    'cc-1',
    'org-1',
  );
  return { svc, tenders, audit, llm, budget, usage, counters, tender, auditRepo, llmUsageRepo, counterRepo };
}

describe('SectorClassifierService.classify', () => {
  afterAll(() => {
    delete process.env.LLM_DAILY_MAX_REQUESTS;
    delete process.env.LLM_DAILY_MAX_COST_USD;
  });

  it('runs the LLM, persists the classification + audit + counters', async () => {
    const ctx = await makeCtx();
    const r = await ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1');
    expect(r.cached).toBe(false);
    expect(r.classification.sector).toBe('construction');
    expect(r.classification.confidence).toBe(0.92);

    // Persisted on Tender.
    const fresh = await ctx.tenders.get(ctx.tender.id, 'org-1');
    expect(fresh.sector).toBe('construction');
    expect(fresh.sectorCategory).toBe('Warehouse construction');
    expect(Number(fresh.sectorConfidence)).toBeCloseTo(0.92);
    expect(fresh.sectorInputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fresh.sectorClassifiedAt).not.toBeNull();

    // Usage row created (mock provider → cost 0).
    expect(ctx.llmUsageRepo.rows).toHaveLength(1);
    expect(ctx.llmUsageRepo.rows[0].provider).toBe('mock');

    // Daily counters bumped.
    const today = await ctx.counters.today('org-1');
    expect(today.byMetric.llm_requests).toBe(1);

    // Audit event.
    const audits = Array.from(
      (ctx.auditRepo as unknown as { records: Map<string, { action: string }> })
        .records.values(),
    );
    expect(
      audits.some((a) => a.action === 'tender.sector.classified'),
    ).toBe(true);
  });

  it('caches on second call when input hash matches', async () => {
    const ctx = await makeCtx();
    await ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1');
    const llmCallsAfterFirst = ctx.llm.calls.length;
    const second = await ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1');
    expect(second.cached).toBe(true);
    expect(ctx.llm.calls.length).toBe(llmCallsAfterFirst); // no new LLM call
  });

  it('reruns when forceRerun=true', async () => {
    const ctx = await makeCtx();
    await ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1');
    const second = await ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1', {
      forceRerun: true,
    });
    expect(second.cached).toBe(false);
    expect(ctx.llm.calls.length).toBe(2);
  });

  it('cache invalidates when the title changes', async () => {
    const ctx = await makeCtx();
    await ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1');
    // Update the title — input hash diverges.
    await ctx.tenders.updateStatus(ctx.tender.id, 'org-1', 'review');
    await (ctx.tenders as unknown as {
      repo: { update: Function };
    }).repo.update(ctx.tender.id, 'org-1', {
      title: 'Healthcare IT system implementation',
    });
    const ctx2llm = new MockLlmProvider({
      jsonResponse: {
        sector: 'it_software',
        category: 'Healthcare records system',
        confidence: 0.81,
      },
    });
    // Re-bind the classifier with a different mock so we can detect the
    // call independently. (Re-use deps from ctx where possible.)
    const svc2 = new SectorClassifierService(
      ctx.tenders,
      ctx.audit,
      ctx2llm,
      ctx.budget,
      ctx.usage,
      ctx.counters,
    );
    const out = await svc2.classify(ctx.tender.id, 'org-1', 'admin-1');
    expect(out.cached).toBe(false);
    expect(out.classification.sector).toBe('it_software');
    expect(ctx2llm.calls.length).toBe(1);
  });

  it('throws BudgetExceededException when over the daily cap', async () => {
    const ctx = await makeCtx({ budgetCaps: { requests: 0, cost: 100 } });
    // Cap is 0 requests/day → first call should be blocked.
    await expect(
      ctx.svc.classify(ctx.tender.id, 'org-1', 'admin-1'),
    ).rejects.toBeInstanceOf(BudgetExceededException);
  });
});

describe('SectorClassifierService.override', () => {
  it('persists a human override + writes audit', async () => {
    const ctx = await makeCtx();
    const updated = await ctx.svc.override(
      ctx.tender.id,
      'org-1',
      'admin-1',
      { sector: 'healthcare', category: 'Hospital MRI procurement' },
    );
    expect(updated.sector).toBe('healthcare');
    expect(updated.sectorModel).toBe('human-override');
    // Cache hash cleared so a future classify() will rerun.
    expect(updated.sectorInputHash).toBeNull();
    const audits = Array.from(
      (ctx.auditRepo as unknown as { records: Map<string, { action: string }> })
        .records.values(),
    );
    expect(
      audits.some((a) => a.action === 'tender.sector.override'),
    ).toBe(true);
  });
});
