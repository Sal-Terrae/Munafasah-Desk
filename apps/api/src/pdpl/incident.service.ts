import { Injectable } from '@nestjs/common';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'detected' | 'reported' | 'resolved';

export interface Incident {
  id: string;
  severity: Severity;
  kind: string;
  summary: string;
  detectedAt: Date;
  reportedAt?: Date;
  resolvedAt?: Date;
  status: IncidentStatus;
}

const SEVERE: ReadonlySet<Severity> = new Set(['high', 'critical']);

@Injectable()
export class IncidentService {
  private counter = 0;
  private readonly events = new Map<string, Incident>();

  create(
    severity: Severity,
    kind: string,
    summary: string,
    detectedAt: Date = new Date(),
  ): Incident {
    const id = `inc-${++this.counter}`;
    const inc: Incident = {
      id,
      severity,
      kind,
      summary,
      detectedAt,
      status: 'detected',
    };
    this.events.set(id, inc);
    return inc;
  }

  report(id: string, reportedAt: Date = new Date()): Incident {
    const inc = this.events.get(id);
    if (!inc) throw new Error('incident not found');
    inc.reportedAt = reportedAt;
    inc.status = 'reported';
    return inc;
  }

  resolve(id: string, resolvedAt: Date = new Date()): Incident {
    const inc = this.events.get(id);
    if (!inc) throw new Error('incident not found');
    inc.resolvedAt = resolvedAt;
    inc.status = 'resolved';
    return inc;
  }

  /** PDPL: severe incidents must be reported to the authority within 72h. */
  requiresAuthorityNotification(inc: Incident, now: Date = new Date()): boolean {
    if (!SEVERE.has(inc.severity)) return false;
    if (!inc.reportedAt) {
      return now.getTime() - inc.detectedAt.getTime() > 72 * 3_600_000;
    }
    return inc.reportedAt.getTime() - inc.detectedAt.getTime() > 72 * 3_600_000;
  }
}
