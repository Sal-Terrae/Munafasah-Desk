import { Injectable } from '@nestjs/common';

export interface ComplianceRequirement {
  id: string;
  text: string;
  category: string; // e.g. legal | financial | technical | admin
  critical: boolean;
}

export interface EvidenceDoc {
  id: string;
  documentType: string;
  state: string; // active | expiring | restricted | archived
  expiresAt: Date | null;
}

export type ItemStatus =
  | 'missing'
  | 'partial'
  | 'satisfied'
  | 'overridden';
export type Risk = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceItem {
  requirementId: string;
  requirementText: string;
  category: string;
  evidenceDocId: string | null;
  owner: string;
  dueDate: string | null; // ISO date
  risk: Risk;
  status: ItemStatus;
}

export interface ComplianceMatrix {
  tenderId: string;
  version: number;
  generatedAt: string;
  items: ComplianceItem[];
}

// Deterministic category -> (expected doc type, default owner role).
const CATEGORY_RULES: Record<
  string,
  { docType: string; owner: string }
> = {
  legal: { docType: 'legal', owner: 'DocController' },
  financial: { docType: 'financial', owner: 'Finance' },
  technical: { docType: 'technical', owner: 'Presales' },
  admin: { docType: 'admin', owner: 'BidManager' },
};
const DEFAULT_RULE = { docType: 'other', owner: 'BidManager' };

export interface GenerateOpts {
  now?: Date;
  dueDate?: string | null;
  previousVersion?: number;
}

@Injectable()
export class ComplianceService {
  generateMatrix(
    tenderId: string,
    requirements: ComplianceRequirement[],
    vault: EvidenceDoc[],
    opts: GenerateOpts = {},
  ): ComplianceMatrix {
    const now = opts.now ?? new Date();
    const items = requirements.map((req) =>
      this.buildItem(req, vault, now, opts.dueDate ?? null),
    );
    return {
      tenderId,
      version: (opts.previousVersion ?? 0) + 1,
      generatedAt: now.toISOString(),
      items,
    };
  }

  private buildItem(
    req: ComplianceRequirement,
    vault: EvidenceDoc[],
    now: Date,
    dueDate: string | null,
  ): ComplianceItem {
    const rule = CATEGORY_RULES[req.category] ?? DEFAULT_RULE;
    const candidates = vault.filter(
      (d) => d.documentType === rule.docType && d.state !== 'restricted',
    );
    const active = candidates.find(
      (d) =>
        d.state !== 'archived' &&
        (d.expiresAt === null || d.expiresAt > now),
    );
    const expired = candidates.find(
      (d) => d.expiresAt !== null && d.expiresAt <= now,
    );

    let status: ItemStatus;
    let evidenceDocId: string | null;
    if (active) {
      status = 'satisfied';
      evidenceDocId = active.id;
    } else if (expired) {
      status = 'partial'; // expiry-aware downgrade
      evidenceDocId = expired.id;
    } else {
      status = 'missing';
      evidenceDocId = null;
    }

    const risk: Risk =
      status === 'satisfied'
        ? 'low'
        : status === 'partial'
          ? 'medium'
          : req.critical
            ? 'critical'
            : 'high';

    return {
      requirementId: req.id,
      requirementText: req.text,
      category: req.category,
      evidenceDocId,
      owner: rule.owner,
      dueDate,
      risk,
      status,
    };
  }

  /**
   * Critical, not-satisfied items block readiness export unless their
   * requirementId is explicitly overridden.
   */
  exportGate(
    matrix: ComplianceMatrix,
    overriddenRequirementIds: string[] = [],
  ): { allowed: boolean; blocking: ComplianceItem[] } {
    const overrides = new Set(overriddenRequirementIds);
    const blocking = matrix.items.filter(
      (i) =>
        i.risk === 'critical' &&
        i.status !== 'satisfied' &&
        !overrides.has(i.requirementId),
    );
    return { allowed: blocking.length === 0, blocking };
  }

  deriveTasks(matrix: ComplianceMatrix): Array<{
    title: string;
    owner: string;
    dueDate: string | null;
    severity: Risk;
    requirementId: string;
  }> {
    return matrix.items
      .filter((i) => i.status !== 'satisfied' && i.status !== 'overridden')
      .map((i) => ({
        title: `Provide evidence: ${i.requirementText}`,
        owner: i.owner,
        dueDate: i.dueDate,
        severity: i.risk,
        requirementId: i.requirementId,
      }));
  }
}
