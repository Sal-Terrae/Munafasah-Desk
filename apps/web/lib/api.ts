/**
 * Typed API client surface for the BidReady KSA NestJS backend.
 * Real fetch calls wired in subsequent phases (Phase 8 / auth UI).
 * For MVP, pages render with deterministic fixtures; this module fixes
 * the type contract the UI consumes so swapping in real fetches is
 * a one-line change.
 */

export interface Tender {
  id: string;
  title: string;
  status: string;
  source: string;
  clientCompanyId: string;
  organizationId: string;
}

export interface DocumentSummary {
  id: string;
  filename: string;
  documentType: string;
  sensitivity: string;
  state: string;
  expiresAt: string | null;
}

export interface ComplianceItemSummary {
  requirementId: string;
  requirementText: string;
  category: string;
  owner: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  status: 'missing' | 'partial' | 'satisfied' | 'overridden';
  dueDate: string | null;
}

export interface DashboardData {
  kpis: {
    openTenders: number;
    bidReady: number;
    criticalGaps: number;
    expiringDocs: number;
  };
  tenders: Tender[];
  criticalTasks: ComplianceItemSummary[];
  expiring: DocumentSummary[];
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
