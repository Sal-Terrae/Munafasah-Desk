import { Injectable } from '@nestjs/common';

export interface RetentionInputs {
  state: string;
  expiresAt: Date | null;
  retentionPolicyEndsAt?: Date | null;
}

export type RetentionAction =
  | 'keep'
  | 'flag-expired'
  | 'eligible-for-destruction';

export interface RetentionRequest {
  id: string;
  documentId: string;
  requestor: string;
  status: 'pending' | 'approved' | 'denied';
  reason: string;
  decidedBy?: string;
}

export class RetentionError extends Error {}

@Injectable()
export class RetentionService {
  private counter = 0;
  private readonly requests = new Map<string, RetentionRequest>();

  /** Pure deterministic policy. */
  evaluate(
    doc: RetentionInputs,
    now: Date = new Date(),
  ): { action: RetentionAction; reason: string } {
    if (doc.retentionPolicyEndsAt && doc.retentionPolicyEndsAt <= now) {
      return {
        action: 'eligible-for-destruction',
        reason: 'retention policy elapsed',
      };
    }
    if (doc.expiresAt && doc.expiresAt <= now && doc.state !== 'archived') {
      return { action: 'flag-expired', reason: 'document expired' };
    }
    return { action: 'keep', reason: 'within retention window' };
  }

  /** Approval-gated destruction. Requestor and approver MUST differ. */
  requestDestroy(documentId: string, requestor: string, reason: string): RetentionRequest {
    if (!documentId || !requestor || !reason.trim()) {
      throw new RetentionError('documentId, requestor and reason are required');
    }
    const id = `rr-${++this.counter}`;
    const req: RetentionRequest = {
      id,
      documentId,
      requestor,
      reason: reason.trim(),
      status: 'pending',
    };
    this.requests.set(id, req);
    return req;
  }

  approveDestroy(requestId: string, approver: string): RetentionRequest {
    const req = this.requests.get(requestId);
    if (!req) throw new RetentionError('request not found');
    if (req.status !== 'pending') {
      throw new RetentionError(`cannot approve from status ${req.status}`);
    }
    if (!approver || approver === req.requestor) {
      throw new RetentionError('approver must differ from requestor');
    }
    req.status = 'approved';
    req.decidedBy = approver;
    return req;
  }

  denyDestroy(requestId: string, approver: string): RetentionRequest {
    const req = this.requests.get(requestId);
    if (!req) throw new RetentionError('request not found');
    if (req.status !== 'pending') {
      throw new RetentionError(`cannot deny from status ${req.status}`);
    }
    req.status = 'denied';
    req.decidedBy = approver;
    return req;
  }
}
