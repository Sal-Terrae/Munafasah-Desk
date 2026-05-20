/**
 * Typed API client surface for the BidReady KSA NestJS backend.
 *
 * Auth model: an HttpOnly `bidready_session` cookie set by the backend on
 * `POST /auth/login`. The backend's `JwtStrategy` accepts the cookie OR
 * `Authorization: Bearer`; the web only uses cookies.
 *
 * `apiFetch` works in both Server Components and the browser:
 * - browser → `credentials: 'include'` so the cookie is auto-sent.
 * - server  → reads `next/headers` `cookies()` and forwards the same
 *   cookie to the API. We don't import `next/headers` at the top level
 *   so the client bundle stays clean.
 */

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export const SESSION_COOKIE = 'bidready_session';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

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

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

async function serverCookieHeader(): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    return undefined;
  }
  // Dynamic import keeps `next/headers` out of the client bundle.
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const session = store.get(SESSION_COOKIE);
  return session ? `${session.name}=${session.value}` : undefined;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const isServer = typeof window === 'undefined';
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (isServer) {
    const cookie = await serverCookieHeader();
    if (cookie) {
      headers.set('cookie', cookie);
    }
  }
  const init: RequestInit = {
    ...options,
    headers,
    cache: 'no-store',
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  };
  if (!isServer) {
    init.credentials = 'include';
  }
  const res = await fetch(`${apiBaseUrl}${path}`, init);
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** Server-side: try to load the current user; null when unauthenticated. */
export async function loadCurrentUser(): Promise<PublicUser | null> {
  try {
    return await apiFetch<PublicUser>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

// ---------- Tender workflow types ----------

export interface ClientCompany {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenderRequirement {
  id: string;
  tenderId: string;
  organizationId: string;
  category: string;
  text: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  owner: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceMatrixRow {
  id: string;
  tenderId: string;
  organizationId: string;
  version: number;
  status: string;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceItem {
  id: string;
  matrixId: string;
  organizationId: string;
  requirementId: string;
  requirementText: string;
  category: string;
  owner: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  status: 'missing' | 'partial' | 'satisfied' | 'overridden';
  dueDate: string | null;
}

export interface MatrixWithItems {
  matrix: ComplianceMatrixRow;
  items: ComplianceItem[];
}

export interface TenderAccess {
  id: string;
  organizationId: string;
  userId: string;
  tenderId: string;
  role: 'Owner' | 'Editor' | 'Reviewer' | 'Viewer';
  grantedBy: string | null;
  grantedAt: string;
}

export const tenderApi = {
  listClients: () => apiFetch<ClientCompany[]>('/client-companies'),
  createClient: (name: string) =>
    apiFetch<ClientCompany>('/client-companies', {
      method: 'POST',
      body: { name },
    }),

  listTenders: () => apiFetch<Tender[]>('/tenders'),
  createTender: (input: {
    title: string;
    clientCompanyId: string;
    source?: string;
  }) => apiFetch<Tender>('/tenders', { method: 'POST', body: input }),
  getTender: (id: string) =>
    apiFetch<Tender>(`/tenders/${encodeURIComponent(id)}`),
  setTenderStatus: (id: string, status: string) =>
    apiFetch<Tender>(`/tenders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  deleteTender: (id: string) =>
    apiFetch<void>(`/tenders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listRequirements: (tenderId: string) =>
    apiFetch<TenderRequirement[]>(
      `/tenders/${encodeURIComponent(tenderId)}/requirements`,
    ),
  bulkAddRequirements: (
    tenderId: string,
    requirements: Array<{
      category: string;
      text: string;
      risk?: 'low' | 'medium' | 'high' | 'critical';
      owner?: string | null;
    }>,
  ) =>
    apiFetch<TenderRequirement[]>(
      `/tenders/${encodeURIComponent(tenderId)}/requirements`,
      { method: 'POST', body: { requirements } },
    ),

  listMatrices: (tenderId: string) =>
    apiFetch<ComplianceMatrixRow[]>(
      `/tenders/${encodeURIComponent(tenderId)}/compliance-matrices`,
    ),
  getMatrix: (tenderId: string, version: number) =>
    apiFetch<MatrixWithItems>(
      `/tenders/${encodeURIComponent(tenderId)}/compliance-matrices/${version}`,
    ),
  generateMatrix: (tenderId: string) =>
    apiFetch<{
      matrix: { id: string; tenderId: string; version: number };
      tasks: unknown[];
      exportGate: { allowed: boolean; blocking: unknown[] };
    }>(`/tenders/${encodeURIComponent(tenderId)}/compliance-matrices`, {
      method: 'POST',
      body: { requirements: [] }, // empty → auto-load persisted TenderRequirements
    }),

  listAccess: (tenderId: string) =>
    apiFetch<TenderAccess[]>(
      `/tenders/${encodeURIComponent(tenderId)}/access`,
    ),
  grantAccess: (
    tenderId: string,
    input: {
      userId: string;
      role: 'Owner' | 'Editor' | 'Reviewer' | 'Viewer';
    },
  ) =>
    apiFetch<TenderAccess>(
      `/tenders/${encodeURIComponent(tenderId)}/access`,
      { method: 'POST', body: input },
    ),
  revokeAccess: (tenderId: string, userId: string) =>
    apiFetch<{ removed: boolean }>(
      `/tenders/${encodeURIComponent(tenderId)}/access/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    ),
};

// ---------- Admin types ----------

export interface DpoContact {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string | null;
  authorityEmail: string;
  retentionPolicyDays: number;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDpoContactInput {
  name: string;
  email: string;
  phone?: string | null;
  authorityEmail: string;
  retentionPolicyDays?: number;
}

export type DataSubjectRequestType = 'access' | 'erasure' | 'rectification';
export type DataSubjectRequestStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'completed';

export interface DataSubjectRequest {
  id: string;
  organizationId: string;
  type: DataSubjectRequestType;
  subjectEmail: string;
  status: DataSubjectRequestStatus;
  requestedBy: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
}

export type RetentionActionStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'executed';
export type RetentionActionType = 'destroy' | 'archive';

export interface RetentionAction {
  id: string;
  organizationId: string;
  documentId: string;
  action: RetentionActionType;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: RetentionActionStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentEvent {
  id: string;
  organizationId: string;
  subjectEmail: string;
  subjectUserId: string | null;
  purpose: string;
  state: 'granted' | 'withdrawn';
  source: string;
  recordedBy: string | null;
  recordedAt: string;
}

export type IngestionKind = 'etimad' | 'upload' | 'email' | 'link';
export type IngestionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface IngestionJob {
  id: string;
  organizationId: string;
  kind: IngestionKind;
  status: IngestionStatus;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  attempts: number;
  claimedBy: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Admin fetchers ----------

export const adminApi = {
  // DPO contact
  getDpoContact: () =>
    apiFetch<DpoContact | null>('/dpo-contact').catch((err) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }),
  upsertDpoContact: (input: UpsertDpoContactInput) =>
    apiFetch<DpoContact>('/dpo-contact', { method: 'PUT', body: input }),

  // Data subject requests
  listDataSubjectRequests: (status?: DataSubjectRequestStatus) =>
    apiFetch<DataSubjectRequest[]>(
      `/data-subject-requests${status ? `?status=${status}` : ''}`,
    ),
  createDataSubjectRequest: (input: {
    type: DataSubjectRequestType;
    subjectEmail: string;
    notes?: string;
  }) =>
    apiFetch<DataSubjectRequest>('/data-subject-requests', {
      method: 'POST',
      body: input,
    }),
  approveDataSubjectRequest: (id: string) =>
    apiFetch<DataSubjectRequest>(`/data-subject-requests/${id}/approve`, {
      method: 'POST',
    }),
  denyDataSubjectRequest: (id: string, notes?: string) =>
    apiFetch<DataSubjectRequest>(`/data-subject-requests/${id}/deny`, {
      method: 'POST',
      body: notes ? { notes } : {},
    }),
  executeDataSubjectRequest: (id: string) =>
    apiFetch<{ request: DataSubjectRequest; snapshot?: unknown; erasure?: unknown }>(
      `/data-subject-requests/${id}/execute`,
      { method: 'POST' },
    ),

  // Retention actions
  listRetentionActions: (status?: RetentionActionStatus) =>
    apiFetch<RetentionAction[]>(
      `/retention-actions${status ? `?status=${status}` : ''}`,
    ),
  approveRetention: (id: string) =>
    apiFetch<RetentionAction>(`/retention-actions/${id}/approve`, {
      method: 'POST',
    }),
  denyRetention: (id: string) =>
    apiFetch<RetentionAction>(`/retention-actions/${id}/deny`, {
      method: 'POST',
    }),
  manualSweep: () =>
    apiFetch<{ docsScanned: number; created: number }>(
      '/retention-actions/sweep',
      { method: 'POST' },
    ),

  // Consent ledger
  listConsentForSubject: (subjectEmail: string) =>
    apiFetch<ConsentEvent[]>(
      `/consent-events?subjectEmail=${encodeURIComponent(subjectEmail)}`,
    ),
  checkConsent: (subjectEmail: string, purpose: string) =>
    apiFetch<{
      subjectEmail: string;
      purpose: string;
      state: 'granted' | 'withdrawn' | null;
    }>(
      `/consent-events/check?subjectEmail=${encodeURIComponent(subjectEmail)}&purpose=${encodeURIComponent(purpose)}`,
    ),
  recordConsent: (input: {
    subjectEmail: string;
    purpose: string;
    state: 'granted' | 'withdrawn';
    source?: string;
  }) =>
    apiFetch<ConsentEvent>('/consent-events', {
      method: 'POST',
      body: input,
    }),

  // Ingestion
  listIngestions: (status?: IngestionStatus, kind?: IngestionKind) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (kind) params.set('kind', kind);
    const qs = params.toString();
    return apiFetch<IngestionJob[]>(
      `/ingestions${qs ? `?${qs}` : ''}`,
    );
  },
  enqueueIngestion: (input: {
    kind: IngestionKind;
    payload: Record<string, unknown>;
  }) =>
    apiFetch<IngestionJob>('/ingestions', { method: 'POST', body: input }),
};
