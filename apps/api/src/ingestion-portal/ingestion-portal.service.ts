import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientCompany, Tender, TenderRequirement } from '@prisma/client';
import { ClientCompanyService } from '../client-company/client-company.service';
import { TenderService } from '../tender/tender.service';
import { AuditService } from '../audit/audit.service';
import { ITenderRequirementRepository } from '../repositories/interfaces/tender-requirement.repository.interface';
import { TENDER_REQUIREMENT_REPOSITORY } from '../repositories/tokens';

export interface IngestionRequirementInput {
  category: string;
  text: string;
  mandatory?: boolean | null;
  confidence?: number;
  source_text?: string | null;
}

export interface IngestionTenderInput {
  externalId: string | null;
  sourceCode: string;
  title: string;
  buyerName: string | null;
  publishedAt: string | null;
  submissionDeadline: string | null;
  sectorCode: string | null;
  confidence: number;
  rawText: string;
  enrichment: {
    summary?: { ar?: string | null; en?: string | null };
    sector?: string | null;
    category?: string | null;
    buyer?: { name?: string | null; type?: string | null };
    deadlines?: Array<{
      type: string;
      date: string | null;
      confidence: number;
      source_text?: string | null;
    }>;
    requirements?: IngestionRequirementInput[];
    red_flags?: Array<{
      type: string;
      severity: string;
      note: string;
    }>;
    extraction_confidence?: number;
  };
}

export interface IngestionResult {
  tender: Tender;
  clientCompany: ClientCompany;
  requirementsCreated: number;
  requirements: TenderRequirement[];
}

const ALLOWED_REQUIREMENT_CATEGORIES = new Set([
  'administrative',
  'technical',
  'financial',
  'legal',
  'commercial',
  'experience',
  'certification',
  'insurance',
  'local_content',
  'submission_format',
  'other',
]);

/**
 * Server-to-server ingestion entry point. Accepts an enriched tender
 * payload from the bidready-tender-ingestion service and projects it
 * into the admin portal's Tender + TenderRequirement + (auto-created)
 * ClientCompany rows.
 *
 * No de-dup logic here yet — the ingestion service is responsible for
 * not re-syncing the same tender twice. The bidready-tender-ingestion
 * pipeline already does sha256-based dedup of raw captures upstream.
 */
@Injectable()
export class IngestionPortalService {
  private readonly log = new Logger(IngestionPortalService.name);

  constructor(
    private readonly clientCompanies: ClientCompanyService,
    private readonly tenders: TenderService,
    private readonly audit: AuditService,
    @Inject(TENDER_REQUIREMENT_REPOSITORY)
    private readonly requirementsRepo: ITenderRequirementRepository,
  ) {}

  async ingest(
    organizationId: string,
    input: IngestionTenderInput,
  ): Promise<IngestionResult> {
    const clientCompany = await this.upsertBuyerCompany(
      organizationId,
      input.buyerName,
    );
    const tender = await this.tenders.intake(
      input.title.trim(),
      clientCompany.id,
      organizationId,
      'ingestion' as never, // existing TenderSource enum is loose
    );
    // Persist sector classification directly from the LLM output
    // (no need to re-run the classifier — it already executed
    // upstream). The hash is null because we don't keep a copy of
    // the source title here for cache-matching.
    if (input.sectorCode) {
      await this.tenders.persistSectorClassification(
        tender.id,
        organizationId,
        {
          sector: input.sectorCode,
          sectorCategory: input.enrichment.category ?? null,
          sectorConfidence: input.confidence,
          sectorInputHash: null,
          sectorModel: 'upstream-ingestion',
        },
      );
    }

    const requirements = await this.persistRequirements(
      tender.id,
      organizationId,
      input.enrichment.requirements ?? [],
    );

    await this.audit.record({
      action: 'tender.ingested_from_pipeline',
      entityType: 'Tender',
      entityId: tender.id,
      userId: null,
      organizationId,
      details: {
        sourceCode: input.sourceCode,
        externalId: input.externalId,
        sectorCode: input.sectorCode,
        confidence: input.confidence,
        requirementsCreated: requirements.length,
        clientCompanyId: clientCompany.id,
      },
    });
    this.log.log(
      `ingested tender=${tender.id} from source=${input.sourceCode} external=${input.externalId ?? '(none)'}`,
    );

    // Re-fetch so the response includes the persisted sector fields.
    const persisted = await this.tenders.get(tender.id, organizationId);
    return {
      tender: persisted,
      clientCompany,
      requirementsCreated: requirements.length,
      requirements,
    };
  }

  private async upsertBuyerCompany(
    organizationId: string,
    buyerName: string | null,
  ): Promise<ClientCompany> {
    const name = (buyerName ?? 'Unknown Buyer').trim() || 'Unknown Buyer';
    const all = await this.clientCompanies.list(organizationId);
    const lower = name.toLowerCase();
    const existing = all.find(
      (c) => c.name.toLowerCase().trim() === lower,
    );
    if (existing) return existing;
    const created = await this.clientCompanies.create(name, organizationId);
    await this.audit.record({
      action: 'client_company.auto_created_from_ingestion',
      entityType: 'ClientCompany',
      entityId: created.id,
      userId: null,
      organizationId,
      details: { name },
    });
    return created;
  }

  private async persistRequirements(
    tenderId: string,
    organizationId: string,
    incoming: IngestionRequirementInput[],
  ): Promise<TenderRequirement[]> {
    if (!incoming.length) return [];
    const accepted = incoming.filter(
      (r) => r.text?.trim() && ALLOWED_REQUIREMENT_CATEGORIES.has(r.category),
    );
    if (!accepted.length) return [];
    return this.requirementsRepo.createMany(
      accepted.map((r) => ({
        tenderId,
        organizationId,
        category: r.category,
        text: r.text.trim(),
        risk:
          typeof r.mandatory === 'boolean'
            ? r.mandatory
              ? 'critical'
              : 'standard'
            : 'standard',
        source: 'ingestion',
      })),
    );
  }
}
