import { RetentionError, RetentionService } from './retention.service';

const NOW = new Date('2026-05-19T00:00:00Z');

describe('RetentionService.evaluate', () => {
  const svc = new RetentionService();

  it('keep when within retention window', () => {
    expect(
      svc.evaluate(
        { state: 'active', expiresAt: null },
        NOW,
      ),
    ).toEqual({ action: 'keep', reason: 'within retention window' });
  });

  it('flag-expired when expiresAt <= now and not archived', () => {
    expect(
      svc.evaluate(
        { state: 'active', expiresAt: new Date('2025-01-01') },
        NOW,
      ).action,
    ).toBe('flag-expired');
  });

  it('eligible-for-destruction when retention policy elapsed', () => {
    expect(
      svc.evaluate(
        {
          state: 'archived',
          expiresAt: null,
          retentionPolicyEndsAt: new Date('2024-01-01'),
        },
        NOW,
      ).action,
    ).toBe('eligible-for-destruction');
  });
});

describe('RetentionService.requestDestroy + approval', () => {
  it('rejects empty inputs', () => {
    const svc = new RetentionService();
    expect(() => svc.requestDestroy('', 'u1', 'r')).toThrow(RetentionError);
    expect(() => svc.requestDestroy('d', '', 'r')).toThrow(RetentionError);
    expect(() => svc.requestDestroy('d', 'u', '   ')).toThrow(RetentionError);
  });

  it('approver must differ from requestor (separation of duties)', () => {
    const svc = new RetentionService();
    const req = svc.requestDestroy('d1', 'alice', 'over retention');
    expect(req.status).toBe('pending');
    expect(() => svc.approveDestroy(req.id, 'alice')).toThrow(RetentionError);
    const approved = svc.approveDestroy(req.id, 'bob');
    expect(approved.status).toBe('approved');
    expect(approved.decidedBy).toBe('bob');
    expect(() => svc.approveDestroy(req.id, 'bob')).toThrow(RetentionError);
  });

  it('deny path leaves status=denied and blocks subsequent approve', () => {
    const svc = new RetentionService();
    const req = svc.requestDestroy('d1', 'alice', 'over retention');
    svc.denyDestroy(req.id, 'bob');
    expect(req.status).toBe('denied');
    expect(() => svc.approveDestroy(req.id, 'bob')).toThrow(RetentionError);
  });
});
