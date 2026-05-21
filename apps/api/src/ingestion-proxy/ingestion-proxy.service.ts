import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface IngestionRunSummary {
  id: string;
  sourceId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  discoveredCount: number;
  capturedCount: number;
  normalisedCount: number;
  enrichedCount: number;
  curationReadyCount: number;
  rejectedCount: number;
  source?: { code: string; name: string };
}

export interface TriggerRunInput {
  sourceCode: string;
  maxPages?: number;
  maxItems?: number;
  syncToAdmin?: boolean;
}

/**
 * Thin HTTP proxy to the bidready-tender-ingestion service. Used by
 * the admin portal's operator UI to list IngestionRuns and trigger
 * new ones without exposing the ingestion service to the browser
 * (would require leaking the trigger token).
 *
 * Config (env):
 *   INGESTION_SERVICE_URL — defaults to http://localhost:8081
 *   INGESTION_TRIGGER_TOKEN — bearer used for every request
 *
 * Failures surface as 503 to the operator rather than the inner
 * HTTP code, since "ingestion service unreachable" is the actionable
 * truth from the admin UI's perspective.
 */
@Injectable()
export class IngestionProxyService {
  private readonly log = new Logger(IngestionProxyService.name);
  private readonly fetchImpl: typeof fetch;

  /**
   * fetchImpl is intentionally NOT a Nest-injected parameter — Nest
   * would try to resolve a token for `Object` and fail at boot. Use
   * the static factory below in tests to inject a stub instead.
   */
  constructor() {
    this.fetchImpl = fetch;
  }

  /** Testing seam: returns a new instance with a stub fetch. */
  static withFetch(fetchImpl: typeof fetch): IngestionProxyService {
    const svc = new IngestionProxyService();
    (svc as unknown as { fetchImpl: typeof fetch }).fetchImpl = fetchImpl;
    return svc;
  }

  private baseUrl(): string {
    return (
      process.env.INGESTION_SERVICE_URL ?? 'http://localhost:8081'
    ).replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    const token = process.env.INGESTION_TRIGGER_TOKEN ?? '';
    if (!token) {
      throw new ServiceUnavailableException(
        'INGESTION_TRIGGER_TOKEN not configured on the admin portal',
      );
    }
    return {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
  }

  async listRecent(limit = 20): Promise<IngestionRunSummary[]> {
    const url = `${this.baseUrl()}/ingestion-runs?limit=${limit}`;
    try {
      const res = await this.fetchImpl(url, { headers: this.headers() });
      if (!res.ok) {
        this.log.warn(`ingestion-runs list HTTP ${res.status}`);
        throw new ServiceUnavailableException(
          `ingestion service returned ${res.status}`,
        );
      }
      const json = (await res.json()) as { runs: IngestionRunSummary[] };
      return json.runs ?? [];
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.log.error(
        `ingestion-runs list threw: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        `ingestion service unreachable: ${(err as Error).message}`,
      );
    }
  }

  async trigger(input: TriggerRunInput): Promise<{
    sourceCode: string;
    runId: string;
    discovered: number;
    captured: number;
    normalised: number;
    enriched: number;
    curationReady: number;
    rejected: number;
  }> {
    const url = `${this.baseUrl()}/ingestion-runs`;
    try {
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.log.warn(
          `ingestion-runs trigger HTTP ${res.status}: ${text.slice(0, 200)}`,
        );
        throw new ServiceUnavailableException(
          `ingestion service returned ${res.status}: ${text.slice(0, 200)}`,
        );
      }
      return (await res.json()) as never;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.log.error(
        `ingestion-runs trigger threw: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        `ingestion service unreachable: ${(err as Error).message}`,
      );
    }
  }
}
