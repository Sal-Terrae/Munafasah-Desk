import type { DashboardData, Tender } from './api';

/** Deterministic fixtures so the dashboard renders without a backend
 * during build. Replaced with real fetches in a later phase. */
export const dashboardFixture: DashboardData = {
  kpis: {
    openTenders: 8,
    bidReady: 3,
    criticalGaps: 2,
    expiringDocs: 4,
  },
  tenders: [
    {
      id: 't-1',
      title: 'MOH RFP — Medical Equipment',
      status: 'review',
      source: 'email',
      clientCompanyId: 'cc-moh',
      organizationId: 'org-1',
    },
    {
      id: 't-2',
      title: 'Aramco — IT Services Renewal',
      status: 'intake',
      source: 'manual',
      clientCompanyId: 'cc-aramco',
      organizationId: 'org-1',
    },
  ],
  criticalTasks: [
    {
      requirementId: 'r-1',
      requirementText: 'Valid CR & Zakat',
      category: 'legal',
      owner: 'DocController',
      risk: 'critical',
      status: 'missing',
      dueDate: '2026-05-22',
    },
    {
      requirementId: 'r-2',
      requirementText: 'Bid bond',
      category: 'financial',
      owner: 'Finance',
      risk: 'critical',
      status: 'missing',
      dueDate: '2026-05-24',
    },
  ],
  expiring: [
    {
      id: 'd-1',
      filename: 'zakat-certificate.pdf',
      documentType: 'financial',
      sensitivity: 'medium',
      state: 'expiring',
      expiresAt: '2026-06-14',
    },
  ],
};

export const tenderFixture: Record<string, Tender> = {
  't-1': dashboardFixture.tenders[0],
  't-2': dashboardFixture.tenders[1],
};
