import {
  IngestionPortalService,
  IngestionTenderInput,
} from './ingestion-portal.service';
import { ClientCompanyService } from '../client-company/client-company.service';
import { TenderService } from '../tender/tender.service';
import { AuditService } from '../audit/audit.service';
import { FakeClientCompanyRepository } from '../repositories/fake/fake-client-company.repository';
import { FakeTenderRepository } from '../repositories/fake/fake-tender.repository';
import { FakeTenderRequirementRepository } from '../repositories/fake/fake-tender-requirement.repository';
import { FakeAuditEventRepository } from '../repositories/fake/fake-audit-event.repository';

const ORG = 'org-target';

function makeSvc() {
  const clientCompanyRepo = new FakeClientCompanyRepository();
  const tenderRepo = new FakeTenderRepository();
  const reqRepo = new FakeTenderRequirementRepository();
  const auditRepo = new FakeAuditEventRepository();
  const audit = new AuditService(auditRepo);
  const clientCompanies = new ClientCompanyService(clientCompanyRepo);
  const tenders = new TenderService(tenderRepo);
  const svc = new IngestionPortalService(
    clientCompanies,
    tenders,
    audit,
    reqRepo,
  );
  return { svc, clientCompanies, tenders, reqRepo, auditRepo };
}

const minimalEnrichment = {
  summary: { ar: null, en: null },
  sector: 'construction',
  category: 'Warehouse',
  buyer: { name: 'Ministry of X', type: 'government' },
  deadlines: [],
  requirements: [],
  red_flags: [],
  extraction_confidence: 0.9,
};

const fullPayload: IngestionTenderInput = {
  externalId: 'EXT-1',
  sourceCode: 'etimad',
  title: '  Construction of warehouse near KAFD  ',
  buyerName: 'Ministry of X',
  publishedAt: '2026-05-01T00:00:00Z',
  submissionDeadline: '2026-06-01T00:00:00Z',
  sectorCode: 'construction',
  confidence: 0.92,
  rawText: 'raw text...',
  enrichment: {
    ...minimalEnrichment,
    requirements: [
      {
        category: 'administrative',
        text: 'Commercial registration copy',
        mandatory: true,
        confidence: 0.9,
      },
      {
        category: 'financial',
        text: 'Bank guarantee 5%',
        mandatory: true,
        confidence: 0.85,
      },
      {
        category: 'bad-category', // unknown → dropped
        text: 'Something weird',
        confidence: 0.5,
      },
      {
        category: 'technical',
        text: '   ', // blank → dropped
        confidence: 0.5,
      },
    ],
  },
};

describe('IngestionPortalService.ingest', () => {
  it('creates a Tender + auto-creates the buyer ClientCompany + writes audit', async () => {
    const ctx = makeSvc();
    const r = await ctx.svc.ingest(ORG, fullPayload);
    expect(r.tender.title).toBe('Construction of warehouse near KAFD');
    expect(r.tender.organizationId).toBe(ORG);
    expect(r.clientCompany.name).toBe('Ministry of X');
    expect(r.tender.clientCompanyId).toBe(r.clientCompany.id);
    expect(r.tender.source).toBe('ingestion');
    // Sector classification persisted from the enrichment payload.
    expect(r.tender.sector).toBe('construction');
    expect(r.tender.sectorCategory).toBe('Warehouse');
    expect(Number(r.tender.sectorConfidence)).toBeCloseTo(0.92);
    expect(r.tender.sectorModel).toBe('upstream-ingestion');
    const audits = Array.from(
      (ctx.auditRepo as unknown as { records: Map<string, { action: string }> })
        .records.values(),
    );
    expect(
      audits.some((a) => a.action === 'tender.ingested_from_pipeline'),
    ).toBe(true);
    expect(
      audits.some(
        (a) => a.action === 'client_company.auto_created_from_ingestion',
      ),
    ).toBe(true);
  });

  it('reuses an existing ClientCompany when the buyer name matches (case-insensitive)', async () => {
    const ctx = makeSvc();
    const first = await ctx.clientCompanies.create('Ministry of X', ORG);
    const r = await ctx.svc.ingest(ORG, fullPayload);
    expect(r.clientCompany.id).toBe(first.id);
    const audits = Array.from(
      (ctx.auditRepo as unknown as { records: Map<string, { action: string }> })
        .records.values(),
    );
    expect(
      audits.some(
        (a) => a.action === 'client_company.auto_created_from_ingestion',
      ),
    ).toBe(false);
  });

  it('persists only valid requirements, dropping unknown category + blank text', async () => {
    const ctx = makeSvc();
    const r = await ctx.svc.ingest(ORG, fullPayload);
    expect(r.requirementsCreated).toBe(2);
    expect(r.requirements.map((x) => x.category).sort()).toEqual([
      'administrative',
      'financial',
    ]);
    // mandatory: true is mapped to risk='critical'.
    for (const req of r.requirements) {
      expect(req.risk).toBe('critical');
      expect(req.source).toBe('ingestion');
    }
  });

  it('falls back to "Unknown Buyer" when buyerName is missing', async () => {
    const ctx = makeSvc();
    const r = await ctx.svc.ingest(ORG, {
      ...fullPayload,
      buyerName: null,
    });
    expect(r.clientCompany.name).toBe('Unknown Buyer');
  });

  it('skips sector persistence when sectorCode is null', async () => {
    const ctx = makeSvc();
    const r = await ctx.svc.ingest(ORG, {
      ...fullPayload,
      sectorCode: null,
    });
    expect(r.tender.sector).toBeNull();
    expect(r.tender.sectorModel).toBeNull();
  });
});
