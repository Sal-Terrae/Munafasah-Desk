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
